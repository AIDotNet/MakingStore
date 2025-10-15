use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use std::sync::Mutex;
use tauri::{Manager, Emitter};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tauri_plugin_dialog::DialogExt;

mod resource_manager;
use resource_manager::{get_executable_path, check_executable_exists, execute_external_tool};

#[derive(Default)]
struct McpState {
    pid: Mutex<Option<u32>>, // 跟踪子进程PID以便停止
}

#[derive(serde::Serialize, Clone)]
struct LogPayload {
    level: &'static str,
    message: String,
}

#[derive(serde::Serialize, Clone)]
struct ExitPayload {
    code: Option<i32>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn select_folder(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use std::sync::mpsc;
    let (tx, rx) = mpsc::channel();

    app_handle
        .dialog()
        .file()
        .set_title("选择项目文件夹")
        .pick_folder(move |folder_path| {
            tx.send(folder_path).unwrap();
        });

    let folder_path = rx
        .recv()
        .map_err(|e| format!("Failed to receive folder path: {}", e))?;

    match folder_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn open_folder_in_codex(path: String) -> Result<String, String> {
    // 使用 Codex 打开项目文件夹
    let mut cmd = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.args(&["/C", "codex", &path]);
        cmd
    } else {
        let mut cmd = Command::new("codex");
        cmd.arg(&path);
        cmd
    };

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to open folder in Codex: {}", e))?;

    if output.status.success() {
        Ok("Successfully opened folder in Codex".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn execute_command(command: String, args: Vec<String>) -> Result<String, String> {
    // 在Windows上使用cmd.exe来执行命令，确保能找到PATH中的程序
    let mut cmd = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.args(&["/C", &command]);
        cmd.args(&args);
        cmd
    } else {
        let mut cmd = Command::new(&command);
        cmd.args(&args);
        cmd
    };

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// 托管启动 MakingMcp.Web.exe，隐藏窗口并流式输出日志到前端
#[tauri::command]
async fn start_mcp_service(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, McpState>,
    env: Option<std::collections::HashMap<String, String>>,
) -> Result<String, String> {
    // 防止重复启动
    {
        let pid_guard = state.pid.lock().map_err(|_| "Failed to lock state".to_string())?;
        if pid_guard.is_some() {
            return Err("MCP 服务已在运行".to_string());
        }
    }

    // 解析可执行文件路径
    let exe_name = "MakingMcp.Web.exe".to_string();
    let exe_path = get_executable_path(app_handle.clone(), exe_name)
        .await
        .map_err(|e| format!("获取可执行文件路径失败: {}", e))?;

    // 构建命令：隐藏窗口并捕获 stdout/stderr
    let mut cmd = Command::new(&exe_path);
    cmd.stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());

    // 注入环境变量（如果提供）
    if let Some(env_map) = env {
        for (k, v) in env_map {
            // 过滤空值，避免设置为空字符串的变量
            if !v.trim().is_empty() {
                cmd.env(k, v);
            }
        }
    }

    // Windows 下确保不显示控制台窗口
    #[cfg(target_os = "windows")]
    {
        // CREATE_NO_WINDOW = 0x08000000
        cmd.creation_flags(0x08000000);
    }

    let mut child = cmd.spawn().map_err(|e| format!("启动进程失败: {}", e))?;

    // 保存 PID 到状态
    {
        let mut pid_guard = state.pid.lock().map_err(|_| "Failed to lock state".to_string())?;
        *pid_guard = Some(child.id());
    }

    // 处理 stdout 流
    if let Some(stdout) = child.stdout.take() {
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(text) = line {
                    let _ = app_handle_clone.emit("mcp-log", LogPayload { level: "info", message: text });
                }
            }
        });
    }

    // 处理 stderr 流
    if let Some(stderr) = child.stderr.take() {
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(text) = line {
                    let _ = app_handle_clone.emit("mcp-log", LogPayload { level: "error", message: text });
                }
            }
        });
    }

    // 监听进程退出并通知前端
    {
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            match child.wait() {
                Ok(status) => {
                    // 清除 PID（在线程中重新获取 State，避免生命周期问题）
                    let state_ref = app_handle_clone.state::<McpState>();
                    if let Ok(mut pid_guard) = state_ref.pid.lock() {
                        *pid_guard = None;
                    }
                    let _ = app_handle_clone.emit("mcp-exit", ExitPayload { code: status.code() });
                }
                Err(_) => {
                    let state_ref = app_handle_clone.state::<McpState>();
                    if let Ok(mut pid_guard) = state_ref.pid.lock() {
                        *pid_guard = None;
                    }
                    let _ = app_handle_clone.emit("mcp-exit", ExitPayload { code: None });
                }
            }
        });
    }

    Ok("MCP 服务已启动并托管 (隐藏控制台)".to_string())
}

