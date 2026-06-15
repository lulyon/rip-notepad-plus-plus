# ripNotepad++

A cross-platform text editor — a complete replacement for Notepad++.

Built with **Tauri v2** + **Monaco Editor** + **React 19** + **TypeScript** + **Zustand** + **Vite 6**.

## Features

### File Operations
- New / Open / Save / Save As / Close / Reload / Drag-and-drop
- Multi-tab with drag-and-drop reorder
- Tab pinning (prevent close) + 5 tab colors
- Session restore + manual save/load session files
- Restore last closed file (Ctrl+Shift+T, max 20)
- Unsaved changes confirmation dialog
- Close All But Current / Close All But Pinned
- Large file warning (>50MB)
- File external change monitoring (auto-reload)
- Document snapshot (7s auto-backup for crash recovery)

### Editing
- Monaco Editor (VS Code engine) — syntax highlighting, IntelliSense
- Column/box selection (Alt+drag) — toggleable via Edit menu with ✓ indicator
- Undo / Redo / Cut / Copy / Paste / Select All / Delete line
- Duplicate line / Move line up/down / Split lines / Join lines
- Block/stream comment toggle (Ctrl+Q / Ctrl+Shift+Q)
- Trim trailing / Remove empty lines / Case conversion (upper/lower/proper/sentence/invert/random)
- Sort lines (ascending/descending) / Remove duplicate lines
- Tab to Spaces / Spaces to Tab (leading/all)
- Insert date/time / Format XML / Validate XML
- Copy file path / name / directory to clipboard
- Auto-save (30s interval)
- 75+ language highlighting via Monaco

### Search
- Find / Replace panel with regex, case sensitive, whole word, wrap around
- Find in Files (recursive directory search with regex)
- Mark All / Count occurrences / 5 mark styles with line operations
- Bookmarks (Ctrl+F2 toggle, F2 next, Shift+F2 prev)
- Bracket matching (Ctrl+B goto, Ctrl+Shift+B select)
- Go to Line (Ctrl+G)

### View
- Word wrap / Show whitespace / Indent guides / Line numbers / Minimap
- Fold All / Unfold All / Zoom in/out/reset
- Full screen (F11) / Distraction-free mode (F12)
- Window always on top
- Horizontal / Vertical split editor with sync scroll
- Sidebar with 4 panels: Files, AI Chat, Git, Symbols
- Markdown Preview (Ctrl+Shift+V) — split editor | rendered preview

### Sidebar Panels
| Panel | Description |
|-------|-------------|
| 📁 Files | File tree explorer (lazy-load, expandable directories) |
| ⎇ Git | Changed files, branch name, ahead/behind, inline diff |
| 🔣 Symbols | Function/class outline (regex-based, language-agnostic) |

### Preview System (26 types, all offline)
Open a supported file and click the 👁 button in the editor toolbar, or press `Ctrl+Shift+V`.

| Category | Types |
|------|------|
| **Documents** | Markdown (.md), HTML (.html), Jupyter (.ipynb), Word (.docx), LaTeX (.tex) |
| **Data** | CSV/TSV (table), JSON (colored tree), XML (colored), YAML (colored), Excel (.xlsx), .env (masked table), HAR (waterfall) |
| **Diagrams** | Mermaid (.mmd), Graphviz (.dot) |
| **Media** | Images (png/jpg/gif/webp/bmp/ico/tiff/avif), SVG, PDF, 3D models (stl/glb/gltf/obj), Fonts (ttf/otf/woff/woff2), Audio (mp3/wav/ogg/flac), Video (mp4/webm/mov) |
| **Dev** | Diff/Patch (green/red), SQL (colored), SQLite (table browser), ZIP (file listing), Subtitle (.srt/.vtt), GraphQL, Protobuf, TOML, INI |

### Encoding
- BOM + chardetng detection (UTF-8, GBK, Shift-JIS, EUC-JP, EUC-KR, etc.)
- 43 encodings via encoding_rs
- Convert between encodings
- Status bar encoding indicator (click to change)

### Bookmarks & Marks
- Gutter bookmarks: toggle (Ctrl+F2), navigate (F2/Shift+F2), clear all
- 5 mark styles with distinct colors
- Mark operations: mark word, unmark, inverse, clear all
- Line operations: copy/cut/paste/delete marked lines
- Navigate marks: next/prev per style

