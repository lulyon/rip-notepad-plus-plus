use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::SystemTime;
use notify::{Event, EventKind, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, Manager};

/// Stores file monitoring state: last modified timestamps and watcher handles
pub struct MonitorState {
    pub last_modified: HashMap<String, SystemTime>,
    pub snapshot_dir: Option<PathBuf>,
}

impl MonitorState {
    pub fn new() -> Self {
        Self {
            last_modified: HashMap::new(),
            snapshot_dir: None,
        }
    }
}

/// Start watching a file for external changes.
/// Emits "file-externally-changed" event when the file is modified outside the editor.
#[tauri::command]
pub async fn watch_file(
    app: AppHandle,
    path: String,
) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Store current modification time
    if let Ok(meta) = std::fs::metadata(&p) {
        if let Ok(mtime) = meta.modified() {
            let state = app.state::<Mutex<MonitorState>>();
            state.lock().map_err(|e| e.to_string())?
                .last_modified.insert(path.clone(), mtime);
        }
    }

    let app_clone = app.clone();
    let path_clone = path.clone();

    // Use notify to watch the file's parent directory
    let parent = p.parent().unwrap_or(&p);
    let file_name = p.file_name().ok_or("Invalid path")?.to_string_lossy().to_string();

    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        if let Ok(event) = res {
            match event.kind {
                EventKind::Modify(_) => {
                    // Check if our watched file was modified
                    for ev_path in &event.paths {
                        if ev_path.file_name().map(|n| n.to_string_lossy().to_string()) == Some(file_name.clone()) {
                            // Emit event to frontend
                            let _ = app_clone.emit("file-externally-changed", path_clone.clone());
                        }
                    }
                }
                EventKind::Remove(_) => {
                    for ev_path in &event.paths {
                        if ev_path.file_name().map(|n| n.to_string_lossy().to_string()) == Some(file_name.clone()) {
                            let _ = app_clone.emit("file-externally-deleted", path_clone.clone());
                        }
                    }
                }
                _ => {}
            }
        }
    }).map_err(|e| e.to_string())?;

    watcher.watch(parent, RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;

    // Store watcher (keeps it alive)
    // Note: notify v6 watcher is kept alive by the closure; we just need to hold a reference
    Box::leak(Box::new(watcher));

    Ok(())
}

/// Check if a file was modified since last known timestamp.
/// Returns true if externally modified, false otherwise.
#[tauri::command]
pub async fn check_file_changed(
    app: AppHandle,
    path: String,
) -> Result<bool, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Ok(false);
    }

    let meta = std::fs::metadata(&p).map_err(|e| e.to_string())?;
    let current_mtime = meta.modified().map_err(|e| e.to_string())?;

    let state = app.state::<Mutex<MonitorState>>();
    let mut state_lock = state.lock().map_err(|e| e.to_string())?;

    if let Some(last) = state_lock.last_modified.get(&path) {
        if current_mtime > *last {
            state_lock.last_modified.insert(path, current_mtime);
            return Ok(true);
        }
    }

    // Update stored timestamp
    state_lock.last_modified.insert(path, current_mtime);
    Ok(false)
}

/// Update the stored modification time for a file (called after save).
#[tauri::command]
pub async fn update_file_mtime(
    app: AppHandle,
    path: String,
) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if let Ok(meta) = std::fs::metadata(&p) {
        if let Ok(mtime) = meta.modified() {
            let state = app.state::<Mutex<MonitorState>>();
            state.lock().map_err(|e| e.to_string())?
                .last_modified.insert(path, mtime);
        }
    }
    Ok(())
}

/// ── Document Snapshots ──

/// Save a backup snapshot of a dirty tab to disk for crash recovery.
/// Stored in <snapshot_dir>/<encoded_filename>_<tab_id>
#[tauri::command]
pub async fn save_snapshot(
    app: AppHandle,
    tab_id: String,
    file_path: Option<String>,
    content: String,
) -> Result<(), String> {
    let state = app.state::<Mutex<MonitorState>>();
    let state_lock = state.lock().map_err(|e| e.to_string())?;

    let dir = match &state_lock.snapshot_dir {
        Some(d) => d.clone(),
        None => {
            drop(state_lock);
            // Create snapshot directory in app data
            let mut dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            dir.push("snapshots");
            std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
            let mut state_lock = state.lock().map_err(|e| e.to_string())?;
            state_lock.snapshot_dir = Some(dir.clone());
            dir
        }
    };

    // Generate snapshot filename
    let safe_name = if let Some(p) = &file_path {
        p.replace(['/', '\\', ':', '?', '*', '"', '<', '>', '|'], "_")
    } else {
        format!("untitled_{}", tab_id)
    };

    let snapshot_path = dir.join(format!("{}_{}.snap", safe_name, tab_id));
    std::fs::write(&snapshot_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

/// Load a backup snapshot if one exists (crash recovery).
#[tauri::command]
pub async fn load_snapshots(
    app: AppHandle,
) -> Result<Vec<(String, Option<String>, String)>, String> {
    let mut dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    dir.push("snapshots");

    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut results = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "snap") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if !content.is_empty() {
                        // Parse filename: <safe_name>_<tab_id>.snap
                        let stem = path.file_stem().unwrap_or_default().to_string_lossy();
                        results.push((stem.to_string(), None, content));
                        // Delete the snapshot after loading
                        let _ = std::fs::remove_file(&path);
                    }
                }
            }
        }
    }

    Ok(results)
}

/// Clear all snapshots for a tab (called when file is saved).
#[tauri::command]
pub async fn clear_snapshot(
    app: AppHandle,
    tab_id: String,
) -> Result<(), String> {
    let mut dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    dir.push("snapshots");

    if !dir.exists() {
        return Ok(());
    }

    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(stem) = path.file_stem() {
                if stem.to_string_lossy().ends_with(&format!("_{}", tab_id)) {
                    let _ = std::fs::remove_file(&path);
                }
            }
        }
    }

    Ok(())
}
