# ripNotepad++ 全面审计报告

> 日期: 2026-06-15
> 版本: 0.3.0
> 审计范围: Frontend + Rust Backend + UX/i18n + Tests/Docs/Build

---

## 一、严重 Bug

| # | 来源 | Bug | 文件 |
|:---:|------|------|------|
| 1 | Frontend | **数据丢失**: `closeOtherTabs`/`closeAllButCurrent`/`forceCloseAllTabs` 绕过未保存检查，静默丢弃修改内容 | `editorStore.ts:201-359` |
| 2 | Frontend | AI 默认模型名含 ANSI 转义码 `deepseek-v4-pro[1m]`，`[1m]` 是终端加粗控制码 | `aiStore.ts:53` |
| 3 | Frontend | `contextMenuStore.loadItems` / `toolStore.loadTools` 从未调用，用户自定义配置重启丢失 | `contextMenuStore.ts:80`, `toolStore.ts:48` |
| 4 | Frontend | **快捷键冲突**: `Ctrl+Shift+Up/Down` 同时绑定 "移动行" 和 "变更历史导航" | `useMonacoActions.ts` |
| 5 | Frontend | `Ctrl+Shift+F` (在文件中查找) 无全局处理程序，菜单显示快捷键但不可用 | `SearchPanel.tsx` |
| 6 | Frontend | `settingsStore.toggleSetting` 对非布尔键调用会损坏数值状态 (fontSize→false) | `settingsStore.ts:150-157` |
| 7 | Frontend | 搜索面板无正则错误 try/catch，无效正则静默失败无提示 | `searchStore.ts:201,219` |
| 8 | Frontend | `MacroStore` 回放 Backspace/Delete/Arrow 键静默被忽略 | `useMacroRecorder.ts:81-90` |
| 9 | Frontend | 侧边栏 drag-drop Tauri 事件监听器永远不会 cleanup (内存泄漏) | `Sidebar.tsx:108-136` |
| 10 | Rust | **路径遍历漏洞**: 所有文件操作命令无路径沙箱，`write_file` 隐式 `create_dir_all` | `file_ops.rs` |
| 11 | Rust | **内存泄漏**: `watch_file` 每次调用 `Box::leak(watcher)` 创建不可回收的文件监视器 | `monitor.rs:79` |
| 12 | Rust | **僵尸进程**: 插件子进程移除时未 `wait()`，操作系统级 PID 泄漏 | `manager.rs` |

## 二、数据丢失风险

| # | 场景 | 位置 |
|:---:|------|------|
| 1 | 关闭其他标签 / 关闭全部但保留当前 — 跳过未保存检查 | `editorStore.ts:201,299` |
| 2 | 重启后自定义外部工具丢失 (`loadTools` 从未调用) | `toolStore.ts` |
| 3 | 重启后自定义右键菜单配置丢失 (`loadItems` 从未调用) | `contextMenuStore.ts` |
| 4 | 标签颜色和固定状态不持久化到会话恢复 | `TabBar.tsx` |
| 5 | 书签不持久化到 localStorage | `bookmarkStore.ts` |
| 6 | 只有未命名标签时 `clearSession()` 会清除项目根设置 | `App.tsx:124` |
| 7 | AI API key 明文存储于 localStorage | `aiStore.ts` |
| 8 | 快照文件读取后立即删除，若后续 panic 会永久丢失 | `monitor.rs:195` |

## 三、缺失 i18n (硬编码字符串)

