use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub content: String,
    pub encoding: String,
    pub modified: bool,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! ripNotepad++ is ready.", name)
}

#[tauri::command]
fn detect_encoding(data: Vec<u8>) -> String {
    // Use encoding_rs to detect encoding via BOM, default to UTF-8
    if let Some((encoding, _)) = encoding_rs::Encoding::for_bom(&data) {
        return encoding.name().to_string();
    }

    // Try to decode as UTF-8, fall back to other encodings
    match std::str::from_utf8(&data) {
        Ok(_) => "UTF-8".to_string(),
        Err(_) => "UTF-8".to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, detect_encoding])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
