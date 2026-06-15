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

  createDirectory(path: string): Promise<void> {
    return invoke("create_directory", { path });
  },

  deleteDirectory(path: string): Promise<void> {
    return invoke("delete_directory", { path });
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

  openTerminal(cwd: string, command: string): Promise<void> {
    return invoke("open_terminal", { cwd, command });
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

  updateEditorState(state: import("../types/ipc").EditorState): Promise<void> {
    return invoke("update_editor_state", { state });
  },

  notifyPlugins(method: string, params?: unknown): Promise<void> {
    return invoke("notify_plugins", { method, params: params ?? null });
  },

  // ── Git ──
  gitStatus(repoPath: string): Promise<import("../types/ipc").GitStatus> {
    return invoke("git_status", { repoPath });
  },

  gitBranch(repoPath: string): Promise<string> {
    return invoke("git_branch", { repoPath });
  },

  gitDiffFile(repoPath: string, filePath: string): Promise<string> {
    return invoke("git_diff_file", { repoPath, filePath });
  },
  gitStage(repoPath: string, filePath: string): Promise<void> {
    return invoke("git_stage", { repoPath, filePath });
  },
  gitUnstage(repoPath: string, filePath: string): Promise<void> {
    return invoke("git_unstage", { repoPath, filePath });
  },
  gitStageAll(repoPath: string): Promise<void> {
    return invoke("git_stage_all", { repoPath });
  },
  gitCommit(repoPath: string, message: string): Promise<void> {
    return invoke("git_commit", { repoPath, message });
  },
  gitPush(repoPath: string): Promise<string> {
    return invoke("git_push", { repoPath });
  },
  gitPull(repoPath: string): Promise<string> {
    return invoke("git_pull", { repoPath });
  },
  gitListBranches(repoPath: string): Promise<string[]> {
    return invoke("git_list_branches", { repoPath });
  },
  gitCheckoutBranch(repoPath: string, branch: string): Promise<void> {
    return invoke("git_checkout_branch", { repoPath, branch });
  },
  gitCreateBranch(repoPath: string, name: string): Promise<void> {
    return invoke("git_create_branch", { repoPath, name });
  },

  // ── File Monitoring & Snapshots ──
  watchFile(path: string): Promise<void> {
    return invoke("watch_file", { path });
  },

  checkFileChanged(path: string): Promise<boolean> {
    return invoke("check_file_changed", { path });
  },

  updateFileMtime(path: string): Promise<void> {
    return invoke("update_file_mtime", { path });
  },

  saveSnapshot(tabId: string, filePath: string | null, content: string): Promise<void> {
    return invoke("save_snapshot", { tabId, filePath, content });
  },

  loadSnapshots(): Promise<Array<[string, string | null, string]>> {
    return invoke("load_snapshots");
  },

  clearSnapshot(tabId: string): Promise<void> {
    return invoke("clear_snapshot", { tabId });
  },

  // ── Updater ──
  checkUpdate(): Promise<{ available: boolean; version?: string; body?: string } | null> {
    return invoke("plugin:updater|check");
  },

  // ── Workspace ──
  saveWorkspace(path: string, data: any): Promise<void> {
    return invoke("save_workspace", { path, data });
  },
  loadWorkspace(path: string): Promise<any> {
    return invoke("load_workspace", { path });
  },
  listRecentWorkspaces(): Promise<Array<{ path: string; name: string; roots: string[]; last_opened: string }>> {
    return invoke("list_recent_workspaces");
  },
  clearRecentWorkspaces(): Promise<void> {
    return invoke("clear_recent_workspaces");
  },

  // ── Archive ──
  listArchive(path: string): Promise<Array<{ name: string; size: number; is_dir: boolean }>> {
    return invoke("list_archive", { path });
  },
};
