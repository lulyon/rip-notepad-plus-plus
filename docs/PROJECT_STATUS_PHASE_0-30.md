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

58 种语言: 覆盖 VS Code 全部官方语言 + Notepad++ 全部有效翻译
495 keys 每种语言，5 种 RTL（ar/he/fa/ur/pa），自动方向检测

### 测试

- 376 单元测试 (22 suites, vitest)
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

#### 16.1 现状

| 维度 | 状态 |
|------|:---:|
| 当前开发平台 | macOS only (Apple Silicon) |
| 已装 Rust targets | `aarch64-apple-darwin`, `x86_64-apple-darwin` — 无 Linux/Windows target |
| E2E 测试 | 65 个 (4 specs, 782 行)，mock Tauri IPC (`e2e/mocks/tauri-mock.ts`)，headless Chromium |
| 单元测试 | 376 个 (22 suites)，全部 `vitest`，平台无关 |
| CI/CD | **无任何 GitHub Actions workflow** |
| 本地编译 | `tsc` + `cargo check` 通过（macOS only） |
| 平台构建 | 从未在 Windows/Linux 上编译/运行过 |
| 二进制签名 | macOS 未公证，Windows 无代码签名 |

#### 16.2 代码审计 — 跨平台兼容性

逐个审查了全部 `cfg(target_os)` 条件编译块（共 6 处）和所有路径/换行/Shell 相关代码：

##### ✅ 已做好跨平台适配（无需修改）

