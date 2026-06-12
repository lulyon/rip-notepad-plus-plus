use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};

use crate::plugin_api::types::{JsonRpcRequest, JsonRpcResponse, PluginInfo, PluginManifest};

/// A running plugin process
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
}

impl PluginManager {
    pub fn new() -> Self {
        // Default plugin directory: next to the executable, or in the project
        let plugin_dir = std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("plugins");

        Self {
            plugin_dir,
            plugins: Arc::new(Mutex::new(HashMap::new())),
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

    /// Send a JSON-RPC request to a running plugin
    pub fn send_to_plugin(
        &self,
        name: &str,
        request: &JsonRpcRequest,
    ) -> Result<JsonRpcResponse, String> {
        let mut plugins = self.plugins.lock().unwrap();
        if let Some(process) = plugins.get_mut(name) {
            process.send_request(request)
        } else {
            Err(format!("Plugin '{}' is not running", name))
        }
    }

    /// Stop all running plugins
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
