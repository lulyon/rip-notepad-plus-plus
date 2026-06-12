# ripNotepad++ — AI Development Guide

## Project Identity

A cross-platform text editor replacing Notepad++. Built on **Tauri v2** (Rust backend) + **Monaco Editor** (VS Code's editor engine) + **React 19** + **TypeScript** + **Vite 6**.

- **Product name**: ripNotepad++
- **Identifier**: `com.ripnotepad.plusplus`
- **Target**: Windows, macOS, Linux
- **Node**: >= 20
- **Rust**: >= 1.70 (edition 2021)

## Architecture

```
┌─ WebView (React + Monaco) ──────┐
│  TabBar  │  Editor  │  StatusBar │
│  Zustand stores (editor state)   │
├──────────────────────────────────┤
│  Tauri IPC (invoke / commands)   │
├─ Rust Backend ───────────────────┤
│  File I/O │ Encoding │ Plugins   │
└──────────────────────────────────┘
```

### Key Files

| Path | Role |
|------|------|
| `src/App.tsx` | Root layout: TabBar + Editor + StatusBar |
| `src/stores/editorStore.ts` | Zustand store: tabs, active tab, content, language |
| `src/components/Editor/Editor.tsx` | Monaco Editor wrapper with keyboard shortcuts |
| `src/components/TabBar/TabBar.tsx` | Tab strip with close/new buttons |
| `src/components/StatusBar/StatusBar.tsx` | Status display (modified, language, encoding, cursor) |
| `src-tauri/src/lib.rs` | Tauri commands (greet, detect_encoding) |
| `src-tauri/tauri.conf.json` | Window config, bundle settings, CSP |
| `src-tauri/capabilities/default.json` | Permissions: dialog, fs, shell |

### State Management

- **Zustand** (`editorStore.ts`) manages all editor state
- Each tab: `{ id, path, name, content, encoding, modified, language }`
- `activeTabId` determines which tab's content renders in Monaco
- Monaco uses `key={tab.id}` to remount on tab switch

### Commands (Rust → Frontend)

| Command | Purpose |
|---------|---------|
| `greet(name)` | Sanity check |
| `detect_encoding(bytes)` | Detect file encoding via `encoding_rs` |

## Conventions

- **Components**: One folder per component, `.tsx` + `.css` co-located
- **Styling**: CSS custom properties (`--bg-primary`, etc.) for theming
- **State**: All editor state in `editorStore`, no prop drilling
- **Naming**: PascalCase components, camelCase functions/variables, kebab-case CSS classes
- **Monaco**: Use `@monaco-editor/react` wrapper, not raw `monaco-editor`

## Dev Commands

```bash
npm install              # Install all deps
npm run tauri dev        # Dev mode with HMR
npm run tauri build      # Production build
npm run tauri icon ./path/to/icon.png  # Generate icons
cargo check              # Check Rust code (from src-tauri/)
```

## Next Priorities

1. File open/save via Tauri dialog + fs plugins
2. Encoding detection & conversion (GBK, Shift-JIS, etc.)
3. Find & replace panel
4. Keyboard shortcut system (Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+W, etc.)
5. Recent files list
6. Window title sync with active file
