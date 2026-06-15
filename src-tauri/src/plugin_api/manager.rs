use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};

use crate::plugin_api::types::{EditorState, JsonRpcRequest, JsonRpcResponse, PluginInfo, PluginManifest};

/// A running plugin process
#[allow(dead_code)] // fields reserved for future plugin API expansion
struct PluginProcess {
    manifest: PluginManifest,
    child: Child,
    plugin_dir: PathBuf,
}

impl PluginProcess {
    /// Send a JSON-RPC request and wait for response
    fn send_request(&mut self, request: &JsonRpcRequest) -> Result<JsonRpcResponse, String> {
        let stdin = self
            .child
            .stdin
            .as_mut()
            .ok_or("Plugin stdin not available")?;
        let stdout = self
            .child
            .stdout
            .as_mut()
            .ok_or("Plugin stdout not available")?;

        let request_json =
            serde_json::to_string(request).map_err(|e| format!("Failed to serialize: {}", e))?;
        writeln!(stdin, "{}", request_json)
            .map_err(|e| format!("Failed to write to plugin: {}", e))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush stdin: {}", e))?;

        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        reader
            .read_line(&mut line)
            .map_err(|e| format!("Failed to read from plugin: {}", e))?;

        if line.trim().is_empty() {
            return Err("Plugin returned empty response".to_string());
        }

        serde_json::from_str(&line)
            .map_err(|e| format!("Invalid JSON from plugin: {} — {}", e, line))
    }
}

pub struct PluginManager {
    plugin_dir: PathBuf,
    plugins: Arc<Mutex<HashMap<String, PluginProcess>>>,
    editor_state: Arc<Mutex<EditorState>>,
}

impl PluginManager {
    pub fn new() -> Self {
        // Search multiple locations for the plugins directory
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| cwd.clone());

        let candidates = vec![
            cwd.join("plugins"),           // Running from project root
            project_root.join("plugins"),  // Running from src-tauri/ (dev mode)
        ];

        let plugin_dir = candidates
            .into_iter()
            .find(|p| p.exists())
            .unwrap_or_else(|| project_root.join("plugins"));

