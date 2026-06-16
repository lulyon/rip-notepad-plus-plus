mod commands;
mod encoding;
mod models;
mod plugin_api;
mod pty;
mod search;

use std::sync::Mutex;
use commands::encoding::{
    convert_encoding_command, decode_with_encoding, detect_encoding, encode_with_encoding,
    list_encodings,
};
use commands::file_ops::{create_directory, delete_directory, delete_file, file_exists, get_file_size, list_directory, read_file, rename_file, write_file};
use commands::search::find_in_files;
use commands::session::{clear_session, load_session, save_session};
use commands::git::{git_branch, git_checkout_branch, git_commit, git_create_branch, git_diff_file, git_list_branches, git_pull, git_push, git_stage, git_stage_all, git_status, git_unstage};
use commands::plugin::{list_plugins, notify_plugins, send_plugin_command, start_plugin, stop_plugin, update_editor_state};
use commands::system::{get_system_info, open_in_browser, open_terminal, run_command};
use commands::monitor::{watch_file, check_file_changed, update_file_mtime, save_snapshot, load_snapshots, clear_snapshot, list_archive, MonitorState};
use commands::workspace::{save_workspace, load_workspace, list_recent_workspaces, clear_recent_workspaces};
use commands::pty::{pty_spawn, pty_write, pty_resize, pty_kill};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(MonitorState::new()))
        .setup(|app| {
            env_logger::init();
            let icon_bytes = include_bytes!("../icons/128x128.png");
            if let Ok(img) = image::load_from_memory(icon_bytes) {
                let rgba = img.to_rgba8();
                let (width, height) = rgba.dimensions();
                let icon = tauri::image::Image::new_owned(rgba.into_raw(), width, height);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(icon);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File ops
            read_file,
            write_file,
            delete_file,
            rename_file,
            file_exists,
            get_file_size,
            list_directory,
            create_directory,
            delete_directory,
            // Encoding
            detect_encoding,
            convert_encoding_command,
            list_encodings,
            decode_with_encoding,
            encode_with_encoding,
            // Search
            find_in_files,
            // Session
            save_session,
            load_session,
            clear_session,
            // System
            open_in_browser,
            open_terminal,
            run_command,
            get_system_info,
            // Plugin
            list_plugins,
            start_plugin,
            stop_plugin,
            send_plugin_command,
            update_editor_state,
            notify_plugins,
            // Git
            git_status,
            git_branch,
            git_diff_file,
            git_stage,
            git_unstage,
            git_stage_all,
            git_commit,
            git_push,
            git_pull,
            git_list_branches,
            git_checkout_branch,
            git_create_branch,
            // Monitor
            watch_file,
            check_file_changed,
            update_file_mtime,
            save_snapshot,
            load_snapshots,
            clear_snapshot,
            // Archive
            list_archive,
            // Workspace
            save_workspace,
            load_workspace,
            list_recent_workspaces,
            clear_recent_workspaces,
            // PTY Terminal
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
