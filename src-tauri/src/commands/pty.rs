use std::sync::OnceLock;
use tauri::AppHandle;

use crate::pty::manager::PtyManager;

static PTY_MANAGER: OnceLock<PtyManager> = OnceLock::new();

fn get_manager() -> &'static PtyManager {
    PTY_MANAGER.get_or_init(PtyManager::new)
}

/// Spawn a new PTY terminal session.
///
/// Returns the session ID assigned.
#[tauri::command]
pub async fn pty_spawn(
    app: AppHandle,
    id: String,
    shell: Option<String>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<(), String> {
    let shell = shell.unwrap_or_else(|| {
        std::env::var("SHELL").unwrap_or_else(|_| {
            if cfg!(target_os = "windows") {
                "powershell.exe".to_string()
            } else {
                "/bin/sh".to_string()
            }
        })
    });
    let cwd = cwd.unwrap_or_else(|| {
        std::env::current_dir()
            .map(|p| p.display().to_string())
            .unwrap_or_else(|_| "/".to_string())
    });
    let cols = cols.unwrap_or(80);
    let rows = rows.unwrap_or(24);
    get_manager().spawn(id, shell, cwd, cols, rows, app)
}

/// Write user input to a PTY session.
#[tauri::command]
pub async fn pty_write(id: String, data: Vec<u8>) -> Result<(), String> {
    get_manager().write(&id, &data)
}

/// Resize a PTY session.
#[tauri::command]
pub async fn pty_resize(id: String, cols: u16, rows: u16) -> Result<(), String> {
    get_manager().resize(&id, cols, rows)
}

/// Kill a PTY session.
#[tauri::command]
pub async fn pty_kill(id: String) -> Result<(), String> {
    get_manager().kill(&id)
}