        Self {
            plugin_dir,
            plugins: Arc::new(Mutex::new(HashMap::new())),
            editor_state: Arc::new(Mutex::new(EditorState::default())),
        }
    }

    /// Scan the plugin directory and discover available plugins
    pub fn discover(&self) -> Result<Vec<PluginInfo>, String> {
        let mut infos = Vec::new();

        if !self.plugin_dir.exists() {
            return Ok(infos);
        }

        let entries =
            std::fs::read_dir(&self.plugin_dir).map_err(|e| format!("Failed to read plugin dir: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let manifest_path = path.join("plugin.json");
            if !manifest_path.exists() {
                continue;
            }

            match PluginManifest::from_file(&manifest_path) {
                Ok(manifest) => {
                    let running = {
                        let plugins = self.plugins.lock().unwrap();
                        plugins.contains_key(&manifest.name)
                    };
                    infos.push(PluginInfo {
                        name: manifest.name.clone(),
                        version: manifest.version.clone(),
                        description: manifest.description.clone(),
                        author: manifest.author.clone(),
                        enabled: manifest.enabled,
                        running,
                    });
                }
                Err(e) => {
                    eprintln!("Warning: Failed to load plugin at {:?}: {}", path, e);
                }
            }
        }

        // Sort by name
        infos.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(infos)
    }

    /// Start a plugin by name
    pub fn start(&self, name: &str) -> Result<(), String> {
        let plugin_dir = self.plugin_dir.join(name);
        let manifest_path = plugin_dir.join("plugin.json");

        if !manifest_path.exists() {
            return Err(format!("Plugin '{}' not found at {:?}", name, plugin_dir));
        }

        let manifest = PluginManifest::from_file(&manifest_path)?;

        // Check if already running
        {
            let plugins = self.plugins.lock().unwrap();
            if plugins.contains_key(name) {
                return Err(format!("Plugin '{}' is already running", name));
            }
        }

        let main_path = plugin_dir.join(&manifest.main);
        if !main_path.exists() {
            return Err(format!(
                "Plugin main script '{}' not found for plugin '{}'",
                manifest.main, name
            ));
        }

        // Spawn the plugin process
        let child = Command::new(&manifest.runtime)
            .arg(&main_path)
            .current_dir(&plugin_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start plugin '{}': {}", name, e))?;

        let process = PluginProcess {
            manifest: manifest.clone(),
            child,
            plugin_dir: plugin_dir.clone(),
        };

        {
            let mut plugins = self.plugins.lock().unwrap();
            plugins.insert(name.to_string(), process);
        }

        println!("Plugin '{}' started (runtime: {})", name, manifest.runtime);
        Ok(())
    }

    /// Stop a running plugin
    pub fn stop(&self, name: &str) -> Result<(), String> {
        let mut plugins = self.plugins.lock().unwrap();
        if let Some(mut process) = plugins.remove(name) {
            // Send shutdown notification
            let shutdown = JsonRpcRequest {
                jsonrpc: "2.0".to_string(),
                id: None,
                method: "shutdown".to_string(),
                params: None,
            };
            if let Ok(json) = serde_json::to_string(&shutdown) {
                if let Some(stdin) = process.child.stdin.as_mut() {
                    let _ = writeln!(stdin, "{}", json);
                }
            }

            // Kill the process
            let _ = process.child.kill();
            let _ = process.child.wait();
            println!("Plugin '{}' stopped", name);
            Ok(())
        } else {
            Err(format!("Plugin '{}' is not running", name))
        }
    }

    /// Send a JSON-RPC request to a running plugin.
    /// Intercepts editor.* methods and returns cached state directly.
    pub fn send_to_plugin(
        &self,
        name: &str,
        request: &JsonRpcRequest,
    ) -> Result<JsonRpcResponse, String> {
        // Intercept editor.* methods — serve from cache
        if request.method.starts_with("editor.") {
            return match self.handle_plugin_editor_request(&request.method, request.params.clone()) {
                Ok(result) => Ok(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: request.id,
                    result: Some(result),
                    error: None,
                }),
                Err(e) => Ok(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: request.id,
                    result: None,
                    error: Some(crate::plugin_api::types::JsonRpcError {
                        code: -32603,
                        message: e,
                        data: None,
                    }),
                }),
            };
        }

        let mut plugins = self.plugins.lock().unwrap();
        if let Some(process) = plugins.get_mut(name) {
            process.send_request(request)
        } else {
            Err(format!("Plugin '{}' is not running", name))
        }
    }

    /// Update cached editor state (called by frontend on editor changes)
    pub fn update_state(&self, state: EditorState) {
        let mut cached = self.editor_state.lock().unwrap();
        *cached = state;
    }

    /// Send a JSON-RPC notification to all running plugins
    pub fn notify_all(&self, method: &str, params: Option<serde_json::Value>) {
        let notification = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        });
        let notification_str = notification.to_string();

        let mut plugins = self.plugins.lock().unwrap();
        let mut dead_plugins = Vec::new();

        for (name, process) in plugins.iter_mut() {
            if let Some(stdin) = process.child.stdin.as_mut() {
                if writeln!(stdin, "{}", notification_str).is_err() {
                    dead_plugins.push(name.clone());
                } else {
                    let _ = stdin.flush();
                }
            }
        }

        for name in dead_plugins {
            if let Some(mut proc) = plugins.remove(&name) {
                let _ = proc.child.wait(); // Reap zombie
            }
        }
    }

    /// Handle editor.* requests from plugins, returning cached state
    pub fn handle_plugin_editor_request(
        &self,
        method: &str,
        _params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, String> {
        let state = self.editor_state.lock().unwrap();

        match method {
            "editor.getActiveFile" => {
                Ok(serde_json::json!({
                    "path": state.active_file_path,
                    "name": state.active_file_name,
                    "content": state.active_file_content,
                    "language": state.active_file_language,
                    "encoding": state.active_file_encoding,
                    "cursorLine": state.cursor_line,
                    "cursorColumn": state.cursor_column,
                    "tabCount": state.tab_count,
                }))
            }
            "editor.getContent" => {
                Ok(serde_json::json!({
                    "content": state.active_file_content,
                }))
            }
            "editor.getSelection" => {
                // Selection info is limited without Monaco integration
                Ok(serde_json::json!({
                    "cursorLine": state.cursor_line,
                    "cursorColumn": state.cursor_column,
                }))
            }
            "editor.getLanguage" => {
                Ok(serde_json::json!(state.active_file_language))
            }
            "editor.getEncoding" => {
                Ok(serde_json::json!(state.active_file_encoding))
            }
            "editor.getCursor" => {
                Ok(serde_json::json!({
                    "line": state.cursor_line,
                    "column": state.cursor_column,
                }))
            }
            "editor.getFileName" => {
                Ok(serde_json::json!({
                    "path": state.active_file_path,
                    "name": state.active_file_name,
                }))
            }
            "editor.getTabCount" => {
                Ok(serde_json::json!({ "count": state.tab_count }))
            }
            _ => Err(format!("Unknown editor method: {}", method)),
        }
    }

    /// Stop all running plugins
    #[allow(dead_code)] // reserved for graceful shutdown
    pub fn stop_all(&self) {
        let names: Vec<String> = {
            let plugins = self.plugins.lock().unwrap();
            plugins.keys().cloned().collect()
        };
        for name in names {
            let _ = self.stop(&name);
        }
    }
}
