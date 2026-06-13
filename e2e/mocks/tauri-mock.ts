// Mock for @tauri-apps/api/core
export async function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  // Return sensible defaults for each command
  switch (cmd) {
    case "read_file":
      return { content: "", encoding: "UTF-8", detected_by_bom: false };
    case "write_file":
      return;
    case "delete_file":
      return;
    case "rename_file":
      return;
    case "file_exists":
      return false;
    case "get_file_size":
      return 0;
    case "list_directory":
      return [];
    case "detect_encoding":
      return "UTF-8";
    case "convert_encoding_command":
      return new Uint8Array();
    case "list_encodings":
      return [{ name: "UTF-8", label: "UTF-8", group: "Unicode", has_bom: false }];
    case "decode_with_encoding":
      return "";
    case "encode_with_encoding":
      return new Uint8Array();
    case "find_in_files":
      return [];
    case "save_session":
      return;
    case "load_session":
      return null;
    case "clear_session":
      return;
    case "open_in_browser":
      return;
    case "run_command":
      return { exit_code: 0, stdout: "mock output", stderr: "" };
    case "get_system_info":
      return { platform: "macos", locale: "zh-CN" };
    case "list_plugins":
      return [{ name: "sample-hello", version: "1.0.0", description: "A sample plugin", author: "Test", enabled: true, running: false }];
    case "start_plugin":
      return;
    case "stop_plugin":
      return;
    case "send_plugin_command":
      return { ok: true };
    default:
      console.warn(`[mock] unhandled invoke: ${cmd}`);
      return null;
  }
}
