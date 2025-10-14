use std::process::Command;
use tauri_plugin_dialog::DialogExt;

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

#[tauri::command]
async fn open_project_in_terminal(path: String, launch_mode: Option<String>) -> Result<String, String> {
    // 确定启动命令
    let codex_command = match launch_mode.as_deref() {
        Some("bypass") => "codex --dangerously-bypass-approvals-and-sandbox",
        Some("normal") | None => "codex",
        _ => "codex", // 默认使用普通模式
    };
    
    // 根据操作系统打开终端并在项目目录中执行codex
    let result = if cfg!(target_os = "windows") {
        // Windows: 打开PowerShell并执行命令
        Command::new("powershell")
            .args(&["-Command", &format!("Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location \"{}\"; {}'", path, codex_command)])
            .spawn()
            .map_err(|e| format!("Failed to open terminal on Windows: {}", e))?;
        format!("Successfully opened terminal and executed {} on Windows", codex_command)
    } else if cfg!(target_os = "macos") {
        // macOS: 使用Terminal.app
        Command::new("osascript")
            .args(&[
                "-e",
                &format!("tell application \"Terminal\" to do script \"cd '{}' && {}\"", path, codex_command)
            ])
            .spawn()
            .map_err(|e| format!("Failed to open terminal on macOS: {}", e))?;
        format!("Successfully opened terminal and executed {} on macOS", codex_command)
    } else {
        // Linux: 尝试使用常见的终端模拟器
        let terminals = ["gnome-terminal", "konsole", "xterm", "x-terminal-emulator"];
        let mut success = false;
        
        for terminal in &terminals {
            let result = if *terminal == "gnome-terminal" {
                Command::new(terminal)
                    .args(&["--", "bash", "-c", &format!("cd '{}' && {}; exec bash", path, codex_command)])
                    .spawn()
            } else if *terminal == "konsole" {
                Command::new(terminal)
                    .args(&["-e", "bash", "-c", &format!("cd '{}' && {}; exec bash", path, codex_command)])
                    .spawn()
            } else {
                Command::new(terminal)
                    .args(&["-e", "bash", "-c", &format!("cd '{}' && {}; exec bash", path, codex_command)])
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            select_folder,
            open_folder_in_codex,
            execute_command,
            open_project_in_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
