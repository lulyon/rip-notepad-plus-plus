use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceTab {
    pub path: String,
    pub language: String,
    pub encoding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceData {
    pub version: u32,
    pub name: String,
    pub roots: Vec<String>,
    pub active_root: Option<String>,
    pub open_tabs: Vec<WorkspaceTab>,
    pub active_tab_path: Option<String>,
    pub split_view: String,
    pub sidebar_tab: String,
    pub created_at: String,
}

impl Default for WorkspaceData {
    fn default() -> Self {
        Self {
            version: 1,
            name: "Untitled Workspace".into(),
            roots: vec![],
            active_root: None,
            open_tabs: vec![],
            active_tab_path: None,
            split_view: "none".into(),
            sidebar_tab: "files".into(),
            created_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub path: String,
    pub name: String,
    pub roots: Vec<String>,
    pub last_opened: String,
}

#[tauri::command]
pub async fn save_workspace(path: String, data: WorkspaceData) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write workspace: {}", e))?;
    // Update recent workspaces list
    add_recent_workspace(&path, &data.name);
    Ok(())
}

#[tauri::command]
pub async fn load_workspace(path: String) -> Result<WorkspaceData, String> {
    let json = std::fs::read_to_string(&path).map_err(|e| format!("Failed to read workspace: {}", e))?;
    let data: WorkspaceData = serde_json::from_str(&json).map_err(|e| format!("Invalid workspace: {}", e))?;
    // Update recent list
    add_recent_workspace(&path, &data.name);
    Ok(data)
}

#[tauri::command]
pub async fn list_recent_workspaces() -> Result<Vec<WorkspaceInfo>, String> {
    let list = get_recent_workspaces_list();
    let mut result = Vec::new();
    for entry in list {
        if let Ok(json) = std::fs::read_to_string(&entry.path) {
            if let Ok(data) = serde_json::from_str::<WorkspaceData>(&json) {
                result.push(WorkspaceInfo {
                    path: entry.path.clone(),
                    name: data.name,
                    roots: data.roots,
                    last_opened: entry.last_opened,
                });
            }
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn clear_recent_workspaces() -> Result<(), String> {
    let path = recent_workspaces_path();
    let _ = std::fs::remove_file(&path);
    Ok(())
}

// ── Recent workspaces storage ──

#[derive(Debug, Serialize, Deserialize)]
struct RecentEntry {
    path: String,
    last_opened: String,
}

fn recent_workspaces_path() -> std::path::PathBuf {
    let mut dir = dirs::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    dir.push("ripnotepad-plus-plus");
    std::fs::create_dir_all(&dir).ok();
    dir.push("recent_workspaces.json");
    dir
}

fn get_recent_workspaces_list() -> Vec<RecentEntry> {
    let path = recent_workspaces_path();
    if let Ok(json) = std::fs::read_to_string(&path) {
        serde_json::from_str(&json).unwrap_or_default()
    } else {
        vec![]
    }
}

fn add_recent_workspace(ws_path: &str, _name: &str) {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut list = get_recent_workspaces_list();
    // Remove existing entry
    list.retain(|e| e.path != ws_path);
    // Add to front
    list.insert(0, RecentEntry { path: ws_path.to_string(), last_opened: now });
    // Keep max 10
    list.truncate(10);
    // Save
    let json = serde_json::to_string(&list).unwrap_or_default();
    std::fs::write(recent_workspaces_path(), json).ok();
}