### Macro
- Record / Stop / Playback / Save macros

### Run
- Execute shell commands (cross-platform, NppExec-style console)
- Variable substitution: `$(FULL_CURRENT_PATH)`, `$(FILE_NAME)`, `$(CURRENT_WORD)`, etc.
- Error output parsing (clickable file:line links)
- Open terminal at project root (iTerm2 auto-detected, fallback to Terminal.app)
- Launch Claude (Ctrl+Alt+C) / Codex (Ctrl+Alt+X) in terminal

### Compare
- Side-by-side diff viewer (Monaco DiffEditor)
- Select any two files to compare

### Tools
- Hash generator: MD5, SHA-1, SHA-256, SHA-512 (text/file/selection → clipboard)
- Document summary: character/word/line count, encoding, cursor position

### UDL — User Defined Languages
- Custom syntax highlighting via Monarch tokenizer
- 4-tab editor (Basic / Keywords / Syntax / Preview)
- 8 keyword groups with color pickers, comment/delimiter/operator config
- Import .tmLanguage.json (TextMate grammar → Monarch converter)

### Git Integration
- Sidebar Git tab: changed files, branch name, ahead/behind, stage/unstage checkboxes
- Stage All / Commit (dialog with file list) / Push / Pull
- Branch management (list / switch / create), status bar branch click popup
- Inline diff viewer

### Plugin System
- Sidecar process architecture (language-agnostic)
- JSON-RPC 2.0 protocol over stdin/stdout
- Plugin discovery via `plugins/<name>/plugin.json` manifests
- Start / Stop / Manage plugins from UI
- Editor API: getActiveFile, getContent, getSelection, getCursor, getEncoding, getFileName, getTabCount
- Event notifications: fileOpened, fileSaved, fileClosed

### AI Assistant (Sidebar)
- 🤖 AI tab in sidebar — DeepSeek API (Anthropic-compatible)
- Streaming chat with real-time token display
- Extended thinking process display (collapsible, real-time)
- Auto-detect config from `~/.claude/settings.json`
- Quick actions: Explain Code / Refactor / Generate Tests / Fix Bugs
- Context injection: auto-attach active file + language
- Conversation history persisted to localStorage

### Workspace
- Save / Open `.ripworkspace` files — multi-project roots
- Sidebar multi-root Files panel (+ Add Folder / × Remove)
- Recent workspaces list (max 10)
- Auto-detect root from active tab when no workspace

### External Tools
- Configure custom tools (name, command, working dir, shortcut)
- 11 variable substitutions: `$(FULL_CURRENT_PATH)`, `$(FILE_NAME)`, etc.
- Tools → Configure External Tools... / Execute

### Change History
- Track modified lines per tab
- Go to Previous / Next Change (Ctrl+Shift+↑/↓)
- Search → Clear Change History
- Theme (Dark / Light / High Contrast)
- Font family, size, tab size, indent style
- Default encoding, language, EOL
- Show/hide menu bar, status bar, sidebar
- Custom keyboard shortcut mapping
- Custom editor context menu (add/remove/reorder items)
- Language: 中文 / English / 日本語 / 한국어 / Français / العربية / עברית

### Auto Update
- Automatic update check via tauri-plugin-updater
- Manual check: Help → Check for Updates
- Configurable auto-check toggle in Preferences

