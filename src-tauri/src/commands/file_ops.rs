use crate::models::FileReadResult;

#[tauri::command]
pub async fn read_file(path: String, encoding_override: Option<String>) -> Result<FileReadResult, String> {
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("Failed to read file '{}': {}", path, e))?;

    let (detected_enc, detected_by_bom) = crate::encoding::detect::detect_encoding(&bytes);
    let encoding_name = encoding_override.unwrap_or(detected_enc);

    let content = crate::encoding::convert::decode_bytes(&bytes, &encoding_name)
        .map_err(|e| format!("Failed to decode file with encoding '{}': {}", encoding_name, e))?;

    Ok(FileReadResult {
        content,
        encoding: encoding_name,
        detected_by_bom,
    })
}

#[tauri::command]
pub async fn write_file(path: String, content: String, encoding: String) -> Result<(), String> {
    let bytes = crate::encoding::convert::encode_string(&content, &encoding)
        .map_err(|e| format!("Failed to encode content as '{}': {}", encoding, e))?;

    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    std::fs::write(&path, &bytes)
        .map_err(|e| format!("Failed to write file '{}': {}", path, e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(&path)
        .map_err(|e| format!("Failed to delete file '{}': {}", path, e))?;
    Ok(())
}

#[tauri::command]
pub async fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to rename '{}' to '{}': {}", old_path, new_path, e))?;
    Ok(())
}

#[tauri::command]
pub async fn file_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
pub async fn get_file_size(path: String) -> Result<u64, String> {
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    Ok(metadata.len())
}
