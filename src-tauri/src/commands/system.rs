use crate::models::{CommandResult, SystemInfo};

#[tauri::command]
pub async fn open_in_browser(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}

#[tauri::command]
pub async fn run_command(command: String, cwd: Option<String>) -> CommandResult {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = std::process::Command::new("cmd");
        c.args(["/C", &command]);
        c
    } else {
        let mut c = std::process::Command::new("sh");
        c.args(["-c", &command]);
        c
    };

    if let Some(dir) = &cwd {
        cmd.current_dir(dir);
    }

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            CommandResult {
                exit_code: output.status.code().unwrap_or(-1),
                stdout,
                stderr,
            }
        }
        Err(e) => CommandResult {
            exit_code: -1,
            stdout: String::new(),
            stderr: format!("Failed to execute command: {}", e),
        },
    }
}

#[tauri::command]
pub async fn get_system_info() -> SystemInfo {
    SystemInfo {
        platform: std::env::consts::OS.to_string(),
        locale: sys_locale::get_locale().unwrap_or_else(|| "en-US".to_string()),
    }
}