| 模块 | 文件 | 审计结论 |
|------|------|----------|
| **路径分隔符 (TS)** | `src/App.tsx`, `editorStore.ts`, `Sidebar.tsx`, `RunDialog.tsx` 等 | 所有 `.split(/[/\\]/)` 同时处理 `/` 和 `\`。未使用 Node `path` 模块。✅ |
| **路径操作 (Rust)** | `src-tauri/src/commands/file_ops.rs` | 全部使用 `std::path::Path`，跨平台原生。`validate_path()` 只拦截 `..` 遍历。✅ |
| **Shell 命令** | `src-tauri/src/commands/system.rs:10-74` | `run_command()` 已 `cfg!(windows)` → `cmd /C` vs `sh -c`。`open_terminal()` 三平台分别处理：macOS `osascript` → iTerm2/Terminal.app，Linux `gnome-terminal`/`xterm`，Windows `cmd /k`。✅ |
| **PTY 会话** | `src-tauri/src/pty/session.rs:29-39` | 使用 `portable-pty` crate，已 `cfg!(windows)` → `powershell.exe` vs `$SHELL`。ConPTY 由 portable-pty 内部处理。✅ |
| **PTY 命令** | `src-tauri/src/commands/pty.rs:24-32` | `pty_spawn()` 回退逻辑：`$SHELL` → Windows `powershell.exe` → `/bin/sh`。✅ |
| **编码检测** | `src-tauri/src/encoding/detect.rs` | `encoding_rs::Encoding::for_bom()` + `chardetng` 纯 Rust 统计检测，平台无关。✅ |
| **编码转换** | `src-tauri/src/encoding/convert.rs` | `encoding_rs` 纯 Rust，43 种编码，BOM 处理平台无关。✅ |
| **换行符 (EOL)** | `src/stores/settingsStore.ts:38` | 已有 `defaultEol` 设置 (LF/CRLF/CR)，编辑操作使用 Monaco `model.getEOL()`。✅ |
| **搜索** | `src-tauri/src/search/` | `regex` + `walkdir` 纯 Rust，平台无关。✅ |
| **文件监控** | `src-tauri/src/commands/monitor.rs` | `notify` crate 跨平台。✅ |

##### ⚠️ 实际发现的问题

| 问题 | 位置 | 严重度 | 说明 |
|------|------|:---:|------|
| **`test:check` 脚本 bug** | `package.json` | 🔴 需修 | `cargo check` 在项目根目录运行，但 `Cargo.toml` 在 `src-tauri/`。CI 需加 `--manifest-path src-tauri/Cargo.toml`。 |
| **`rustup` 无 Linux/Windows target** | 本地 | 🟡 已知 | 仅装了 macOS targets。CI runner 各自装各自 target，不影响 CI。本地交叉编译需 `rustup target add`。 |
| **`windows_subsystem` 属性** | `src-tauri/src/main.rs:2` | 🟢 正常 | 标准 Tauri 模板，仅 Windows release build 生效。无需修改。 |

##### ❓ 无法本地验证的项（需 CI 揭晓）

| 项目 | 风险 | 说明 |
|------|:---:|------|
| **Linux WebKitGTK 依赖** | 中 | `libwebkit2gtk-4.1-dev` 等 4 个系统包版本可能与 Tauri v2 要求不完全匹配 |
| **AppImage `libfuse2`** | 低 | Ubuntu 24.04 默认用 fuse3，AppImage 运行时需 fuse2。构建 CI 不受影响，但用户运行需提示 |
| **macOS Intel 交叉编译** | 低 | CI `macos-latest` 是 ARM runner，交叉编译 `x86_64-apple-darwin` 需验证 |
| **Windows `cmd` stdout 编码** | 极低 | `from_utf8_lossy` 在 Windows 默认 code page 下可能产生乱码 |
| **Monaco 字体回退** | 极低 | 三平台 Chromium 字体回退行为一致，CJK/阿拉伯/RTL 可能有细微差异 |

##### 平台条件编译块分布（全部合理）

```
src-tauri/src/main.rs:2       #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
src-tauri/src/pty/session.rs:29   cfg!(target_os = "windows")  → shell 选择
src-tauri/src/commands/pt
src-tauri/src/commands/system.rs:10  #[cfg(target_os = "macos")]   → macOS open_terminal
src-tauri/src/commands/system.rs:58  #[cfg(target_os = "linux")]   → Linux open_terminal
src-tauri/src/commands/system.rs:68  #[cfg(target_os = "windows")] → Windows open_terminal
src-tauri/src/commands/system.rs:80  cfg!(target_os = "windows")   → run_command shell 选择
```

#### 16.3 目标和范围

1. **PR CI 矩阵** — 每 push 自动在 `ubuntu-latest` 跑 tsc + vitest + Rust check，在 `macos/windows/ubuntu` 三平台跑 E2E
2. **Release 自动化** — tag push → 构建 4 target + DMG/NSIS/AppImage → GitHub Release draft
3. **README badge** — CI 状态徽章显示 "passing"
4. **纯 CI** — 无本地虚拟机，push → 看日志 → 修

#### 16.4 实施步骤

##### Step 0 — 修复已知问题 (10 分钟)

修复 `package.json` 中的 `test:check` 脚本（`cargo check` 需要指定 manifest 路径）：

```diff
- "test:check": "npx tsc --noEmit && cargo check",
+ "test:check": "npx tsc --noEmit && cargo check --manifest-path src-tauri/Cargo.toml",
```

并新增本地 CI 一键命令：
```json
"ci": "npm run test:check && npm run test:unit && npm run test:e2e"
```

##### Step 1 — CI 矩阵：check + E2E 三平台 (1 天)

创建 `.github/workflows/ci.yml`：

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # ── Phase 1: 快速检查 (单平台, ~2 min) ──
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run test:unit
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo check --manifest-path src-tauri/Cargo.toml

  # ── Phase 2: 三平台 E2E (mock IPC, 并行 ~3 min) ──
  e2e:
    needs: check
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
      fail-fast: false      # 一个平台挂不取消其他
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - name: Install Playwright Chromium
        run: npx playwright install chromium
      - name: Run E2E (mock IPC, no Rust needed)
        run: npm run test:e2e
```

**为什么 E2E job 不需要装 Rust / WebView 库**：`e2e/mocks/tauri-mock.ts` 通过 `page.route()` 拦截了全部 `@tauri-apps/*` 导入，mock 了 55 个 IPC 命令 + window/dialog/plugin APIs。Playwright 启动的是 headless Chromium + Vite dev server，完全不加载 Tauri native 层。三平台 E2E 行为完全一致。

