use crate::plugin_api::get_plugin_manager;
use crate::plugin_api::types::{EditorState, PluginInfo};

#[tauri::command]
pub async fn list_plugins() -> Result<Vec<PluginInfo>, String> {
    get_plugin_manager().discover()
}

#[tauri::command]
pub async fn start_plugin(name: String) -> Result<(), String> {
    get_plugin_manager().start(&name)
}

#[tauri::command]
pub async fn stop_plugin(name: String) -> Result<(), String> {
    get_plugin_manager().stop(&name)
}

#[tauri::command]
pub async fn send_plugin_command(
    name: String,
    method: String,
    params: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let request = crate::plugin_api::types::JsonRpcRequest {
        jsonrpc: "2.0".to_string(),
        id: Some(1),
        method,
        params,
    };
    let response = get_plugin_manager().send_to_plugin(&name, &request)?;
    if let Some(error) = response.error {
        Err(format!("Plugin error [{}]: {}", error.code, error.message))
    } else {
        Ok(response.result.unwrap_or(serde_json::Value::Null))
    }
}

#[tauri::command]
pub async fn update_editor_state(state: EditorState) -> Result<(), String> {
    get_plugin_manager().update_state(state);
    Ok(())
}

#[tauri::command]
pub async fn notify_plugins(method: String, params: Option<serde_json::Value>) -> Result<(), String> {
    get_plugin_manager().notify_all(&method, params);
    Ok(())
}
