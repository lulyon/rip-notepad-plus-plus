use crate::models::{CommandResult, SystemInfo};

#[tauri::command]
pub async fn open_in_browser(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}

#[tauri::command]
pub async fn open_terminal(cwd: String, command: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // Prefer iTerm2 if installed, otherwise fall back to Terminal.app
        let has_iterm = std::process::Command::new("sh")
            .args(["-c", "ls /Applications/iTerm.app >/dev/null 2>&1 || mdfind 'kMDItemKind == \"Application\" && kMDItemFSName == \"iTerm.app\"' | head -1 | grep -q iTerm"])
            .status()
            .map(|s| s.success())
            .unwrap_or(false);

        if has_iterm {
            let escaped_cwd = cwd.replace('\\', "\\\\").replace('"', "\\\"");
            let escaped_cmd = command.replace('\\', "\\\\").replace('"', "\\\"");
            let full_cmd = if command.is_empty() {
                format!("cd \"{}\"", escaped_cwd)
            } else {
                format!("cd \"{}\" && {}", escaped_cwd, escaped_cmd)
            };
            let script = format!(
                "tell application \"iTerm\"\n\
                 \x20   activate\n\
                 \x20   if (count of windows) = 0 then\n\
                 \x20       create window with default profile\n\
                 \x20   end if\n\
                 \x20   tell current window\n\
                 \x20       create tab with default profile\n\
                 \x20       tell current session\n\
                 \x20           write text \"{}\"\n\
                 \x20       end tell\n\
                 \x20   end tell\n\
                 \x20end tell",
                full_cmd.replace('"', "\\\"")
            );
            std::process::Command::new("osascript")
                .args(["-e", &script])
                .spawn()
                .map_err(|e| format!("Failed to open iTerm2: {}", e))?;
        } else {
            let script = format!(
                "tell application \"Terminal\"\n    activate\n    do script \"cd '{}' && {}\"\nend tell",
                cwd.replace('\'', "'\\''"),
                command.replace('"', "\\\"")
            );
            std::process::Command::new("osascript")
                .args(["-e", &script])
                .spawn()
                .map_err(|e| format!("Failed to open terminal: {}", e))?;
        }
    }
    #[cfg(target_os = "linux")]
    {
        let script = format!("cd '{}' && {}; exec $SHELL",
            cwd.replace('\'', "'\\''"),
            command);
        std::process::Command::new("sh")
            .args(["-c", &format!("gnome-terminal -- bash -c {:?} 2>/dev/null || x-terminal-emulator -e bash -c {:?} 2>/dev/null || xterm -e bash -c {:?}", script, script, script)])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "cmd", "/k", &format!("cd /d \"{}\" && {}", cwd, command)])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }
    Ok(())
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