**fail-fast: false**：避免 macOS E2E 挂了就取消 Windows/Linux，方便一次 push 看到全部平台的失败信息。

##### Step 2 — Release 流水线 (0.5 天)

创建 `.github/workflows/release.yml`：

```yaml
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  build:
    strategy:
      matrix:
        include:
          - { os: macos-latest,   target: aarch64-apple-darwin,      artifact: macos-arm64 }
          - { os: macos-latest,   target: x86_64-apple-darwin,       artifact: macos-x64 }
          - { os: windows-latest, target: x86_64-pc-windows-msvc,    artifact: windows-x64 }
          - { os: ubuntu-latest,  target: x86_64-unknown-linux-gnu,  artifact: linux-x64 }
      fail-fast: false
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci

      - uses: dtolnay/rust-toolchain@stable
        with: { targets: "${{ matrix.target }}" }

      - name: Install Tauri Linux deps
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
            libayatana-appindicator3-dev librsvg2-dev \
            libjavascriptcoregtk-4.1-dev libsoup-3.0-dev

      - name: Build
        run: npm run tauri build -- --target ${{ matrix.target }}

      - name: Upload bundle
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.artifact }}
          path: |
            src-tauri/target/${{ matrix.target }}/release/bundle/dmg/*.dmg
            src-tauri/target/${{ matrix.target }}/release/bundle/nsis/*.exe
            src-tauri/target/${{ matrix.target }}/release/bundle/appimage/*.AppImage
          if-no-files-found: ignore

  publish:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/download-artifact@v4
        with: { path: artifacts }
      - run: ls -R artifacts/
      - uses: softprops/action-gh-release@v2
        with:
          draft: true
          generate_release_notes: true
          body: |
            **Linux users**: Ubuntu 24.04+ may need `sudo apt install libfuse2` to run the AppImage.
          files: artifacts/**/*
```

**Linux 用户提示**：Release body 中自动附加 `libfuse2` 安装提示。如果 `generate_release_notes: true` 和自定义 `body` 不能同时用，改用 `append_body: true` 或写到 Release description 中。

##### Step 3 — README Badge (5 分钟)

```markdown
[![CI](https://github.com/luliang/rip-notepad-plus-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/luliang/rip-notepad-plus-plus/actions/workflows/ci.yml)
```

##### Step 4 — Bug 修复 (CI 反馈驱动，0-1 天)

代码审计已确认核心模块（路径/Shell/PTY/编码/EOL）均已做好跨平台适配。**预计不会有大 bug。** 策略：CI 跑起来，哪个平台报错修哪个，不提前修没有报错的东西。

可能遇到的小修小补（概率排序）：

| 可能问题 | 触发平台 | 概率 | 现象 | 修复 |
|----------|:---:|:---:|------|------|
| Linux WebKitGTK 版本差异 | Ubuntu | 中 | `cargo check` 或 `tauri build` 失败，找不到头文件 | pin 依赖版本或调整 apt 安装列表 |
| macOS Intel 交叉编译 | macOS ARM runner | 低 | `x86_64-apple-darwin` 链接失败 | `rustup target add` 或改用 `macos-13` runner (Intel) |
| Windows stdout 编码 | Windows | 极低 | `run_command` 中文输出乱码 | 切换到 `chcp 65001` (UTF-8 code page) |
| `find_in_files` 路径分隔符 | Windows | 极低 | 搜索结果路径显示 `\` | 前端归一化为 `/` |
| AppImage 运行问题 | Linux | — | 构建成功但用户无法运行 | ✅ 已确认：Release body 加 `apt install libfuse2` 提示 |

##### Step 5 — (远期) 签名 & 公证

- **macOS 公证**: 需要 Apple Developer Program ($99/年) + `notarytool`
- **Windows 代码签名**: 需要 OV/EV Code Signing Certificate ($200-300/年)
- **当前跳过**：GitHub Release binary 走"开发者未签名"路径。macOS 用户右键打开，Windows 用户忽略 SmartScreen。

#### 16.5 文件清单

```
新增:
├── .github/workflows/ci.yml           # PR CI: check + e2e (三平台)
├── .github/workflows/release.yml      # tag CI: 构建 4 target + Release draft

