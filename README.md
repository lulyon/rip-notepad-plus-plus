# ripNotepad++

A cross-platform text editor — a complete replacement for Notepad++.

Built with **Tauri v2** + **Monaco Editor** + **React 19** + **TypeScript** + **Zustand** + **Vite 6**.

## Features

### File Operations
- New / Open / Save / Save As / Close / Reload / Drag-and-drop
- Multi-tab with drag-and-drop reorder
- Session restore (reopen last files)
- Recent files list
- Large file warning (>50MB)

### Editing
- Monaco Editor (VS Code engine) — syntax highlighting, IntelliSense
- Undo / Redo / Cut / Copy / Paste / Select All
- Duplicate line / Delete line / Move line up/down
- Trim trailing whitespace / Remove empty lines / Case conversion
- Column/box selection (Alt+drag)
- 60+ language highlighting

### Search
- Find / Replace panel with regex, case sensitive, whole word, wrap around
- Find in Files (recursive directory search with regex)
- Mark All / Count occurrences
- Go to Line (Ctrl+G)

### View
- Word wrap / Show whitespace / Indent guides / Line numbers / Minimap
- Fold All / Unfold All
- Zoom in/out/reset
- Full screen (F11)
- Window always on top
- Horizontal / Vertical split editor with sync scroll
- Sidebar (file tree explorer + document symbols)

### Encoding
- BOM + chardetng detection (UTF-8, GBK, Shift-JIS, EUC-JP, EUC-KR, etc.)
- 60+ encodings via encoding_rs
- Convert between encodings
- Status bar encoding indicator (click to change)

### Macro
- Record / Stop / Playback / Save macros

### Run
- Execute shell commands (cross-platform)
- Open in browser (HTML files)

### Workspace / Project
- Open folder as project (File → Open Folder / Ctrl+Shift+O)
- Sidebar file tree with fixed project root
- Drag folder to window to set as project root
- Session auto-save/restore (tabs, project root, sidebar state)

### Git Integration
- Sidebar Git tab: changed files, branch name, ahead/behind
- Inline diff viewer (click diff button on any changed file)
- Status bar branch indicator
- Works with any Git repository

### Plugin System
- Sidecar process architecture (language-agnostic)
- JSON-RPC 2.0 protocol over stdin/stdout
- Plugin discovery via `plugins/<name>/plugin.json` manifests
- Start / Stop / Manage plugins from UI
- Editor API: getActiveFile, getContent, getSelection
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
│  SearchPanel │ 9 Dialogs                                 │
│  8 Zustand stores                                        │
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
│   │   ├── StatusBar/            # Encoding, language, Ln/Col
│   │   ├── Panels/               # Sidebar (files + symbols)
│   │   └── Dialogs/              # 9 dialogs
│   ├── stores/                   # 7 Zustand stores
│   ├── hooks/                    # 6 custom hooks
│   ├── i18n/                     # zh / en locales
│   ├── lib/                      # IPC, utils, constants
│   └── types/                    # TypeScript interfaces
├── src-tauri/                    # Backend (Rust)
│   └── src/
│       ├── commands/             # 6 modules, 24 commands
│       ├── encoding/             # detect + convert
│       ├── search/               # regex + walkdir
│       ├── plugin_api/           # sidecar manager
│       └── models.rs             # shared types
├── plugins/                      # Plugin directory
│   └── sample-hello/             # Sample Python plugin
├── CLAUDE.md                     # AI development guide
└── package.json
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
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
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `F11` | Full screen |
| `F3` | Find next |
| `Shift+F3` | Find previous |

## Testing

```bash
npm run test:e2e      # 32 Playwright tests (UI + compile checks)
npm run test:check    # TypeScript + Rust compile checks only
```

- 30 UI tests: menu items, dialogs, tab operations, sidebar, i18n, search, language
- 2 compile checks: `cargo check` and `npx tsc --noEmit`
- Headless Chromium with mocked Tauri IPC
- `npm run test:e2e` auto-starts Vite dev server

## License

MIT
