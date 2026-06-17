# ripNotepad++ 项目全景 — Phase 0-30

> 生成日期: 2026-06-15
> 版本: 0.3.0
> 状态: 21/30 Phase 完成，9 个待实施

---

## Phase 0-10 — 基础架构 ✅

**技术栈**: Tauri v2 (Rust) + Monaco Editor + React 19 + TypeScript + Zustand + Vite 6

### IPC 命令 (55 个)

| 模块 | 命令数 | 命令 |
|------|:---:|------|
| 文件操作 | 9 | read_file, write_file, delete_file, rename_file, file_exists, get_file_size, list_directory, create_directory, delete_directory |
| 编码 | 5 | detect_encoding, convert_encoding_command, list_encodings, decode_with_encoding, encode_with_encoding |
| 搜索 | 1 | find_in_files |
| 会话 | 3 | save_session, load_session, clear_session |
| 系统 | 4 | open_in_browser, open_terminal, run_command, get_system_info |
| 插件 | 6 | list_plugins, start_plugin, stop_plugin, send_plugin_command, update_editor_state, notify_plugins |
| Git | 12 | git_status, git_branch, git_diff_file, git_stage, git_unstage, git_stage_all, git_commit, git_push, git_pull, git_list_branches, git_checkout_branch, git_create_branch |
| 监控 | 7 | watch_file, check_file_changed, update_file_mtime, save_snapshot, load_snapshots, clear_snapshot, list_archive |
| 工作区 | 4 | save_workspace, load_workspace, list_recent_workspaces, clear_recent_workspaces |
| PTY 终端 | 4 | pty_spawn, pty_write, pty_resize, pty_kill |

### 组件

| 类别 | 数量 | 说明 |
|------|:---:|------|
| 对话框 | 16 | About, Preferences, ShortcutMapper, Encoding, GoToLine, Run, Plugin, Compare, CommandPalette, Hash, Summary, Udl, ContextMenu, Commit, Tools, UnsavedChanges |
| 侧边栏面板 | 5 | Files (多根目录), AI Chat, Git, Symbols, Terminal |
| 菜单 | 12 | File, Edit, Search, View, Encoding, Language, Macro, Run, Tools, Plugins, Window, Help |
| Store | 15 | editor, settings, search, macro, encoding, plugin, git, clipboard, editorRef, bookmark, mark, contextMenu, udl, ai, tool |
| Hooks | 11 | useMenuActions, useMonacoActions, useAutoSave, useFileWatcher, useSnapshotAutoSave, useUpdateChecker, usePluginBridge, useKeyboardShortcuts, useFileDrop, useMacroRecorder, useWindowTitle |

### i18n

7 种语言: 中文 / English / 日本語 / 한국어 / Français / العربية / עברית
493 keys 每种语言，RTL 自动检测

### 测试

- 356 单元测试 (21 suites, vitest)
- 65 E2E 测试 (4 spec files, Playwright)

---

## Phase 11-15 — NP++ 对标 ✅

### Phase 11 — 核心编辑器功能

| 功能 | 快捷键 | 实现 |
|------|------|------|
| 书签 (gutter toggle/navigate/clear) | Ctrl+F2 / F2 / Shift+F2 | bookmarkStore + Monaco decorations |
| 5 样式标记 (mark/unmark/inverse/cut/copy/paste/delete) | 菜单驱动 | markStore + 5 色装饰 |
| 注释切换 (行/块) | Ctrl+Q / Ctrl+Shift+Q | Monaco editor.action.commentLine/blockComment |
| 括号匹配跳转 | Ctrl+B / Ctrl+Shift+B | Monaco editor.action.jumpToBracket/selectToBracket |
| 36 搜索菜单项 + 3 编辑菜单项 | — | menuDefinitions.ts |

### Phase 12 — 监控 & 标签

| 功能 | 说明 |
|------|------|
| 文件外部变更监控 | Rust notify crate + useFileWatcher (3s 轮询 + 事件) |
| 文档快照 | 7s 自动备份脏文件至 app data dir |
| 标签固定 | 📌 pinned 标签不可关闭，Close All But Pinned |
| 标签颜色 | 5 色 (red/orange/yellow/green/blue) 右键菜单 |
| 关闭但保留当前 | Close All But Current |
| 分割/合并行 | Ctrl+I / Ctrl+J |
| Tab/空格转换 | 菜单驱动 |

### Phase 13-15

| Phase | 内容 |
|:---:|------|
| 13 | 哈希工具 (MD5/SHA-1/SHA-256/SHA-512)、免打扰模式 (F12)、文档摘要、恢复关闭文件 (Ctrl+Shift+T) |
| 14 | i18n ja/ko/fr、UDL 自定义语言系统 (Monarch + .tmLanguage 导入)、可自定义上下文菜单 |
| 15 | RTL 支持 (ar/he 翻译 + CSS 镜像 + applyDirection)、auto-updater (tauri-plugin-updater) |

