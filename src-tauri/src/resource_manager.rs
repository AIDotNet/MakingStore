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
        
        self.app_handle
            .path()
            .resolve(&exe_path, BaseDirectory::Resource)
            .map_err(|e| format!("Failed to resolve executable path: {}", e))
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

    /// 执行外部可执行文件
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

/// Tauri 命令：获取可执行文件路径
#[tauri::command]
pub async fn get_executable_path(
    app_handle: AppHandle,
    exe_name: String,
) -> Result<String, String> {
    let resource_manager = ResourceManager::new(app_handle);
    let path = resource_manager.get_executable_path(&exe_name)?;
    Ok(path.to_string_lossy().to_string())
}

/// Tauri 命令：检查可执行文件是否存在
#[tauri::command]
pub async fn check_executable_exists(
    app_handle: AppHandle,
    exe_name: String,
) -> Result<bool, String> {
    let resource_manager = ResourceManager::new(app_handle);
    Ok(resource_manager.executable_exists(&exe_name))
}

/// Tauri 命令：执行外部工具
#[tauri::command]
pub async fn execute_external_tool(
    app_handle: AppHandle,
    exe_name: String,
    args: Vec<String>,
) -> Result<String, String> {
    let resource_manager = ResourceManager::new(app_handle);
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    
    let output = resource_manager.execute_external_tool(&exe_name, args_refs).await?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}