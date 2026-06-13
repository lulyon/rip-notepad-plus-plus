/**
 * Shared Tauri IPC mock for Playwright E2E tests.
 *
 * Usage in spec files:
 *   import { setupPage } from "./mocks/tauri-mock";
 *   test.beforeEach(async ({ page }) => { await setupPage(page); });
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setupPage(page: any) {
  // Inject Tauri internals BEFORE JS loads
  await page.addInitScript(() => {
    (window as any).__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: "main" },
        currentWebview: { label: "main" },
        windows: [{ label: "main" }],
        webviews: [{ label: "main" }],
      },
    };
  });

  // Complete mock for @tauri-apps/api/core — all 31 IPC commands
  const MOCK_CORE = `
export function invoke(cmd, args) {
  const ok = () => {};
  const m = {
    // File Ops (9)
    read_file: () => ({ content: "", encoding: "UTF-8", detected_by_bom: false }),
    write_file: ok,
    delete_file: ok,
    rename_file: ok,
    file_exists: () => false,
    get_file_size: () => 0,
    list_directory: () => [],
    create_directory: ok,
    delete_directory: ok,
    // Encoding (5)
    detect_encoding: () => "UTF-8",
    convert_encoding_command: () => new Uint8Array(),
    list_encodings: () => [{ name: "UTF-8", label: "UTF-8", group: "Unicode", has_bom: false }],
    decode_with_encoding: () => "",
    encode_with_encoding: () => new Uint8Array(),
    // Search (1)
    find_in_files: () => [],
    // Session (3)
    save_session: ok,
    load_session: () => null,
    clear_session: ok,
    // System (4)
    open_in_browser: ok,
    open_terminal: ok,
    run_command: () => ({ exit_code: 0, stdout: "", stderr: "" }),
    get_system_info: () => ({ platform: "macos", locale: "zh-CN" }),
    // Plugin (6)
    list_plugins: () => [{ name: "sample-hello", version: "1.0.0", description: "A sample plugin", author: "Test", enabled: true, running: false }],
    start_plugin: ok,
    stop_plugin: ok,
    send_plugin_command: () => ({ ok: true }),
    update_editor_state: ok,
    notify_plugins: ok,
    // Git (3)
    git_status: () => ({ branch: "main", changed: [], ahead: 0, behind: 0 }),
    git_branch: () => "main",
    git_diff_file: () => "",
  };
  const fn = m[cmd];
  return fn ? Promise.resolve(fn()) : Promise.reject(new Error("Unknown IPC: " + cmd));
}`;

  // Route all @tauri-apps/* imports to mock implementations
  await page.route("**/@tauri-apps/api/core*", (r: any) =>
    r.fulfill({ status: 200, contentType: "application/javascript", body: MOCK_CORE }));

  await page.route("**/@tauri-apps/api/window*", (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `export function getCurrentWindow() { return { close:()=>{}, setFullscreen:()=>{}, isFullscreen:()=>false, setAlwaysOnTop:()=>{}, isAlwaysOnTop:()=>false }; }`,
    }));

  await page.route("**/@tauri-apps/plugin-dialog*", (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `export async function open() { return null; } export async function save() { return null; }`,
    }));

  // Catch-all for other Tauri plugins
  await page.route("**/@tauri-apps/plugin-*", (r: any) =>
    r.fulfill({ status: 200, contentType: "application/javascript", body: "export {}" }));

  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
}