| 组件 | 数量 | 示例 |
|------|:---:|------|
| `AiPanel.tsx` | 20+ | Send, Settings, Clear chat, AI Configuration, Explain Code, Refactor, Generate Tests, Fix Bugs |
| `GitPanel.tsx` | 10+ | Stage All, Commit..., diff, Push OK, Pull OK, Committed, Commit failed |
| `SearchPanel.tsx` | 6 | Incremental, In Selection, Preview, Replace Preview, Replace All, Cancel |
| `CommitDialog.tsx` | 5 | Commit Changes, file(s) staged, Commit message..., Commit, Cancel |
| `ToolsDialog.tsx` | 15+ | External Tools, Add/Edit Tool, Remove, No tools configured, Variables 等 |
| `UnsavedChangesDialog.tsx` | 5 | Unsaved Changes, Save All, Discard All, Cancel |
| `RunDialog.tsx` | 10 | 全部变量描述硬编码为中文 |
| `ContextMenuDialog.tsx` | 1 | Edit 按钮 |
| `StatusBar.tsx` | 2 | "Ready", "ripNotepad++" (空状态时) |
| ja/ko/fr 语言文件 | ~50/种 | 缺少 `menu.file.saveWorkspace`, `menu.help.checkUpdate`, `udl.*`, `contextMenu.*` 等新增 key |

## 四、缺失交互

### 对话框缺 Escape 关闭

`RunDialog`、`ContextMenuDialog`、`CommitDialog`、`ToolsDialog`、`UnsavedChangesDialog`

### 搜索面板问题

- 在文件中查找无"浏览文件夹"按钮
- 大文件替换预览无数量限制 (可能冻结 UI)
- `findInFiles` 查询为空时静默返回无错误提示
- whole-word 匹配的 `findMatches` 参数传递错误

### 标签栏

- 无溢出处理 (20+ 标签时不可用)
- 固定标签仍显示关闭按钮但点击无效
- 标签重载在右键菜单中缺失

### 状态栏

- Git 分支在标签打开时不可点击 (空状态时反而可以)
- 内存 KB 显示仅在 dev 模式

### 快捷键

- `Ctrl+Shift+F` 菜单声明但不可用
- `select-braces` 缺 WinCtrl 变体
- macOS 菜单显示 `Ctrl` 但实际需要 `Cmd`

## 五、死代码

| 组件/函数 | 说明 |
|------|------|
| `DocListPanel.tsx` | 已从侧边栏移除 |
| `JsonViewerPanel.tsx` | 已从侧边栏移除 |
| `TaskListPanel.tsx` | 已从侧边栏移除 |
| `ClipboardPanel.tsx` | 已从侧边栏移除 |
| `MarkdownPreview.tsx` (standalone) | 已被 GenericPreview 替代 |
| `settingsStore.loadSettings` | 从未调用 |
| `contextMenuStore.loadItems` | 从未调用 |
| `toolStore.loadTools` | 从未调用 |
| `udlStore.loadUdls` | 从未调用 |
| 8 个 IPC 函数 | `deleteFile`, `renameFile`, `getFileSize`, `createDirectory`, `deleteDirectory`, `detectEncoding`, `listRecentWorkspaces`, `clearRecentWorkspaces` |

### 未使用依赖

| 包 | 体积 | 说明 |
|------|:---:|------|
| `@xterm/xterm` | ~1.5MB | 终端功能已移除但未卸载 |
| `@xterm/addon-fit` | ~50KB | 同上 |

## 六、测试覆盖缺口

### Store (6/15 零覆盖)

`aiStore`、`bookmarkStore`、`contextMenuStore`、`markStore`、`toolStore`、`udlStore`

### Hooks (3/11 零覆盖)

`useFileWatcher`、`useSnapshotAutoSave`、`useUpdateChecker`

### Dialogs (0/16)

无一有专用单元测试。

### 未覆盖的关键路径

保存操作、打开操作、关闭清理、编码转换、文件监控、崩溃恢复、Git 高级操作、AI store 方法

### E2E 缺失功能 (20+)

AI 面板、3D 预览、工作区保存/加载、哈希工具、文档摘要、UDL 编辑器、提交对话框、外部工具、宏录制/回放、文件拖放、标签固定、书签、标记、无干扰模式

## 七、文档统计错误

| 指标 | 文档声称 | 实际 | 文件 |
|------|:---:|:---:|------|
| IPC 命令数 | 41 | **51** | README/CLAUDE |
| E2E 测试数 | 70 | **65** | README/CLAUDE |
| 预览渲染器数 | 26 | **31** | CLAUDE |
| 对话框数 | 15 | **16** | README |
| Store 数 | 14 | **15** | README |
| test-files 数 | 28 | **40** | test-files/README |

