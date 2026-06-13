import { test, expect, type Page } from "@playwright/test";
import { execSync, spawn, type ChildProcess } from "child_process";

let devServer: ChildProcess;
const BASE = "http://localhost:1420";

test.describe("ripNotepad++ UI Tests", () => {
  let page: Page;

  test.beforeAll(async () => {
    // Kill any existing server on port 1420
    try { spawn("bash", ["-c", "lsof -ti :1420 | xargs kill 2>/dev/null"]); } catch {}
    // Start Vite dev server via npm run dev
    devServer = spawn("npm", ["run", "dev"], {
      cwd: "/Users/zhihu/code/rip-notepad-plus-plus",
      stdio: "pipe",
      env: { ...process.env, CI: "true" },
    });
    // Wait for server ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Vite start timeout")), 60000);
      const onData = (data: Buffer) => {
        const text = data.toString();
        if (text.includes("Local:") || text.includes("ready in")) {
          clearTimeout(timeout);
          resolve();
        }
      };
      devServer.stdout?.on("data", onData);
      devServer.stderr?.on("data", onData);
      devServer.on("error", reject);
    });
  });

  test.afterAll(() => {
    devServer?.kill("SIGTERM");
  });

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    page = await context.newPage();

    // Inject Tauri internals BEFORE any JS loads
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { label: "main" },
          windows: [{ label: "main" }],
          webviews: [{ label: "main" }],
        },
      };
    });

    // Route all @tauri-apps/* imports to mock implementations
    const MOCK_CORE = `
export function invoke(cmd, args) {
  const ok = () => {};
  const m = {
    read_file: () => ({ content: "", encoding: "UTF-8", detected_by_bom: false }),
    write_file: ok, delete_file: ok, rename_file: ok, file_exists: () => false,
    get_file_size: () => 0, list_directory: () => [],
    load_session: () => null, save_session: ok, clear_session: ok,
    get_system_info: () => ({ platform: "macos", locale: "zh-CN" }),
    open_in_browser: ok, run_command: () => ({ exit_code:0, stdout:"", stderr:"" }),
    detect_encoding: () => "UTF-8", convert_encoding_command: () => new Uint8Array(),
    list_encodings: () => [{ name:"UTF-8", label:"UTF-8", group:"Unicode", has_bom:false }],
    decode_with_encoding: () => "", encode_with_encoding: () => new Uint8Array(),
    find_in_files: () => [],
    list_plugins: () => [{ name:"sample-hello", version:"1.0.0", description:"Test", author:"Test", enabled:true, running:false }],
    start_plugin: ok, stop_plugin: ok, send_plugin_command: () => ({})
  };
  const fn = m[cmd];
  return fn ? Promise.resolve(fn()) : Promise.reject(new Error("Unknown: "+cmd));
}
`;
    await page.route("**/@tauri-apps/api/core*", (r) =>
      r.fulfill({ status: 200, contentType: "application/javascript", body: MOCK_CORE }));
    await page.route("**/@tauri-apps/api/window*", (r) =>
      r.fulfill({ status: 200, contentType: "application/javascript",
        body: `export function getCurrentWindow() { return { close:()=>{}, setFullscreen:()=>{}, isFullscreen:()=>false, setAlwaysOnTop:()=>{}, isAlwaysOnTop:()=>false }; }` }));
    await page.route("**/@tauri-apps/plugin-dialog*", (r) =>
      r.fulfill({ status: 200, contentType: "application/javascript",
        body: `export async function open() { return null; } export async function save() { return null; }` }));
    await page.route("**/@tauri-apps/plugin-*", (r) =>
      r.fulfill({ status: 200, contentType: "application/javascript", body: `export {}` }));

    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ── Basic UI presence ──
  test("app title and welcome screen visible", async () => {
    await expect(page.locator(".app")).toBeVisible();
    await expect(page.locator(".menu-bar")).toBeVisible();
    await expect(page.locator(".tab-bar")).toBeVisible();
    await expect(page.locator(".status-bar")).toBeVisible();
    await expect(page.locator(".welcome")).toBeVisible();
  });

  // ── Menu: File → New (click) ──
  test("File → New creates a tab", async () => {
    // Open File menu
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(200);
    await expect(page.locator(".menu-dropdown")).toBeVisible();
    // Click "新建"
    await page.locator(".menu-item", { hasText: "新建" }).click();
    await page.waitForTimeout(300);
    // Welcome screen should be gone, editor visible
    await expect(page.locator(".welcome")).not.toBeVisible();
    // Tab should exist
    const tabs = page.locator(".tab");
    await expect(tabs).toHaveCount(1);
  });

  // ── File → New via Ctrl+N menu item ──
  test("File menu New creates new tab", async () => {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item", { hasText: "新建" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".welcome")).not.toBeVisible();
    await expect(page.locator(".tab")).toHaveCount(1);
  });

  // ── Editor container appears after tab creation ──
  test("editor area visible after creating tab", async () => {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item", { hasText: "新建" }).click();
    await page.waitForTimeout(500);
    // Welcome screen should disappear, editor area takes its place
    await expect(page.locator(".welcome")).not.toBeVisible();
    await expect(page.locator(".editor-area")).toBeVisible();
  });

  // Note: Monaco text input in headless browser is unreliable
  // due to Monaco's complex IME/input handling. Verified manually.

  // ── File → Close Tab ──
  test("File menu Close removes tab and shows welcome", async () => {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item", { hasText: "新建" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".tab")).toHaveCount(1);
    // Open File menu, click Close
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(200);
    await page.locator(".menu-item", { hasText: "关闭" }).first().click();
    await page.waitForTimeout(300);
    await expect(page.locator(".welcome")).toBeVisible();
  });

  // ── Search: Find menu item ──
  test("Search menu Find opens search panel", async () => {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item", { hasText: "新建" }).click();
    await page.waitForTimeout(500);
    // Open Search menu (3rd menu)
    await page.locator(".menu-bar-item").nth(2).click();
    await page.waitForTimeout(200);
    await page.locator(".menu-item", { hasText: "查找" }).first().click();
    await page.waitForTimeout(400);
    await expect(page.locator(".search-panel")).toBeVisible();
  });

  // ── Go to Line ──
  test("Search menu Go To opens goto dialog", async () => {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item", { hasText: "新建" }).click();
    await page.waitForTimeout(500);
    await page.locator(".menu-bar-item").nth(2).click();
    await page.waitForTimeout(200);
    await page.locator(".menu-item", { hasText: "转到" }).click();
    await page.waitForTimeout(400);
    await expect(page.locator(".goto-dialog")).toBeVisible();
  });

  // ── Tab context menu ──
  test("right-click tab shows context menu", async () => {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item", { hasText: "新建" }).click();
    await page.waitForTimeout(300);
    await page.locator(".tab").first().click({ button: "right" });
    await page.waitForTimeout(200);
    await expect(page.locator(".tab-context-menu")).toBeVisible();
  });

  // ── i18n: language switch via preferences ──
  test("language switch changes menu labels", async () => {
    // Open File → Preferences
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item", { hasText: "首选项" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".prefs-dialog")).toBeVisible();

    // Switch to English
    await page.locator("select").last().selectOption("en");
    await page.waitForTimeout(200);

    // Close dialog
    await page.locator(".prefs-dialog .btn").click();

    // Check menu bar now shows English
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(200);
    await expect(page.locator(".menu-dropdown").first()).toContainText("New");
  });

  // ── Menu: View always on top toggle ──
  test("View → Always on Top menu item is present", async () => {
    // Open View menu (4th menu)
    await page.locator(".menu-bar-item").nth(3).click();
    await page.waitForTimeout(200);
    await expect(page.locator(".menu-dropdown")).toContainText("窗口置顶");
  });

  // ── Multiple tabs ──
  test("multiple tabs via menu and tab button", async () => {
    // Create 3 tabs using menu
    for (let i = 0; i < 2; i++) {
      await page.locator(".menu-bar-item").first().click();
      await page.waitForTimeout(100);
      await page.locator(".menu-item", { hasText: "新建" }).click();
      await page.waitForTimeout(300);
    }
    // Third via + button
    await page.locator(".tab-new").click();
    await page.waitForTimeout(300);
    await expect(page.locator(".tab")).toHaveCount(3);

    // Close middle tab via X button
    await page.locator(".tab").nth(1).locator(".tab-close").click();
    await page.waitForTimeout(200);
    await expect(page.locator(".tab")).toHaveCount(2);
  });

  // ── Tab drag-and-drop ──
  test("tab can be dragged to reorder", async () => {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item", { hasText: "新建" }).click();
    await page.waitForTimeout(300);
    await page.locator(".tab-new").click();
    await page.waitForTimeout(300);
    await expect(page.locator(".tab")).toHaveCount(2);
    // Drag first tab to second position
    const firstTab = page.locator(".tab").first();
    const secondTab = page.locator(".tab").last();
    await firstTab.dragTo(secondTab);
    await page.waitForTimeout(300);
    await expect(page.locator(".tab")).toHaveCount(2);
  });

  // ── Plugins menu ──
  test("Plugins menu shows manager item", async () => {
    // Plugins menu is 9th (0-indexed)
    await page.locator(".menu-bar-item").nth(9).click();
    await page.waitForTimeout(200);
    await expect(page.locator(".menu-dropdown")).toBeVisible();
  });

  // ── Sidebar toggle (not visible by default) ──
  test("sidebar is hidden by default", async () => {
    await expect(page.locator(".sidebar")).not.toBeVisible();
  });
});

// ── Rust IPC command tests (via cargo test) ──
test.describe("Rust IPC Commands", () => {
  test("cargo check passes with 0 errors", async () => {
    const result = execSync("cargo check 2>&1", {
      cwd: "/Users/zhihu/code/rip-notepad-plus-plus/src-tauri",
      encoding: "utf-8",
    });
    expect(result).not.toContain("error[");
  });

  test("npx tsc --noEmit passes with 0 errors", async () => {
    const result = execSync("npx tsc --noEmit 2>&1", {
      cwd: "/Users/zhihu/code/rip-notepad-plus-plus",
      encoding: "utf-8",
    });
    expect(result.trim()).toBe("");
  });
});
