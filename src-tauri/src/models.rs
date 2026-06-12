use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileReadResult {
    pub content: String,
    pub encoding: String,
    pub detected_by_bom: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncodingInfo {
    pub name: String,
    pub label: String,
    pub group: String,
    pub has_bom: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMatch {
    pub path: String,
    pub line_number: u32,
    pub line_content: String,
    pub match_start: u32,
    pub match_length: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindInFilesParams {
    pub root_dir: String,
    pub query: String,
    pub is_regex: bool,
    pub case_sensitive: bool,
    pub whole_word: bool,
    pub file_pattern: Option<String>,
    pub max_results: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub open_tabs: Vec<SessionTab>,
    pub active_tab_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionTab {
    pub path: String,
    pub encoding: String,
    pub language: String,
}

#[allow(dead_code)] // reserved for future macro persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroAction {
    pub action_type: String,
    pub payload: serde_json::Value,
}

#[allow(dead_code)] // reserved for future macro persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroEntry {
    pub name: String,
    pub actions: Vec<MacroAction>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub platform: String,
    pub locale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvertEncodingRequest {
    pub content: Vec<u8>,
    pub from_encoding: String,
    pub to_encoding: String,
}