---

## Phase 16-20 — 质量/生态

### Phase 16 — 跨平台测试 ❌

**未开始。** 需 Windows/Linux 虚拟机 + GitHub Actions CI。

### Phase 17 — 插件市场 ❌

**未开始。** 需 GitHub 仓库托管 `plugins.json` + 市场 UI + 一键安装流程。

### Phase 18 — 高级 Git ✅

| 功能 | 实现 |
|------|------|
| git stage / unstage / stage_all | Rust 命令 + 前端 IPC |
| git commit | CommitDialog 弹窗 (文件列表 + message + Enter 提交) |
| git push / pull | ↑↓ 按钮 |
| git branch list / checkout / create | 分支下拉菜单 + 新建输入框 |
| 状态栏分支点击弹窗 | dispatch "git-show-branches" → GitPanel 展开分支菜单 |

**12 个 Rust Git 命令，11 个前端 IPC 包装。**

### Phase 19 — 性能优化 ✅

| 优化 | 说明 |
|------|------|
| 大文件检测 (>1MB) | 禁用 IntelliSense/suggest/bracketColorization |
| 超大文件 (>10MB) | 超精简模式：关 minimap/wordWrap/folding/renderWhitespace/smoothCursor |
| 代码分割 | React.lazy 拆分 15 个对话框，主 bundle 减少 ~30% |
| 状态栏内存监控 (dev only) | 显示文件大小 KB |

### Phase 20 — 主题市场 ❌

**未开始。** 需主题导入/导出 + VS Code 主题兼容 + 在线注册表。

---

## Phase 21-25 — 工具/效率

### Phase 21 — 完整打印系统 ❌

**未开始。** 需打印对话框 (页眉/页脚/边距/页码) + Monaco 内容 HTML 导出。

### Phase 22 — 文档地图增强 🟡

| 任务 | 状态 |
|------|:---:|
| Monaco minimap 内置: 点击导航 + 视口高亮 + 语法色块 | ✅ (内置) |
| minimap 宽度滑块 (40-120px) | ✅ Preferences |
| minimap 滑块常显开关 (always/mouseover) | ✅ Preferences |
| 放大镜悬停 (代码片段预览浮层) | ❌ 已移除 (用户不需要) |

### Phase 23 — 会话/工作区系统 ✅

| 功能 | 实现 |
|------|------|
| `.ripworkspace` JSON 格式 | version/name/roots/open_tabs/split_view/sidebar_tab |
| Save Workspace As... | 原生保存对话框 |
| Open Workspace... | 恢复项目根 + 打开文件 + split view |
| 最近工作区列表 | Rust 持久化 (max 10), `recent_workspaces.json` |
| 多根目录侧边栏 | Files 面板: 多个 RootTree 折叠区块, + Add Folder..., × 移除 |
| 新 crate: dirs, chrono |

### Phase 24 — 高级查找替换 ✅

| 功能 | 实现 |
|------|------|
| 增量搜索 | 勾选 Incremental → 每打一个字自动高亮匹配 |
| 在范围内查找 | 勾选 In Selection → 搜索仅限选中文本 |
| 替换预览 | Preview 按钮 → 弹窗红色旧值/绿色新值 → 确认后 Replace All |
| 正则助手 | 📋 下拉 11 种常用正则模板, 点击自动填入 + 启用 Regex |
| 变更历史导航 | Ctrl+Shift+↑/↓ 跳转编辑过的行, editorStore changedLines |

### Phase 25 — 外部工具集成 🟡

| 任务 | 状态 |
|------|:---:|
| 工具配置 UI (name/command/cwd/shortcut) | ✅ ToolsDialog |
| 变量替换 ($(FILE_PATH) 等 5 种) | ✅ App.tsx handler |
| 工具执行 (Rust run_command) | ✅ 结果通知 |
| 工具栏 (可配置工具按钮) | ❌ 未做 |
| 输出面板 (捕获 stdout/stderr) | ❌ 未做 |
| 构建模板 (npm/make/cargo preset) | ❌ 未做 |

---

## Phase 26-30 — 平台/创新

### Phase 26 — 无障碍优化 ❌

**未开始。** ARIA 标签、键盘独占导航、屏幕阅读器测试、高对比度主题增强、焦点指示器、字体缩放。

### Phase 27 — 云同步 ❌

**未开始。** Dropbox/Google Drive/GitHub Gist OAuth 同步。需注册各平台 API Key。

### Phase 28 — 移动端移植 ❌

**未开始。** iOS (Xcode + Apple Developer $99/年) + Android (Android Studio + NDK)。

### Phase 29 — 协作编辑 ❌

