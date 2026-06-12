pub mod manager;
pub mod types;

use manager::PluginManager;
use std::sync::OnceLock;

static PLUGIN_MANAGER: OnceLock<PluginManager> = OnceLock::new();

pub fn get_plugin_manager() -> &'static PluginManager {
    PLUGIN_MANAGER.get_or_init(PluginManager::new)
}
