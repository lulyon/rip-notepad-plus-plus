mod commands;
mod encoding;
mod models;
mod search;

use commands::encoding::{
    convert_encoding_command, decode_with_encoding, detect_encoding, encode_with_encoding,
    list_encodings,
};
use commands::file_ops::{delete_file, file_exists, get_file_size, read_file, rename_file, write_file};
use commands::search::find_in_files;
use commands::session::{clear_session, load_session, save_session};
use commands::system::{get_system_info, open_in_browser};

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
            get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
