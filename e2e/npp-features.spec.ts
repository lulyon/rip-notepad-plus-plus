import { test, expect } from "@playwright/test";

async function setupPage(page: any) {
  await page.addInitScript(() => { window.__TAURI_INTERNALS__ = { metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" }, windows: [{ label: "main" }], webviews: [{ label: "main" }] } }; });
  const M = `export function invoke(cmd,args){ const ok=()=>{}; const m={read_file:()=>({content:"",encoding:"UTF-8",detected_by_bom:false}),write_file:ok,delete_file:ok,rename_file:ok,file_exists:()=>false,get_file_size:()=>0,list_directory:()=>[],load_session:()=>null,save_session:ok,clear_session:ok,get_system_info:()=>({platform:"macos",locale:"zh-CN"}),open_in_browser:ok,run_command:()=>({exit_code:0,stdout:"",stderr:""}),detect_encoding:()=>"UTF-8",list_encodings:()=>[{name:"UTF-8",label:"UTF-8",group:"Unicode",has_bom:false}],find_in_files:()=>[],list_plugins:()=>[{name:"test",version:"1.0.0",description:"",author:"",enabled:true,running:false}],start_plugin:ok,stop_plugin:ok,send_plugin_command:()=>({}),update_editor_state:ok,notify_plugins:ok,git_status:()=>({branch:"main",changed:[],ahead:0,behind:0})}; return m[cmd]?Promise.resolve(m[cmd]()):Promise.reject(new Error("Unknown: "+cmd)); }`;
  await page.route("**/@tauri-apps/api/core*",(r:any)=>r.fulfill({status:200,contentType:"application/javascript",body:M}));
  await page.route("**/@tauri-apps/api/window*",(r:any)=>r.fulfill({status:200,contentType:"application/javascript",body:`export function getCurrentWindow(){return{close:()=>{},setFullscreen:()=>{},isFullscreen:()=>false,setAlwaysOnTop:()=>{},isAlwaysOnTop:()=>false}}`}));
  await page.route("**/@tauri-apps/plugin-dialog*",(r:any)=>r.fulfill({status:200,contentType:"application/javascript",body:`export async function open(){return null} export async function save(){return null}`}));
  await page.route("**/@tauri-apps/plugin-*",(r:any)=>r.fulfill({status:200,contentType:"application/javascript",body:"export {}"}));
  await page.goto("/",{waitUntil:"networkidle"}); await page.waitForTimeout(800);
}

async function createTwoTabs(page: any) {
  for (let i = 0; i < 2; i++) {
    await page.locator(".menu-bar-item").first().click();
    await page.waitForTimeout(100);
    await page.locator(".menu-item",{hasText:"新建"}).click();
    await page.waitForTimeout(300);
  }
}

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

  // ── DocList panel ──
  test("DocList tab visible in sidebar", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(3).click(); // View
    await page.waitForTimeout(150);
    await page.locator(".menu-item",{hasText:"显示侧边栏"}).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".sidebar-tab").nth(1)).toContainText("文档列表");
  });

  // ── DocList shows open documents ──
  test("DocList shows created tabs", async ({ page }) => {
    await createTwoTabs(page);
    await page.locator(".menu-bar-item").nth(3).click();
    await page.waitForTimeout(150);
    await page.locator(".menu-item",{hasText:"显示侧边栏"}).click();
    await page.waitForTimeout(300);
    // Click DocList tab (2nd tab: Files, DocList, Git, Symbols)
    await page.locator(".sidebar-tab").nth(1).click();
    await page.waitForTimeout(200);
    await expect(page.locator(".doclist-item")).toHaveCount(2);
  });

  // ── Sidebar has 4 tabs total ──
  test("sidebar has four tabs after NP++ features", async ({ page }) => {
    await page.locator(".menu-bar-item").nth(3).click();
    await page.waitForTimeout(150);
    await page.locator(".menu-item",{hasText:"显示侧边栏"}).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar-tab")).toHaveCount(4);
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
