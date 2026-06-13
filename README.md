# ripNotepad++

A cross-platform text editor — a complete replacement for Notepad++.

Built with **Tauri v2** + **Monaco Editor** + **React 19** + **TypeScript** + **Zustand** + **Vite 6**.

## Features

### File Operations
- New / Open / Save / Save As / Close / Reload / Drag-and-drop
- Multi-tab with drag-and-drop reorder
- Session restore (reopen last files on startup)
- Large file warning (>50MB)

### Editing
- Monaco Editor (VS Code engine) — syntax highlighting, IntelliSense
- Undo / Redo / Cut / Copy / Paste / Select All
- Duplicate line / Delete line / Move line up/down
- Trim trailing whitespace / Remove empty lines / Case conversion
- Column/box selection (Alt+drag)
- Sort lines (ascending/descending) / Remove duplicate lines
- Insert date/time
- Copy file path / name / directory to clipboard
- Auto-save (30s interval for modified files with paths)
- Emmet abbreviation expansion (HTML/CSS/JSX/TSX)
- Format / Validate XML
- 60+ language highlighting

### Search
- Find / Replace panel with regex, case sensitive, whole word, wrap around
- Find in Files (recursive directory search with regex)
- Mark All / Count occurrences
- Go to Line (Ctrl+G)
- Command Palette (Ctrl+Shift+P) — fuzzy search all 80+ menu commands

### View
- Word wrap / Show whitespace / Indent guides / Line numbers / Minimap
- Fold All / Unfold All
- Zoom in/out/reset
- Full screen (F11)
- Window always on top
- Horizontal / Vertical split editor with sync scroll
- Sidebar with 7 panels: Files, DocList, Clipboard History, JSON Viewer, Task List, Git, Symbols

### Sidebar Panels
| Panel | Description |
|-------|-------------|
| 📁 Files | File tree explorer (fixed project root or follow active tab) |
| 📋 DocList | Open documents list (click to switch, × to close) |
| 📄 Clipboard | Clipboard history (auto-capture, search, pin, paste) |
| {} JSON | JSON tree viewer (expand/collapse, click path to copy) |
| ✅ TaskList | TODO / FIXME / HACK / XXX / NOTE scanner |
| ⎇ Git | Changed files, branch, inline diff |
| 🔣 Symbols | Function/class outline (regex-based, language-agnostic) |

### Encoding
- BOM + chardetng detection (UTF-8, GBK, Shift-JIS, EUC-JP, EUC-KR, etc.)
- 60+ encodings via encoding_rs
- Convert between encodings
- Status bar encoding indicator (click to change)

### Macro
- Record / Stop / Playback / Save macros

### Run
- Execute shell commands (cross-platform, NppExec-style console)
- Variable substitution: `$(FULL_CURRENT_PATH)`, `$(FILE_NAME)`, `$(CURRENT_WORD)`, etc.
- Error output parsing (clickable file:line links)
- Open terminal at project root
- Launch Claude / Codex in terminal

### Compare
- Side-by-side diff viewer (Monaco DiffEditor)
- Select any two files to compare

### Workspace / Project
- Open folder as project (File → Open Folder / Ctrl+Shift+O)
- Sidebar file tree with fixed project root
- Drag folder to window to set as project root
- Session auto-save/restore (tabs, project root, sidebar state)

### Git Integration
- Sidebar Git tab: changed files, branch name, ahead/behind
- Inline diff viewer
- Status bar branch indicator

### Plugin System
- Sidecar process architecture (language-agnostic)
- JSON-RPC 2.0 protocol over stdin/stdout
- Plugin discovery via `plugins/<name>/plugin.json` manifests
- Start / Stop / Manage plugins from UI
- Editor API: getActiveFile, getContent, getSelection, getCursor, getEncoding, getFileName, getTabCount
- Event notifications: fileOpened, fileSaved, fileClosed
- Sample Python plugin included

### Settings
- Theme (Dark / Light / High Contrast)
- Font family, size, tab size, indent style
- Default encoding, language, EOL
- Show/hide menu bar, status bar, sidebar
- Custom keyboard shortcut mapping
- Language switcher (中文 / English)

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Rust](https://www.rust-lang.org/) >= 1.70
- macOS: Xcode Command Line Tools
- Windows: Microsoft Visual Studio C++ Build Tools
- Linux: `libgtk-3-dev` `libwebkit2gtk-4.1-dev`

### Development

```bash
# Install dependencies
npm install

# Start dev mode (Tauri desktop window + Vite HMR)
npm run tauri dev

# Frontend only (browser, no Rust backend)
npm run dev

# Port conflict? Kill the old process
lsof -ti :1420 | xargs kill

# Build for production
npm run tauri build

# Type check
npx tsc --noEmit      # TypeScript
cargo check            # Rust (from src-tauri/)
```

## Architecture

```
┌─ WebView (React + Monaco + i18n) ───────────────────────┐
│  MenuBar │ TabBar │ Sidebar │ SplitEditor │ StatusBar   │
│  SearchPanel │ 10 Dialogs                                │
│  9 Zustand stores                                        │
├─ Tauri IPC (30 commands) ───────────────────────────────┤
├─ Rust Backend ──────────────────────────────────────────┤
│  file_ops / encoding / search / session / system /       │
│  plugin / git                                            │
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
│   │   ├── Editor/               # Monaco wrapper + split
│   │   ├── MenuBar/              # Custom HTML menu (11 menus)
│   │   ├── TabBar/               # Drag-and-drop tabs
│   │   ├── SearchPanel/          # Find/replace/find-in-files
│   │   ├── StatusBar/            # Encoding, language, Ln/Col, branch
│   │   ├── Panels/               # 7 sidebar panels
│   │   └── Dialogs/              # 10 dialogs
│   ├── stores/                   # 9 Zustand stores
│   ├── hooks/                    # 8 custom hooks
│   ├── i18n/                     # zh / en locales
│   ├── lib/                      # IPC, utils, constants
│   └── types/                    # TypeScript interfaces
├── src-tauri/                    # Backend (Rust)
│   └── src/
│       ├── commands/             # 7 modules, 30 commands
│       ├── encoding/             # detect + convert
│       ├── search/               # regex + walkdir
│       ├── plugin_api/           # sidecar manager
│       └── models.rs             # shared types
├── plugins/                      # Plugin directory
│   └── sample-hello/             # Sample Python plugin
├── e2e/                          # 48 E2E tests (Playwright)
├── CLAUDE.md                     # AI development guide
└── package.json
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+Shift+O` | Open folder |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+W` | Close tab |
| `Ctrl+P` | Print |
| `Ctrl+F` | Find |
| `Ctrl+H` | Replace |
| `Ctrl+G` | Go to line |
| `Ctrl+D` | Duplicate line |
| `Ctrl+L` | Delete line |
| `Ctrl+Shift+Up` | Move line up |
| `Ctrl+Shift+Down` | Move line down |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `F11` | Full screen |
| `F3` | Find next |
| `Shift+F3` | Find previous |

## Testing

```bash
npm run test:e2e      # 48 Playwright tests (UI + compile checks)
npm run test:check    # TypeScript + Rust compile checks only
```

- 46 UI tests: menus, dialogs, tab operations, sidebar, i18n, search, clipboard, JSON, task list, command palette, compare
- 2 compile checks: `cargo check` and `npx tsc --noEmit`
- Headless Chromium with mocked Tauri IPC
- Auto-starts Vite dev server

## License

MIT
