# ripNotepad++ Phase 16-30 路线图

> 生成日期: 2026-06-15
> 已完成: Phase 1-15 (基础架构 + NP++ 对标功能)
> 待实施: Phase 16-30

---

## Phase 16 — 跨平台测试

### 目标
确保 ripNotepad++ 在 Windows 10/11 和 Linux (Ubuntu 22.04) 上正常运行。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | Windows CI | GitHub Actions `windows-latest`，安装 WebView2 Runtime，编译 NSIS/MSI |
| 2 | Linux CI | `ubuntu-latest`，安装 `libgtk-3-dev` `libwebkit2gtk-4.1-dev`，编译 AppImage |
| 3 | 平台差异修复 | 文件路径分隔符 (`\` vs `/`)、快捷键 (`Ctrl` vs `Cmd`)、Shell 命令差异 |
| 4 | Tauri 权限调优 | 各平台 `capabilities` 差异化配置（Windows shell vs Linux xdg-open）|
| 5 | 打包验证 | Windows `.msi` 安装/卸载测试、Linux `.AppImage`/`.deb` 安装测试 |
| 6 | Playwright 跨平台 | E2E 测试在 Windows/Linux Runner 上运行，修复平台相关断言 |
| 7 | 输入法兼容 | Windows IME、Linux fcitx/ibus 中文输入法测试 |

### 需准备
- Windows 10/11 实体机或虚拟机
- Ubuntu 22.04 虚拟机
- GitHub Actions 启用

### 预计工作量
2-3 天

---

## Phase 17 — 插件市场

### 目标
用户从编辑器内浏览、搜索、一键安装插件。

### 架构

```
中心仓库 (GitHub Pages) → plugins.json → PluginDialog "发现" Tab → 一键安装
```

### plugins.json 格式

```json
{
  "version": 1,
  "plugins": [
    {
      "name": "my-plugin",
      "version": "1.0.0",
      "description": "Description",
      "author": "Author",
      "homepage": "https://github.com/...",
      "download": "https://github.com/.../releases/latest/download/my-plugin.zip",
      "sha256": "abc123...",
      "runtime": "python3",
      "minAppVersion": "0.3.0",
      "tags": ["utility", "formatter"]
    }
  ]
}
```

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | 插件注册表仓库 | GitHub 仓库托管 `plugins.json`，GitHub Pages 提供静态访问 |
| 2 | 市场 UI | PluginDialog 新增"发现"标签页，卡片列表，搜索过滤 |
| 3 | 安装流程 | 下载 zip → SHA256 校验 → 解压到 `plugins/<name>/` → 验证 `plugin.json` → 注册 |
| 4 | 版本管理 | 检查已安装版本 vs 最新，显示"更新"按钮 |
| 5 | 安全模型 | SHA256 校验、来源 URL 显示、安装前确认对话框 |
| 6 | 提交指南 | `CONTRIBUTING.md` 文档，插件提交流程，审核标准 |
| 7 | 评分/统计 | 下载计数、用户评分（可选，Phase 2） |

### 需准备
- GitHub 仓库 `rip-notepad-plugins` 存放注册表
- 设计插件发布规范文档
- 准备 3-5 个种子插件作为示例

### 预计工作量
4-6 天

---

## Phase 18 — 高级 Git

### 目标
在侧边栏 Git 面板中支持 stage/unstage、commit、分支切换。

### 新增 Rust 命令

| 命令 | 功能 |
|------|------|
| `git_stage(repo_path, file_path)` | `git add <file>` |
| `git_unstage(repo_path, file_path)` | `git reset HEAD <file>` |
| `git_commit(repo_path, message)` | `git commit -m "<message>"` |
| `git_push(repo_path, remote?, branch?)` | `git push` |
| `git_pull(repo_path, remote?, branch?)` | `git pull` |
| `git_checkout(repo_path, branch)` | `git checkout <branch>` |
| `git_list_branches(repo_path)` | `git branch -a` |
| `git_create_branch(repo_path, name)` | `git checkout -b <name>` |

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | Rust Git 命令 | 实现 8 个新 `git_*` 命令，封装 `std::process::Command` 调用 git CLI |
| 2 | 前端 IPC | `ipc.ts` 新增 8 个 invoke wrapper |
| 3 | Git 面板增强 | 侧边栏 Git Tab 新增：Stage/Unstage 复选框、Commit 按钮 + 输入框 |
| 4 | Commit 对话框 | 独立 Dialog：message 输入 + 变更文件列表 + diff 预览 |
| 5 | 分支管理 UI | 当前分支高亮、分支下拉列表、切换确认、新建分支输入 |
| 6 | Push/Pull 按钮 | 工具栏或面板底部按钮，显示 ahead/behind 计数 |
| 7 | 状态栏分支指示器 | 点击弹出分支切换菜单 |

### 需准备
- 系统已安装 `git` CLI（macOS/Linux 自带，Windows 需 Git for Windows）
- 准备测试用 git 仓库

### 预计工作量
3-4 天

---

## Phase 19 — 性能优化

### 目标
大文件不卡顿，搜索不阻塞 UI。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | Monaco 大文件优化 | `largeFileOptimizations: true`，>1MB 禁用 IntelliSense/语法验证 |
| 2 | Tab 懒渲染 | 非活动 Tab 的 Monaco 编辑器延迟挂载 (`keepMounted: false`) |
| 3 | Web Worker 搜索 | `find_in_files` 的 regex 搜索移到 Web Worker 线程 |
| 4 | 编码检测异步 | `chardetng` 检测移到 Worker/后台线程，不阻塞 UI |
| 5 | Monaco 配置调优 | >10MB: 禁用 folding、bracket matching、word wrap |
| 6 | 虚拟滚动增强 | Monaco `wordWrap` + 大文件流畅滚动 |
| 7 | 启动性能 | 减少首屏加载 JS bundle，code splitting (React.lazy) |
| 8 | 内存监控 | 添加 FPS/内存使用状态栏指示器（DevTools only） |

### 需准备
- 准备测试文件：1MB / 10MB / 50MB 文本/JSON/日志文件
- Chrome DevTools Performance Profiler
- Lighthouse 基准测试

### 预计工作量
3-5 天

---

## Phase 20 — 主题市场

### 目标
导入/导出/分享自定义主题，支持 VS Code 主题格式。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | 主题导出 | Preferences → 导出主题 JSON（Monaco `IStandaloneThemeData` 格式）|
| 2 | 主题导入 | 文件选择 → 验证 → `monaco.editor.defineTheme()` → 应用 |
| 3 | VS Code 主题兼容 | 解析 `.json` 主题文件，映射 `tokenColors` → Monaco `defineTheme` |
| 4 | 在线市场 | 托管在 GitHub，`themes.json` 注册表（类似插件市场）|
| 5 | 主题预览 | 对话框内 Monaco 示例代码实时预览主题效果 |
| 6 | 内置主题 | 新增 10-15 个流行主题（Monokai, Solarized, Nord, Dracula 等）|

### 需准备
- 同 Phase 17：GitHub 仓库托管 `themes.json`
- 收集 10-20 个高质量 VS Code 主题作为种子数据
- Monaco `defineTheme` API 文档

### 预计工作量
2-3 天

---

## Phase 21 — 完整打印系统

### 目标
NP++ 式打印对话框：页眉/页脚/边距/页码/彩色打印/打印预览。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | 打印对话框 | 新建 `PrintDialog`：页边距、页眉/页脚模板、字体大小 |
| 2 | Monaco 内容提取 | 获取选中行或全文，格式化为 HTML（保留语法高亮）|
| 3 | 页眉/页脚模板 | `$(FILE_NAME)`, `$(PAGE)`, `$(DATE)` 等变量 |
| 4 | 打印预览 | `window.print()` + CSS `@media print` 控制 |
| 5 | 彩色/黑白切换 | Monaco 主题映射到打印色彩模式 |
| 6 | 行号打印 | 左侧行号列 |

### 需准备
- 测试打印机或虚拟 PDF 打印机 (macOS: `Save as PDF`)
- Monaco 语法高亮的 HTML 导出方案

### 预计工作量
2-3 天

---

## Phase 22 — 文档地图增强

### 目标
可交互缩略导航，比 minimap 更直观。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | 可点击导航 | 文档地图点击跳转到对应位置 |
| 2 | 高亮区域 | 当前可视区域在地图中高亮显示 |
| 3 | 语法着色缩略图 | minimap 中显示简化的语法颜色块 |
| 4 | 放大镜悬停 | 鼠标悬停时显示放大预览 |

### 需准备
- 无需额外准备（Monaco minimap 已内置）

### 预计工作量
1-2 天

---

## Phase 23 — 会话/工作区系统

### 目标
`.ripworkspace` 文件保存多项目根目录，一键切换工作区。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | 工作区文件格式 | `.ripworkspace` JSON：项目根目录列表、打开文件列表、活动文件、splitView 状态 |
| 2 | 保存工作区 | File → Save Workspace As → 写入 `.ripworkspace` |
| 3 | 加载工作区 | File → Open Workspace → 恢复所有项目根 + 打开文件 |
| 4 | 最近工作区 | File 菜单底部显示最近工作区列表 |
| 5 | 多根目录侧边栏 | Files 面板支持同时显示多个项目根（折叠树） |

### 需准备
- 设计 `.ripworkspace` JSON 格式规范
- 准备多项目目录场景用于测试

### 预计工作量
2-3 天

---

## Phase 24 — 高级查找替换

### 目标
增量搜索、在范围内查找、变更历史导航、全局替换预览。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | 增量搜索 | Ctrl+Shift+I，逐字符输入时高亮匹配项 |
| 2 | 在范围内查找 | 选中文本 → 仅在选中范围内搜索 |
| 3 | 全局替换预览 | 替换前弹出预览对话框：显示所有修改位置 + diff |
| 4 | 变更历史导航 | 跳转到上一个/下一个已修改的行（类似 NP++ 更改历史）|
| 5 | 正则助手 | 常用正则模板下拉列表 |

### 需准备
- 无需额外准备

### 预计工作量
2-3 天

---

## Phase 25 — 外部工具集成

### 目标
用户可配置的外部命令，工具栏按钮，构建/运行/调试集成。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | 工具配置 UI | Preferences → External Tools：名称、命令、快捷键、图标 |
| 2 | 工具栏 | 可配置的工具栏（显示/隐藏工具按钮）|
| 3 | 输出面板 | 侧边栏"输出"标签，捕获工具 stdout/stderr |
| 4 | 变量替换 | `$(FILE_PATH)`, `$(PROJECT_ROOT)` 等 |
| 5 | 构建集成 | 预设 Make / npm / cargo 模板 |

### 需准备
- 准备 shell 脚本、Makefile 作为测试用例
- 设计工具栏 UI 布局

### 预计工作量
3-4 天

---

## Phase 26 — 无障碍优化

### 目标
屏幕阅读器支援、高对比度增强、键盘独占操作模式。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | ARIA 标签 | 所有菜单项、按钮、输入框添加 `aria-label` |
| 2 | 键盘独占导航 | Tab 键在菜单/侧边栏/编辑器/状态栏间跳转 |
| 3 | 屏幕阅读器测试 | macOS VoiceOver + Windows NVDA |
| 4 | 高对比度主题 | `hc-black` 主题增强，所有 UI 元素适配 |
| 5 | 焦点指示器 | 当前焦点元素高亮边框 |
| 6 | 字体缩放 | Ctrl+滚轮全局放大 UI 字体 + Monaco 字体 |

### 需准备
- macOS 系统 VoiceOver (已内置)
- Windows NVDA 屏幕阅读器
- WCAG 2.1 标准参考

### 预计工作量
3-4 天

---

## Phase 27 — 云同步

### 目标
设置/主题/UDL/会话同步到 Dropbox / Google Drive / GitHub Gist。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | 同步抽象层 | `SyncProvider` 接口：Dropbox、Google Drive、Gist 实现 |
| 2 | Dropbox 集成 | OAuth 2.0，上传/下载 `settings.json` + `udls.json` |
| 3 | Google Drive 集成 | OAuth 2.0，文件读写 |
| 4 | GitHub Gist 集成 | 个人 access token，匿名 Gist (可选) 或登录后的 secret Gist |
| 5 | 冲突解决 | 时间戳比较，手动选择保留哪个版本 |
| 6 | 自动同步 | 设置更改时自动上传（可配置间隔）|

### 需准备
- Dropbox App Console 注册 → Client ID / Secret
- Google Cloud Console 注册 → OAuth 2.0 Client ID
- GitHub Personal Access Token (gist scope)
- OAuth 2.0 redirect URI 处理 (Tauri 自定义 protocol)

### 预计工作量
4-5 天

---

## Phase 28 — 移动端移植

### 目标
Tauri v2 支持 iOS/Android，精简 UI 适配触屏。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | iOS 构建 | Xcode + Tauri iOS target，`.ipa` 打包 |
| 2 | Android 构建 | Android Studio + NDK + Tauri Android target，`.apk`/`.aab` 打包 |
| 3 | 触屏 UI | 适配手指点击（最小 44px 触摸目标）、手势操作 |
| 4 | 精简功能 | 移动端仅保留核心编辑 + 文件浏览 + 搜索 |
| 5 | 软键盘适配 | 编辑器自动避让键盘、`fixed` → `absolute` 布局调整 |
| 6 | 离线存储 | 文件保存到设备本地存储 |

### 需准备
- Xcode 15+（macOS 独占）
- Android Studio + NDK
- Apple Developer 账号 ($99/年) 用于真机测试和签名
- 物理测试设备 (iPhone + Android 手机)

### 预计工作量
8-12 天

---

## Phase 29 — 协作编辑

### 目标
WebSocket 实时协作，类似 VS Code Live Share。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | Rust WebSocket 服务器 | `tokio-tungstenite` 实现信令 + 同步服务器 |
| 2 | OT/CRDT 同步引擎 | 操作变换 (Operational Transformation) 或 CRDT 冲突解决 |
| 3 | 会话管理 | 创建/加入会话、参与者列表、权限控制 (只读/编辑) |
| 4 | 光标同步 | 其他参与者的光标位置实时显示 |
| 5 | 选择同步 | 其他人的文本选择高亮 |
| 6 | 聊天面板 | 侧边栏聊天 Tab |

### 需准备
- WebSocket 服务器部署方案 (自托管或云服务)
- OT/CRDT 算法选型 (推荐 `yjs` + `y-websocket`)
- 信令服务器 (TURN/STUN，局域网可不需)

### 预计工作量
7-10 天

---

## Phase 30 — AI 助手面板

### 目标
内嵌 AI 对话面板（Claude API），代码解释/重构/生成。

### 任务清单

| # | 任务 | 详情 |
|---|------|------|
| 1 | AI 面板 UI | 侧边栏"AI"标签：对话气泡、代码块渲染 (Markdown + 语法高亮)|
| 2 | Claude API 集成 | Anthropic SDK / REST API，流式 SSE 响应 (`stream: true`) |
| 3 | 上下文注入 | 自动附加当前文件内容 + 光标位置到 prompt |
| 4 | 快捷操作 | 解释代码 (Explain)、重构 (Refactor)、生成测试 (Test)、修复 Bug |
| 5 | API Key 配置 | Preferences 输入 API Key，本地加密存储 |
| 6 | 对话历史 | 保存/恢复对话记录 (localStorage) |
| 7 | Token 计数 | 显示当前对话 token 消耗 |
| 8 | 模型选择 | Claude Opus / Sonnet / Haiku 切换 |

### 需准备
- Anthropic API Key (https://console.anthropic.com)
- SSE 流式解析方案
- 消息格式：`messages: [{ role, content }]` (Anthropic API)

### 预计工作量
4-5 天

---

## 优先级总览

| 优先级 | Phase | 工作量 | 前置依赖 |
|:---:|:---:|:---:|---|
| P0 | 16-跨平台测试 | 2-3天 | Windows/Linux 虚拟机 |
| P0 | 19-性能优化 | 3-5天 | 大文件测试数据 |
| P1 | 18-高级 Git | 3-4天 | git CLI |
| P1 | 23-工作区系统 | 2-3天 | — |
| P2 | 30-AI 助手 | 4-5天 | Claude API Key |
| P2 | 20-主题市场 | 2-3天 | GitHub 仓库 |
| P2 | 17-插件市场 | 4-6天 | GitHub 仓库 + 种子插件 |
| P3 | 21-打印系统 | 2-3天 | — |
| P3 | 24-高级查找 | 2-3天 | — |
| P3 | 25-外部工具 | 3-4天 | — |
| P3 | 22-文档地图 | 1-2天 | — |
| P4 | 26-无障碍 | 3-4天 | 屏幕阅读器 |
| P4 | 27-云同步 | 4-5天 | OAuth API Keys |
| P5 | 28-移动端 | 8-12天 | Apple Developer + Android Studio |
| P5 | 29-协作编辑 | 7-10天 | WebSocket 服务器 + CRDT |

---

## 关键路径

```
Phase 16 (跨平台) ──→ Phase 17 (插件市场) ──→ Phase 18 (高级 Git)
                                       ──→ Phase 19 (性能优化) ──→ Phase 20 (主题市场)
                                                                      ──→ Phase 23 (工作区)
                                                                      ──→ Phase 30 (AI助手)
```

---

> 本文档下次继续开发时使用。所有 API Key、账号配置等请提前准备好。
