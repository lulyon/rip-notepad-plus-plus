/**
 * Mock for src/lib/ipc.ts — used by vitest.
 * All IPC functions are vi.fn() spies that return sensible defaults.
 */
import { vi } from "vitest";

const ok = () => undefined;

export const ipc = {
  // File Ops
  readFile: vi.fn().mockResolvedValue({ content: "test", encoding: "UTF-8", detected_by_bom: false }),
  writeFile: vi.fn().mockResolvedValue(undefined),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  renameFile: vi.fn().mockResolvedValue(undefined),
  fileExists: vi.fn().mockResolvedValue(false),
  getFileSize: vi.fn().mockResolvedValue(0),
  listDirectory: vi.fn().mockResolvedValue([]),
  createDirectory: vi.fn().mockResolvedValue(undefined),
  deleteDirectory: vi.fn().mockResolvedValue(undefined),
  // Encoding
  detectEncoding: vi.fn().mockResolvedValue("UTF-8"),
  convertEncoding: vi.fn().mockResolvedValue(new Uint8Array()),
  listEncodings: vi.fn().mockResolvedValue([
    { name: "UTF-8", label: "UTF-8", group: "Unicode", has_bom: false },
  ]),
  decodeWithEncoding: vi.fn().mockResolvedValue(""),
  encodeWithEncoding: vi.fn().mockResolvedValue(new Uint8Array()),
  // Search
  findInFiles: vi.fn().mockResolvedValue([]),
  // Session
  saveSession: vi.fn().mockResolvedValue(undefined),
  loadSession: vi.fn().mockResolvedValue(null),
  clearSession: vi.fn().mockResolvedValue(undefined),
  // System
  openInBrowser: vi.fn().mockResolvedValue(undefined),
  openTerminal: vi.fn().mockResolvedValue(undefined),
  runCommand: vi.fn().mockResolvedValue({ exit_code: 0, stdout: "", stderr: "" }),
  getSystemInfo: vi.fn().mockResolvedValue({ platform: "macos", locale: "zh-CN" }),
  // Plugin
  listPlugins: vi.fn().mockResolvedValue([]),
  startPlugin: vi.fn().mockResolvedValue(undefined),
  stopPlugin: vi.fn().mockResolvedValue(undefined),
  sendPluginCommand: vi.fn().mockResolvedValue({ ok: true }),
  updateEditorState: vi.fn().mockResolvedValue(undefined),
  notifyPlugins: vi.fn().mockResolvedValue(undefined),
  // Git
  gitStatus: vi.fn().mockResolvedValue({ branch: "main", changed: [], ahead: 0, behind: 0 }),
  gitBranch: vi.fn().mockResolvedValue("main"),
  gitDiffFile: vi.fn().mockResolvedValue(""),
};
