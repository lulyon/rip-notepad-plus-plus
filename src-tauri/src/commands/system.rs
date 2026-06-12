use crate::models::SystemInfo;

#[tauri::command]
pub async fn open_in_browser(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}

#[tauri::command]
pub async fn get_system_info() -> SystemInfo {
    SystemInfo {
        platform: std::env::consts::OS.to_string(),
        locale: sys_locale::get_locale().unwrap_or_else(|| "en-US".to_string()),
    }
}
