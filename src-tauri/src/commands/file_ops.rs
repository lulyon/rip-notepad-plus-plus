use crate::models::{DirEntry, FileReadResult};

const LARGE_FILE_THRESHOLD: u64 = 50 * 1024 * 1024; // 50MB

/// Basic path validation: reject paths with obvious traversal attempts
fn validate_path(path: &str) -> Result<(), String> {
    if path.contains("..") {
        return Err(format!("Path traversal not allowed: {}", path));
    }
    // Reject empty paths
    if path.trim().is_empty() {
        return Err("Empty path not allowed".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn read_file(path: String, encoding_override: Option<String>) -> Result<FileReadResult, String> {
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to read file metadata '{}': {}", path, e))?;

    if metadata.len() > LARGE_FILE_THRESHOLD {
        return Err(format!(
            "File is too large: {} MB. Maximum supported size is 50 MB. Consider using a different editor for large files.",
            metadata.len() / (1024 * 1024)
        ));
    }

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
    validate_path(&path)?;
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
    validate_path(&path)?;
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

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let entries = std::fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;

    let mut result: Vec<DirEntry> = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path_buf = entry.path();
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to get metadata: {}", e))?;

        let is_dir = metadata.is_dir();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files (starting with .)
        if name.starts_with('.') {
            continue;
        }

        let ext = if !is_dir {
            path_buf.extension().map(|e| e.to_string_lossy().to_string())
        } else {
            None
        };

        result.push(DirEntry {
            name,
            path: path_buf.to_string_lossy().to_string(),
            is_dir,
            size: metadata.len(),
            extension: ext,
        });
    }

    // Sort: directories first, then files, both alphabetically
    result.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir) // directories first
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(result)
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create directory '{}': {}", path, e))
}

#[tauri::command]
pub async fn delete_directory(path: String) -> Result<(), String> {
    validate_path(&path)?;
    std::fs::remove_dir_all(&path)
        .map_err(|e| format!("Failed to delete directory '{}': {}", path, e))
}
