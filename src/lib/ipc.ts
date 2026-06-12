import { invoke } from "@tauri-apps/api/core";
import type {
  FileReadResult,
  EncodingInfo,
  SearchMatch,
  FindInFilesParams,
  SessionData,
  SystemInfo,
  ConvertEncodingRequest,
  CommandResult,
  DirEntry,
  PluginInfo,
} from "../types/ipc";

/** Typed wrapper around Tauri invoke(). */
export const ipc = {
  // ── File Ops ──
  readFile(path: string, encoding?: string): Promise<FileReadResult> {
    return invoke("read_file", { path, encodingOverride: encoding ?? null });
  },

  writeFile(path: string, content: string, encoding: string): Promise<void> {
    return invoke("write_file", { path, content, encoding });
  },

  deleteFile(path: string): Promise<void> {
    return invoke("delete_file", { path });
  },

  renameFile(oldPath: string, newPath: string): Promise<void> {
    return invoke("rename_file", { oldPath, newPath });
  },

  fileExists(path: string): Promise<boolean> {
    return invoke("file_exists", { path });
  },

  getFileSize(path: string): Promise<number> {
    return invoke("get_file_size", { path });
  },

  listDirectory(path: string): Promise<DirEntry[]> {
    return invoke("list_directory", { path });
  },

  // ── Encoding ──
  detectEncoding(data: number[]): Promise<string> {
    return invoke("detect_encoding", { data });
  },

  convertEncoding(req: ConvertEncodingRequest): Promise<number[]> {
    return invoke("convert_encoding_command", { req });
  },

  listEncodings(): Promise<EncodingInfo[]> {
    return invoke("list_encodings");
  },

  decodeWithEncoding(data: number[], encodingName: string): Promise<string> {
    return invoke("decode_with_encoding", { data, encodingName });
  },

  encodeWithEncoding(content: string, encodingName: string): Promise<number[]> {
    return invoke("encode_with_encoding", { content, encodingName });
  },

  // ── Search ──
  findInFiles(params: FindInFilesParams): Promise<SearchMatch[]> {
    return invoke("find_in_files", { params });
  },

  // ── Session ──
  saveSession(session: SessionData): Promise<void> {
    return invoke("save_session", { session });
  },

  loadSession(): Promise<SessionData | null> {
    return invoke("load_session");
  },

  clearSession(): Promise<void> {
    return invoke("clear_session");
  },

  // ── System ──
  openInBrowser(url: string): Promise<void> {
    return invoke("open_in_browser", { url });
  },

  runCommand(command: string, cwd?: string): Promise<CommandResult> {
    return invoke("run_command", { command, cwd: cwd ?? null });
  },

  getSystemInfo(): Promise<SystemInfo> {
    return invoke("get_system_info");
  },

  // ── Plugin ──
  listPlugins(): Promise<PluginInfo[]> {
    return invoke("list_plugins");
  },

  startPlugin(name: string): Promise<void> {
    return invoke("start_plugin", { name });
  },

  stopPlugin(name: string): Promise<void> {
    return invoke("stop_plugin", { name });
  },

  sendPluginCommand(name: string, method: string, params?: unknown): Promise<unknown> {
    return invoke("send_plugin_command", { name, method, params: params ?? null });
  },
};