/// 停止托管的 MCP 服务
#[tauri::command]
async fn stop_mcp_service(state: tauri::State<'_, McpState>) -> Result<String, String> {
    // 读取 PID
    let pid_opt = {
        let pid_guard = state.pid.lock().map_err(|_| "Failed to lock state".to_string())?;
        *pid_guard
    };

    if let Some(pid) = pid_opt {
        // Windows 使用 taskkill；其他平台使用 kill
        #[cfg(target_os = "windows")]
        {
            let output = Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .output()
                .map_err(|e| format!("停止进程失败: {}", e))?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let output = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output()
                .map_err(|e| format!("停止进程失败: {}", e))?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
        }

        // 清除 PID
        let mut pid_guard = state.pid.lock().map_err(|_| "Failed to lock state".to_string())?;
        *pid_guard = None;
        Ok("MCP 服务已停止".to_string())
    } else {
        Err("MCP 服务未运行".to_string())
    }
}

#[tauri::command(rename_all = "camelCase")]
async fn open_project_in_terminal(
    path: String, 
    launch_mode: Option<String>, 
    environment_variables: Option<String>
) -> Result<String, String> {
    // 确定启动命令
    let codex_command = match launch_mode.as_deref() {
        Some("bypass") => "codex --dangerously-bypass-approvals-and-sandbox",
        Some("normal") | None => "codex",
        _ => "codex", // 默认使用普通模式
    };
    
    // 解析环境变量
    let env_vars = if let Some(env_str) = environment_variables {
        let parsed_vars = parse_environment_variables(&env_str);
        parsed_vars
    } else {
        Vec::new()
    };
    
    // 构建环境变量设置命令
    let env_commands = if !env_vars.is_empty() {
        env_vars.iter()
            .map(|(key, value)| format!("$env:{}='{}'", key, value))
            .collect::<Vec<_>>()
            .join("; ")
    } else {
        String::new()
    };

    // 根据操作系统打开终端并在项目目录中执行codex
    let result = if cfg!(target_os = "windows") {
        // Windows: 打开新的PowerShell窗口并执行命令
        let full_command = if !env_commands.is_empty() {
            format!("Set-Location '{}'; {}; {}", path, env_commands, codex_command)
        } else {
            format!("Set-Location '{}'; {}", path, codex_command)
        };
        
        // 使用Start-Process打开新的PowerShell窗口
        let start_process_command = format!(
            "Start-Process powershell -ArgumentList '-NoExit', '-Command', '{}' -WindowStyle Normal",
            full_command.replace("'", "''")  // 转义单引号
        );
        
        Command::new("powershell")
            .args(&["-Command", &start_process_command])
            .spawn()
            .map_err(|e| format!("Failed to open terminal on Windows: {}", e))?;
        format!("Successfully opened terminal and executed {} on Windows", codex_command)
    } else if cfg!(target_os = "macos") {
        // macOS: 使用Terminal.app
        let full_command = if !env_vars.is_empty() {
            let env_exports = env_vars.iter()
                .map(|(key, value)| format!("export {}=\"{}\"", key, value))
                .collect::<Vec<_>>()
                .join(" && ");
            format!("cd '{}' && {} && {}", path, env_exports, codex_command)
        } else {
            format!("cd '{}' && {}", path, codex_command)
        };
        
        Command::new("osascript")
            .args(&[
                "-e",
                &format!("tell application \"Terminal\" to do script \"{}\"", full_command)
            ])
            .spawn()
            .map_err(|e| format!("Failed to open terminal on macOS: {}", e))?;
        format!("Successfully opened terminal and executed {} on macOS", codex_command)
    } else {
        // Linux: 尝试使用常见的终端模拟器
        let full_command = if !env_vars.is_empty() {
            let env_exports = env_vars.iter()
                .map(|(key, value)| format!("export {}=\"{}\"", key, value))
                .collect::<Vec<_>>()
                .join(" && ");
            format!("cd '{}' && {} && {}; exec bash", path, env_exports, codex_command)
        } else {
            format!("cd '{}' && {}; exec bash", path, codex_command)
        };
        
        let terminals = ["gnome-terminal", "konsole", "xterm", "x-terminal-emulator"];
        let mut success = false;
        
        for terminal in &terminals {
            let result = if *terminal == "gnome-terminal" {
                Command::new(terminal)
                    .args(&["--", "bash", "-c", &full_command])
                    .spawn()
            } else if *terminal == "konsole" {
                Command::new(terminal)
                    .args(&["-e", "bash", "-c", &full_command])
                    .spawn()
            } else {
                Command::new(terminal)
                    .args(&["-e", "bash", "-c", &full_command])
                    .spawn()
            };
            
            if result.is_ok() {
                success = true;
                break;
            }
        }
        
        if success {
            format!("Successfully opened terminal and executed {} on Linux", codex_command)
        } else {
            return Err("Failed to find a suitable terminal emulator on Linux".to_string());
        }
    };

    Ok(result)
}

// 解析环境变量字符串
fn parse_environment_variables(env_str: &str) -> Vec<(String, String)> {
    env_str
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                return None;
            }
            
            if let Some(eq_pos) = line.find('=') {
                let key = line[..eq_pos].trim().to_string();
                let value = line[eq_pos + 1..].trim().to_string();
                if !key.is_empty() {
                    Some((key, value))
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(McpState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            select_folder,
            open_folder_in_codex,
            execute_command,
            start_mcp_service,
            stop_mcp_service,
            open_project_in_terminal,
            get_executable_path,
            check_executable_exists,
            execute_external_tool
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
