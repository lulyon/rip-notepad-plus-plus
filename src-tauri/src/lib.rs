mod commands;
mod encoding;
mod models;
mod plugin_api;
mod search;

use commands::encoding::{
    convert_encoding_command, decode_with_encoding, detect_encoding, encode_with_encoding,
    list_encodings,
};
use commands::file_ops::{create_directory, delete_directory, delete_file, file_exists, get_file_size, list_directory, read_file, rename_file, write_file};
use commands::search::find_in_files;
use commands::session::{clear_session, load_session, save_session};
use commands::git::{git_branch, git_diff_file, git_status};
use commands::plugin::{list_plugins, notify_plugins, send_plugin_command, start_plugin, stop_plugin, update_editor_state};
use commands::system::{get_system_info, open_in_browser, open_terminal, run_command};
use commands::terminal::{pty_kill, pty_read, pty_spawn, pty_write};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
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
            // Terminal (PTY)
            pty_spawn,
            pty_write,
            pty_read,
            pty_kill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
