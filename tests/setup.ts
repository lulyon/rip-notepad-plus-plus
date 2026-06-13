import "@testing-library/jest-dom/vitest";

// Mock Tauri IPC for all unit tests
const mockIpc = new Map<string, () => unknown>();

export function mockIpcCommand(cmd: string, fn: () => unknown) {
  mockIpc.set(cmd, fn);
}

export function clearIpcMocks() {
  mockIpc.clear();
}

// Always return a sensible mock by default
export function defaultIpcMock(cmd: string): unknown {
  const ok = () => {};
  const defaults: Record<string, unknown> = {
    read_file: { content: "test content", encoding: "UTF-8", detected_by_bom: false },
    write_file: undefined,
    delete_file: undefined,
    rename_file: undefined,
    file_exists: false,
    get_file_size: 0,
    list_directory: [],
    create_directory: undefined,
    delete_directory: undefined,
    detect_encoding: "UTF-8",
    convert_encoding_command: new Uint8Array(),
    list_encodings: [{ name: "UTF-8", label: "UTF-8", group: "Unicode", has_bom: false }],
    decode_with_encoding: "",
    encode_with_encoding: new Uint8Array(),
    find_in_files: [],
    save_session: undefined,
    load_session: null,
    clear_session: undefined,
    open_in_browser: undefined,
    open_terminal: undefined,
    run_command: { exit_code: 0, stdout: "", stderr: "" },
    get_system_info: { platform: "macos", locale: "zh-CN" },
    list_plugins: [],
    start_plugin: undefined,
    stop_plugin: undefined,
    send_plugin_command: { ok: true },
    update_editor_state: undefined,
    notify_plugins: undefined,
    git_status: { branch: "main", changed: [], ahead: 0, behind: 0 },
    git_branch: "main",
    git_diff_file: "",
  };
  return defaults[cmd];
}

// Mock global __TAURI_INTERNALS__
(globalThis as any).__TAURI_INTERNALS__ = {
  metadata: {
    currentWindow: { label: "main" },
    currentWebview: { label: "main" },
    windows: [{ label: "main" }],
    webviews: [{ label: "main" }],
  },
};

// Mock localStorage
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
  },
  writable: true,
});

// Mock Tauri dialog/shell plugins
(globalThis as any).__TAURI_INTERNALS__ = {
  metadata: {
    currentWindow: { label: "main" },
    currentWebview: { label: "main" },
    windows: [{ label: "main" }],
    webviews: [{ label: "main" }],
  },
};
