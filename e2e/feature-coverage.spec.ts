import { test, expect } from "@playwright/test";
import { setupPage } from "./mocks/tauri-mock";

/** Helper: click a menu item by menu index and item text */
async function clickMenuItem(page: any, menuIndex: number, itemText: string) {
  await page.locator(".menu-bar-item").nth(menuIndex).click();
  await page.waitForTimeout(150);
  await page.locator(".menu-item", { hasText: itemText }).first().click();
  await page.waitForTimeout(300);
}

test.describe("Feature coverage — menus", () => {
  test.beforeEach(async ({ page: p }) => { await setupPage(p); });

  test("Edit menu items are present", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(1).click(); // Edit
    await page.waitForTimeout(150);
    const dropdown = page.locator(".menu-dropdown");
    await expect(dropdown).toContainText("撤销");
    await expect(dropdown).toContainText("重做");
    await expect(dropdown).toContainText("剪切");
    await expect(dropdown).toContainText("复制");
    await expect(dropdown).toContainText("粘贴");
    await expect(dropdown).toContainText("删除");
    await expect(dropdown).toContainText("全选");
    await expect(dropdown).toContainText("复制行");
    await expect(dropdown).toContainText("删除行");
    await expect(dropdown).toContainText("上移行");
    await expect(dropdown).toContainText("下移行");
    await expect(dropdown).toContainText("列编辑模式");
    await expect(dropdown).toContainText("去除尾随空格");
    await expect(dropdown).toContainText("删除空行");
    await expect(dropdown).toContainText("转为大写");
    await expect(dropdown).toContainText("转为小写");
  });

  test("Encoding menu items are present", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(4).click(); // Encoding
    await page.waitForTimeout(150);
    const dropdown = page.locator(".menu-dropdown");
    await expect(dropdown).toContainText("以 UTF-8 编码");
    await expect(dropdown).toContainText("转换为 UTF-8");
    await expect(dropdown).toContainText("字符集");
  });

  test("Macro menu items are present", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(6).click(); // Macro
    await page.waitForTimeout(150);
    const dropdown = page.locator(".menu-dropdown");
    await expect(dropdown).toContainText("开始录制");
    await expect(dropdown).toContainText("停止录制");
    await expect(dropdown).toContainText("回放");
    await expect(dropdown).toContainText("保存当前宏");
  });

  test("Run menu items are present", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(7).click(); // Run
    await page.waitForTimeout(150);
    const dropdown = page.locator(".menu-dropdown");
    await expect(dropdown).toContainText("运行");
  });

  test("View split submenu items are present", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(3).click(); // View
    await page.waitForTimeout(150);
    const dropdown = page.locator(".menu-dropdown");
    await expect(dropdown).toContainText("水平分屏");
    await expect(dropdown).toContainText("垂直分屏");
    await expect(dropdown).toContainText("单窗口");
  });

  test("File menu Open Folder item is present", async ({ page }) => {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(150);
    await expect(page.locator(".menu-dropdown")).toContainText("打开文件夹");
  });

});

test.describe("Feature coverage — dialogs", () => {
  test.beforeEach(async ({ page: p }) => { await setupPage(p); });

  test("Preferences dialog opens and has tabs", async ({ page }) => {
    await clickMenuItem(page, 0, "首选项");
    await expect(page.locator(".prefs-dialog")).toBeVisible();
    // Check tabs (Chinese locale default)
    await expect(page.locator(".prefs-tab").nth(0)).toContainText("常规");
    await expect(page.locator(".prefs-tab").nth(1)).toContainText("编辑");
    await expect(page.locator(".prefs-tab").nth(2)).toContainText("新建文档");
  });

  test("About dialog opens", async ({ page }) => {
    await page.locator(".menu-bar-item").last().click(); // Help
    await page.waitForTimeout(150);
    await page.locator(".menu-item", { hasText: "关于" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".dialog")).toBeVisible();
  });

  test("Run dialog opens", async ({ page }) => {
    await clickMenuItem(page, 7, "运行"); // Run → Run...
    await page.waitForTimeout(300);
    await expect(page.locator(".run-dialog")).toBeVisible();
  });

  test("Plugin manager dialog opens", async ({ page }) => {
    await clickMenuItem(page, 9, "插件管理"); // Plugins → Plugin Manager
    await page.waitForTimeout(300);
    await expect(page.locator(".plugin-dialog")).toBeVisible();
  });

  test("Shortcut mapper dialog opens", async ({ page }) => {
    await clickMenuItem(page, 0, "快捷键管理");
    await page.waitForTimeout(300);
    await expect(page.locator(".dialog")).toBeVisible();
  });
});

test.describe("Feature coverage — sidebar", () => {
  test.beforeEach(async ({ page: p }) => { await setupPage(p); });

  test("sidebar has seven tabs", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(3).click(); // View
    await page.waitForTimeout(150);
    await page.locator(".menu-item", { hasText: "显示侧边栏" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".sidebar-tab")).toHaveCount(7);
  });

  test("Workspace: Open Folder menu item exists with shortcut", async ({ page }) => {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(150);
    const item = page.locator(".menu-item", { hasText: "打开文件夹" });
    await expect(item).toBeVisible();
    await expect(item).toContainText("Ctrl+Shift+O");
  });
});

test.describe("Feature coverage — search and replace", () => {
  test.beforeEach(async ({ page: p }) => { await setupPage(p); });

  test("search panel has find and replace inputs", async ({ page }) => {
    // Create tab first
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item", { hasText: "新建" }).click();
    await page.waitForTimeout(500);
    // Open search
    await page.locator(".menu-bar-item").nth(2).click();
    await page.waitForTimeout(150);
    await page.locator(".menu-item", { hasText: "查找" }).first().click();
    await page.waitForTimeout(300);
    const panel = page.locator(".search-panel");
    await expect(panel).toBeVisible();
    // Should have find input
    await expect(panel.locator("input").first()).toBeVisible();
  });
});

test.describe("Feature coverage — language menu", () => {
  test.beforeEach(async ({ page: p }) => { await setupPage(p); });

  test("Language menu has common languages", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(5).click(); // Language
    await page.waitForTimeout(150);
    const dropdown = page.locator(".menu-dropdown");
    await expect(dropdown).toContainText("JavaScript");
    await expect(dropdown).toContainText("TypeScript");
    await expect(dropdown).toContainText("Python");
    await expect(dropdown).toContainText("Rust");
    await expect(dropdown).toContainText("HTML");
    await expect(dropdown).toContainText("JSON");
  });
});
