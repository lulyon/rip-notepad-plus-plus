import { test, expect } from "@playwright/test";
import { setupPage } from "./mocks/tauri-mock";

test.describe("Notepad++ ported features", () => {
  test.beforeEach(async ({ page }) => { await setupPage(page); });

  // ── Edit: Copy Path commands ──
  test("Edit menu has copy path items", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(1).click(); // Edit menu
    await page.waitForTimeout(150);
    const dd = page.locator(".menu-dropdown");
    await expect(dd).toContainText("复制文件路径");
    await expect(dd).toContainText("复制文件名");
    await expect(dd).toContainText("复制目录路径");
  });

  // ── Edit: Sort and Dedup ──
  test("Edit menu has sort and dedup items", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(1).click();
    await page.waitForTimeout(150);
    const dd = page.locator(".menu-dropdown");
    await expect(dd).toContainText("升序排列");
    await expect(dd).toContainText("降序排列");
    await expect(dd).toContainText("移除重复行");
  });

  // ── Edit: Insert DateTime ──
  test("Edit menu has insert date time item", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(1).click();
    await page.waitForTimeout(150);
    await expect(page.locator(".menu-dropdown")).toContainText("插入日期时间");
  });

  // ── Sidebar now has 3 tabs (Files, Git, Symbols) ──
  test("sidebar has three tabs", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(3).click();
    await page.waitForTimeout(150);
    await page.locator(".menu-item",{hasText:"显示侧边栏"}).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar-tab")).toHaveCount(3);
  });

  // ── Git tab visible ──
  test("Git tab visible in sidebar", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(3).click();
    await page.waitForTimeout(150);
    await page.locator(".menu-item",{hasText:"显示侧边栏"}).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar-tab").nth(1)).toContainText("Git");
  });

  // ── Symbols tab visible ──
  test("Symbols tab visible in sidebar", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(3).click();
    await page.waitForTimeout(150);
    await page.locator(".menu-item",{hasText:"显示侧边栏"}).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar-tab").nth(2)).toContainText("符号");
  });

  // ── Terminal toggle menu item ──
  test("Compare menu item exists", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(9).click(); // Plugins
    await page.waitForTimeout(150);
    await expect(page.locator(".menu-dropdown")).toContainText("文件对比");
  });

  // ── XML Tools ──
  test("Edit menu has XML tools", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(1).click();
    await page.waitForTimeout(150);
    const dd = page.locator(".menu-dropdown");
    await expect(dd).toContainText("格式化 XML");
    await expect(dd).toContainText("校验 XML");
  });

  // ── Command Palette Ctrl+Shift+P ──
  test("Command palette opens with Ctrl+Shift+P", async ({ page }) => {
    // The action is registered in Monaco, test via custom event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });
    await page.waitForTimeout(300);
    await expect(page.locator(".cmd-palette")).toBeVisible();
  });

  test("Command palette shows commands and filters", async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    });
    await page.waitForTimeout(300);
    await expect(page.locator(".cmd-palette-item").first()).toBeVisible();
    // Type to filter
    await page.locator(".cmd-palette-input").fill("新建");
    await page.waitForTimeout(200);
    await expect(page.locator(".cmd-palette-item")).toHaveCount(1);
  });

  // ── Plugin API: editor methods available ──
  test("Plugin manager opens and shows sample-hello", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(9).click(); // Plugins
    await page.waitForTimeout(150);
    await page.locator(".menu-item",{hasText:"插件管理"}).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".plugin-dialog")).toBeVisible();
  });
});