### RTL Support
- Arabic (العربية) and Hebrew (עברית) with automatic RTL layout mirroring
- Monaco bidiSupport for right-to-left text editing

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Rust](https://www.rust-lang.org/) >= 1.70
- macOS: Xcode Command Line Tools
- Windows: Microsoft Visual Studio C++ Build Tools
- Linux: `libgtk-3-dev` `libwebkit2gtk-4.1-dev`

### Development

```bash
npm install              # Install dependencies
npm run tauri dev        # Dev mode (Tauri desktop + Vite HMR)
npm run dev              # Frontend only (browser, no Rust backend)
lsof -ti :1420 | xargs kill  # Fix port conflict

npm run tauri build                    # Production build (native arch)
npm run tauri build -- --target aarch64-apple-darwin  # Apple Silicon
npm run tauri build -- --target x86_64-apple-darwin   # Intel Mac

npx tsc --noEmit         # TypeScript check
cargo check              # Rust check (from src-tauri/)
```

## Architecture

```
┌─ WebView (React + Monaco + i18n) ───────────────────────┐
│  MenuBar │ TabBar │ Sidebar │ SplitEditor │ StatusBar   │
│  SearchPanel │ 14 Dialogs                                │
│  14 Zustand stores                                       │
├─ Tauri IPC (41 commands) ───────────────────────────────┤
├─ Rust Backend ──────────────────────────────────────────┤
│  file_ops / encoding / search / session / system /       │
│  plugin / git / monitor / workspace                      │
│  plugin_api (sidecar manager, JSON-RPC 2.0)             │
└─────────────────────────────────────────────────────────┘
         │ stdin/stdout (JSON-RPC 2.0)
         ▼
┌─ Plugin Process (Python / Node / Rust / any) ───────────┐
```

```
rip-notepad-plus-plus/
├── src/                          # Frontend (React + TS)
│   ├── components/
│   │   ├── Editor/               # Monaco wrapper + split + context menu
│   │   ├── MenuBar/              # Custom HTML menu (12 menus)
│   │   ├── TabBar/               # Drag-and-drop tabs + pin/colors
│   │   ├── SearchPanel/          # Find/replace/find-in-files
│   │   ├── StatusBar/            # Encoding, language, Ln/Col, branch
│   │   ├── Panels/               # 4 sidebar panels + preview components
│   │   └── Dialogs/              # 15 dialogs
│   ├── stores/                   # 14 Zustand stores
│   ├── hooks/                    # 14 custom hooks
│   ├── i18n/                     # 7 locales (zh/en/ja/ko/fr/ar/he)
│   ├── lib/                      # IPC, utils, constants, preview engine
│   └── types/                    # TypeScript interfaces
├── src-tauri/                    # Backend (Rust)
│   └── src/
│       ├── commands/             # 8 modules, 41 commands
│       ├── encoding/             # detect + convert
│       ├── search/               # regex + walkdir
│       ├── plugin_api/           # sidecar manager
│       └── models.rs             # shared types
├── plugins/                      # Plugin directory
├── e2e/                          # 70 E2E tests (Playwright)
├── tests/                        # 308 unit tests (vitest)
├── test-files/                   # 39 preview test files
├── docs/                         # Roadmap documents
└── package.json
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` / `Ctrl+O` / `Ctrl+S` | New / Open / Save |
| `Ctrl+Shift+S` / `Ctrl+W` | Save As / Close tab |
| `Ctrl+Shift+O` | Open folder |
| `Ctrl+Shift+T` | Restore last closed file |
| `Ctrl+F` / `Ctrl+H` | Find / Replace |
| `Ctrl+G` | Go to line |
| `Ctrl+D` / `Ctrl+L` | Duplicate / Delete line |
| `Ctrl+Q` / `Ctrl+Shift+Q` | Comment toggle / Block comment |
| `Ctrl+B` / `Ctrl+Shift+B` | Goto matching brace / Select braces |
| `Ctrl+F2` / `F2` / `Shift+F2` | Toggle bookmark / Next / Prev |
| `Ctrl+Shift+V` | Toggle Markdown preview |
| `Ctrl+Shift+P` | Command palette |
| `F12` | Distraction-free mode |
| `F11` | Full screen |
| `Ctrl+Alt+C` / `Ctrl+Alt+X` | Launch Claude / Codex |
| `Ctrl+Alt+C` / `Ctrl+Alt+X` | Launch Claude / Codex in terminal |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / Previous tab |
| `F3` / `Shift+F3` | Find next / previous |

## Testing

```bash
npm test              # Run all tests
npm run test:unit     # 308 vitest unit tests (18 suites)
npm run test:e2e      # 70 Playwright E2E tests
npm run test:check    # TypeScript + Rust compile checks
```

- **18 test suites, 308 unit tests** covering stores, hooks, and preview engine (all 26 types)
- **70 E2E tests** across 4 spec files with mocked Tauri IPC
- Headless Chromium, auto-starts Vite dev server

## License

MIT
