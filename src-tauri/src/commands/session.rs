use crate::models::SessionData;

fn session_path() -> Result<std::path::PathBuf, String> {
    let dir = dirs::data_dir().ok_or("Cannot determine data directory")?;
    let app_dir = dir.join("ripnotepad-plus-plus");
    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create config dir: {}", e))?;
    Ok(app_dir.join("session.json"))
}

#[tauri::command]
pub async fn save_session(session: SessionData) -> Result<(), String> {
    let path = session_path()?;
    let json = serde_json::to_string_pretty(&session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;
    std::fs::write(&path, json)
        .map_err(|e| format!("Failed to write session: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn load_session() -> Result<Option<SessionData>, String> {
    let path = session_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let json = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read session: {}", e))?;
    let session: SessionData = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse session: {}", e))?;
    Ok(Some(session))
}

#[tauri::command]
pub async fn clear_session() -> Result<(), String> {
    let path = session_path()?;
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Failed to clear session: {}", e))?;
    }
    Ok(())
}