## 八、构建/配置问题

| 问题 | 文件 |
|------|------|
| `e2e/playwright.config.ts` 硬编码绝对路径 `cwd: "/Users/zhihu/..."` | CI 不可用 |
| `e2e/ui-tests.spec.ts` 2 处硬编码路径 | CI 不可用 |
| `tests/previewEngine.test.ts` 使用 `__dirname` (ESM 不可用) | `previewEngine.test.ts:459` |
| E2E mock 缺少 14 个新增 IPC 命令 | `e2e/mocks/tauri-mock.ts` |
| Unit test mock 缺少新增 IPC 命令 | `tests/__mocks__/ipc.ts` |
| `__TAURI_INTERNALS__` mock 在 setup.ts 中重复两次 | `tests/setup.ts:54,78` |
| `@xterm/xterm` 未使用但未从 package.json 移除 | `package.json` |
| `tauri.conf.json` 中 `devtools: false` 对开发不友好 | `tauri.conf.json` |
| 文件系统作用域 `/**` 过于宽松 | `capabilities/default.json` |
| `log` crate 无日志后端 (编码警告静默丢失) | `convert.rs:11,23` |

## 九、Rust 后端专项

### 严重

| # | 问题 | 文件 |
|:---:|------|------|
| 1 | 路径遍历：所有文件操作无沙箱 | `file_ops.rs` |
| 2 | `Box::leak` 每 watch_file 内存泄漏 | `monitor.rs` |
| 3 | 插件僵尸进程：未 wait() 子进程 | `manager.rs` |
| 4 | 9 处 `Mutex::lock().unwrap()` 可能 panic | `manager.rs` |
| 5 | 插件 I/O 无超时 (阻塞 read_line) | `manager.rs` |

### 中等

| # | 问题 |
|:---:|------|
| 6 | `run_command` 无限制 shell 访问 + 无超时 |
| 7 | AppleScript 注入风险 (`open_terminal`) |
| 8 | 快照清除基于 tabId 匹配文件名无沙箱 |
| 9 | 搜索双重读取文件 (空字节检测 + read_to_string) |
| 10 | 搜索仅支持 UTF-8 |
| 11 | 日志 crate 未初始化 |
| 12 | 会话路径用 `$HOME` 而非 `dirs::data_dir()` |

### 低

| # | 问题 |
|:---:|------|
| 13 | `x-mac-roman` + `macintosh` 重复编码条目 |
| 14 | `windows-874` 误分类为 Western European (应为 Thai) |
| 15 | git 路径拼接可能暴露仓库外路径 |
| 16 | 搜索结果使用字节偏移而非字符偏移 |

## 十、UI/UX 问题

- 所有对话框无焦点锁定 (Tab 键可能逃逸)
- 标签栏无水平滚动 (20+ 标签时缩成一条线)
- `functionList` 在每次击键时重新扫描全文 (大文件卡顿)
- `useFileWatcher` 轮询间隔依赖 `tabs.map().join()` 每次都重建
- `useKeyboardShortcuts` 监听器每次击键都重新注册
- `GenericPreview` 在 `useMemo` 内有副作用 (setState)
- 替换预览无数量限制，大量匹配会产生巨大 DOM
- 宏回放总是播第一个保存的宏 (选择 UI 缺失)

## 统计

| 维度 | 数值 |
|------|:---:|
| 严重 Bug | 12 |
| 数据丢失风险 | 8 |
| 硬编码字符串 | 80+ |
| 缺 Escape 关闭的对话框 | 5 |
| 死代码项 | 16 |
| 零测试覆盖 Store | 6 |
| 零测试覆盖 Hooks | 3 |
| 文档统计错误 | 6 |
| 构建/配置问题 | 8 |
| Rust 严重 | 5 |
| Rust 中等 | 7 |
| Rust 低 | 4 |
| UI/UX 问题 | 10 |