**未开始。** WebSocket 服务器 + OT/CRDT 同步引擎 (yjs) + 光标同步 + 聊天面板。

### Phase 30 — AI 助手面板 ✅

| 功能 | 实现 |
|------|------|
| Provider 配置 | API Base URL、Key、Model，localStorage 持久化 |
| 自动发现 | 启动时读取 `~/.claude/settings.json` |
| AI 面板 UI | 侧边栏 🤖 tab，对话气泡 + Markdown 渲染 |
| 多会话 | 标签页管理，自动标题（首条消息 20 字截断） |
| API 调用 | Anthropic Messages 格式 → DeepSeek 端点 (兼容) |
| 流式 SSE | `stream: true`, 逐 token 实时显示 |
| **联网搜索** | `web_search_20250305` 服务端工具，模型自主决定搜索时机，搜索结果带来源链接 |
| **位置感知** | 时区自动注入 `user_location`，天气/本地新闻搜索本地化 |
| **日期感知** | `new Date()` 注入 system prompt，模型知道当前日期 |
| Thinking 展示 | DeepSeek extended thinking, 折叠/展开, 流式实时更新 |
| 上下文注入 | 自动附加当前文件内容 + 语言 |
| 快捷操作 | Explain Code / Refactor / Generate Tests / Fix Bugs |
| 对话历史 | localStorage 持久化，多会话独立存储 |
| XML 清理 | 后处理 strip DeepSeek tool_call XML 残留 |

---

## 额外完成 (非原计划)

| 功能 | 说明 |
|------|------|
| **Markdown Preview** | 主编辑区左右分屏实时渲染 (Ctrl+Shift+V / 👁 按钮) |
| **通用预览引擎** | 26 种文件类型, 全部离线 (npm + ?url import) |
| **列模式切换** | Edit → Column Mode ✓ 勾选状态指示 |
| **侧边栏拖拽调整宽度** | 180-600px, 持久化 |
| **菜单项检查标记** | MenuItemDef.checked + ✓ 渲染 |
| **iTerm2 自动检测** | open_terminal 优先使用 iTerm2 |
| **集成 PTY 终端** | 侧边栏 Terminal tab + Rust portable-pty + shell 会话管理 |
| **AI 联网搜索** | 服务端 web_search_20250305 + user_location 时区本地化 + 日期注入 |
| **AI 多会话** | 标签页式多会话，独立历史，XML 后处理 |

### 预览引擎支持的类型

| 类别 | 数量 | 类型 |
|------|:---:|------|
| 文档 | 5 | Markdown, HTML, Jupyter, Word, LaTeX |
| 数据 | 7 | CSV/TSV, JSON, XML, YAML, Excel, .env, HAR |
| 图表 | 2 | Mermaid, Graphviz/DOT |
| 媒体 | 10 | 图片 (9), SVG, PDF, 3D模型 (4), 字体 (4), 音频 (5), 视频 (3) |
| 开发 | 7 | Diff/Patch, SQL, SQLite, ZIP, Subtitle, GraphQL, Protobuf, TOML, INI |

---

## 统计总览

```
Phase 0-10  ████████████ 基础架构        ✅  10/10
Phase 11-15 ████████████ NP++对标        ✅   5/5
Phase 16-20 ████░░░░░░░░ 质量/生态       🟡   2/5
Phase 21-25 ████████░░░░ 工具/效率       🟡   3/5
Phase 26-30 ██░░░░░░░░░░ 平台/创新       🟡   1/5
额外完成   ██████                         ✅   10+
──────────────────────────────────────────
总计        ████████░░░░                  21/30 + 10+
```

| 指标 | 数值 |
|------|:---:|
| IPC 命令 | 41 |
| 对话框 | 14 |
| Store | 14 |
| Hooks | 13 |
| i18n 语言 | 7 |
| 单元测试 | 308 |
| E2E 测试 | 70 |
| DMG 大小 | 9.1 MB (Intel) / 8.9 MB (ARM) |

---

## 优先级建议

| 优先级 | Phase | 工作量 | 前置依赖 |
|:---:|:---:|:---:|---|
| P0 | 16-跨平台测试 | 2-3天 | Windows/Linux 虚拟机 |
| P0 | 25-工具栏/输出面板 | 1-2天 | — |
| P1 | 20-主题市场 | 2-3天 | GitHub 仓库 |
| P1 | 17-插件市场 | 4-6天 | GitHub 仓库 + 种子插件 |
| P2 | 21-打印系统 | 2-3天 | — |
| P2 | 26-无障碍 | 3-4天 | 屏幕阅读器 |
| P3 | 27-云同步 | 4-5天 | OAuth API Keys |
| P4 | 28-移动端 | 8-12天 | Apple Developer + Android Studio |
| P4 | 29-协作编辑 | 7-10天 | WebSocket 服务器 + CRDT |