修改:
├── package.json                        # test:check 修复 + 新增 ci 命令
└── README.md                           # CI badge
```

#### 16.6 时间估算

| 步骤 | 内容 | 时间 |
|:---:|------|:---:|
| 0 | 修复 `test:check` + 加 `ci` 脚本 | 10 分钟 |
| 1 | CI 矩阵 (check + e2e 三平台) | 1 天 |
| 2 | Release 流水线 | 0.5 天 |
| 3 | README badge | 5 分钟 |
| 4 | Bug 修复 (CI 反馈驱动) | 0-1 天 |
| 5 | 签名 & 公证 | 远期 |
| **总计** | | **1.5-2.5 天** |

#### 16.7 需用户确认（已确认 ✅）

| # | 问题 | 结论 |
|---|------|------|
| 1 | **Repo 是 public 还是 private？** | ✅ Public — GitHub Actions 全部免费无限，CI 矩阵随意跑 |
| 2 | **要不要 macOS Intel binary？** | ✅ ARM + Intel 都要，保持 4 target 矩阵 |
| 3 | **Release 构建 15-20 min 是否接受？** | ✅ 可以接受 |
| 4 | **AppImage 需 libfuse2 提醒用户？** | ✅ 提醒 |

#### 16.8 完成后验收

- [ ] `git push` → CI badge 绿色，check + e2e 三平台全过
- [ ] `git tag v0.4.0 && git push --tags` → GitHub Release draft 包含 4 个产物
- [ ] README 显示 CI badge `passing`

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
| API 调用 | Anthropic + OpenAI 双 Provider，自动检测，手动覆盖 |
| OpenAI 搜索 | DeepSeek 自动端点切换（`/v1` → `/anthropic`）复用 Anthropic 搜索 |
| 流式 SSE | `stream: true`, 逐 token 实时显示 |
| **Markdown 渲染** | `markdown-it` + `highlight.js`，完整 GFM，50ms 流式节流 |
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
| **AI 联网搜索** | 服务端 web_search_20250305 + user_location 时区本地化 + 日期注入 + OpenAI 端点自动切换 |
| **AI 多会话** | 标签页式多会话，独立历史，XML 后处理 |
| **AI Markdown 渲染** | markdown-it + highlight.js，完整 GFM，流式 50ms 节流 |
| **AI 双 Provider** | Anthropic + OpenAI 兼容 API，自动检测，provider 下拉选择 |
| **i18n 扩展** | 7 → 58 种语言，495 keys，100% 覆盖，自动 key 校验测试 |

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
| IPC 命令 | 55 |
| 对话框 | 16 |
| Store | 15 |
| Hooks | 11 |
| i18n 语言 | 70 (559 keys, 6 RTL) |
| 单元测试 | 376 (22 suites) |
| E2E 测试 | 65 (4 specs) |
| DMG 大小 | 9.1 MB (Intel) / 8.9 MB (ARM) |

---

## 优先级建议

| 优先级 | Phase | 工作量 | 前置依赖 |
|:---:|:---:|:---:|---|
| P0 | 16-跨平台测试 | 1.5-2.5天 | 纯 CI（无本地 VM） |
| P0 | 25-工具栏/输出面板 | 1-2天 | — |
| P1 | 20-主题市场 | 2-3天 | GitHub 仓库 |
| P1 | 17-插件市场 | 4-6天 | GitHub 仓库 + 种子插件 |
| P2 | 21-打印系统 | 2-3天 | — |
| P2 | 26-无障碍 | 3-4天 | 屏幕阅读器 |
| P3 | 27-云同步 | 4-5天 | OAuth API Keys |
| P4 | 28-移动端 | 8-12天 | Apple Developer + Android Studio |
| P4 | 29-协作编辑 | 7-10天 | WebSocket 服务器 + CRDT |
