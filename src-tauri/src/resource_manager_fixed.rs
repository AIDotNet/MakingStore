use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

/// 资源管理器，用于处理外部可执行文件和资源
pub struct ResourceManager {
    app_handle: AppHandle,
}

impl ResourceManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// 获取指定平台的可执行文件路径
    pub fn get_executable_path(&self, exe_name: &str) -> Result<PathBuf, String> {
        let platform_dir = self.get_platform_dir();
        let exe_path = format!("bin/{}/{}", platform_dir, exe_name);
        
        // 首先尝试标准的资源路径解析
        match self.app_handle
            .path()
            .resolve(&exe_path, BaseDirectory::Resource) {
            Ok(path) => {
                if path.exists() {
                    return Ok(path);
                }
                
                // 如果标准路径不存在，尝试开发模式的路径修正
                if let Some(corrected_path) = self.try_dev_mode_path_correction(&path) {
                    if corrected_path.exists() {
                        return Ok(corrected_path);
                    }
                }
                
                // 返回原始路径，即使不存在
                Ok(path)
            }
            Err(e) => Err(format!("Failed to resolve executable path: {}", e))
        }
    }

    /// 尝试修正开发模式下的路径问题
    fn try_dev_mode_path_correction(&self, original_path: &PathBuf) -> Option<PathBuf> {
        let path_str = original_path.to_string_lossy();
        
        // 检查是否是开发模式路径问题（target/debug/bin 而不是 target/debug/resources/bin）
        if path_str.contains("target") && path_str.contains("debug") && path_str.contains("bin") {
            // 尝试将 target/debug/bin 替换为 target/debug/resources/bin
            let corrected_str = path_str.replace("target\\debug\\bin", "target\\debug\\resources\\bin")
                                       .replace("target/debug/bin", "target/debug/resources/bin");
            
            if corrected_str != path_str {
                return Some(PathBuf::from(corrected_str));
            }
        }
        
        None
    }

    /// 获取资源文件路径
    pub fn get_resource_path(&self, resource_path: &str) -> Result<PathBuf, String> {
        self.app_handle
            .path()
            .resolve(resource_path, BaseDirectory::Resource)
            .map_err(|e| format!("Failed to resolve resource path: {}", e))
    }

    /// 检查可执行文件是否存在
    pub fn executable_exists(&self, exe_name: &str) -> bool {
        match self.get_executable_path(exe_name) {
            Ok(path) => path.exists(),
            Err(_) => false,
        }
    }

    /// 获取当前平台的目录名
    fn get_platform_dir(&self) -> &'static str {
        #[cfg(target_os = "windows")]
        return "windows";
        
        #[cfg(target_os = "macos")]
        return "macos";
        
        #[cfg(target_os = "linux")]
        return "linux";
        
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        return "unknown";
    }

    /// 执行外部工具
    pub async fn execute_external_tool(
        &self,
        exe_name: &str,
        args: Vec<&str>,
    ) -> Result<std::process::Output, String> {
        let exe_path = self.get_executable_path(exe_name)?;
        
        if !exe_path.exists() {
            return Err(format!("Executable not found: {}", exe_path.display()));
        }

        std::process::Command::new(&exe_path)
            .args(args)
            .output()
            .map_err(|e| format!("Failed to execute {}: {}", exe_name, e))
    }
}

// Tauri 命令函数
#[tauri::command]
pub async fn get_executable_path(
    app_handle: AppHandle,
    exe_name: String,
) -> Result<String, String> {
    let manager = ResourceManager::new(app_handle);
    manager.get_executable_path(&exe_name).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn check_executable_exists(
    app_handle: AppHandle,
    exe_name: String,
) -> Result<bool, String> {
    let manager = ResourceManager::new(app_handle);
    Ok(manager.executable_exists(&exe_name))
}

#[tauri::command]
pub async fn execute_external_tool(
    app_handle: AppHandle,
    exe_name: String,
    args: Vec<String>,
) -> Result<String, String> {
    let manager = ResourceManager::new(app_handle);
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    
    match manager.execute_external_tool(&exe_name, args_refs).await {
        Ok(output) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                Err(format!("Command failed with exit code: {:?}\nStderr: {}", 
                           output.status.code(), 
                           String::from_utf8_lossy(&output.stderr)))
            }
        }
        Err(e) => Err(e)
    }
}