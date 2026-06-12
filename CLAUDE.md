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
┌─ WebView (React + Monaco) ───────────┐
│  TabBar  │  Editor  │  StatusBar       │
│  Zustand stores (editor state)         │
├────────────────────────────────────────┤
│  Tauri IPC (src/lib/ipc.ts)            │
├─ Rust Backend ─────────────────────────┤
│  commands/ (file_ops, encoding, search, │
│             session, system)           │
│  encoding/ (detect, convert)           │
│  search/  (finder)                     │
└────────────────────────────────────────┘
```

## Key Files

| Path | Role |
|------|------|
| `src/App.tsx` | Root: hooks + TabBar + Editor + StatusBar |
| `src/stores/editorStore.ts` | Zustand: tabs[], activeTabId, secondaryTabId, 15 actions |
| `src/components/Editor/Editor.tsx` | Monaco Editor + cursor tracking + all keyboard actions |
| `src/components/TabBar/TabBar.tsx` | Tab strip + right-click context menu |
| `src/components/TabBar/TabContextMenu.tsx` | Close/Close Others/Close All/Copy Path |
| `src/components/StatusBar/StatusBar.tsx` | File name, language, encoding, Ln/Col |
| `src/components/Dialogs/UnsavedChangesDialog.tsx` | Save/Discard/Cancel prompt |
| `src/hooks/useMonacoActions.ts` | Ctrl+S/N/O/W/F/H/G + save/open/new/close IPC |
| `src/hooks/useWindowTitle.ts` | Sync window title with active tab |
| `src/hooks/useFileDrop.ts` | Drag-and-drop file opening |
| `src/hooks/useKeyboardShortcuts.ts` | Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+PageUp/Down |
| `src/lib/ipc.ts` | Typed invoke() wrapper for all Rust commands |
| `src/lib/constants.ts` | 60+ language extension→Monaco ID mappings |
| `src/lib/fileUtils.ts` | Path utils, binary detection, size formatting |
| `src-tauri/src/lib.rs` | Command registration (18 commands) |
| `src-tauri/src/models.rs` | Shared serializable structs |
| `src-tauri/src/commands/` | file_ops, encoding, search, session, system |
| `src-tauri/src/encoding/` | detect (BOM+chardetng), convert (encoding_rs 60+) |
| `src-tauri/src/search/` | finder (regex+walkdir grep) |

## IPC Commands (Rust → TS)

| Command | Signature | Purpose |
|---------|-----------|---------|
| `read_file` | `(path, encoding?) → FileReadResult` | Read file with encoding detection |
| `write_file` | `(path, content, encoding)` | Write file with encoding |
| `delete_file` | `(path)` | Delete a file |
| `rename_file` | `(old_path, new_path)` | Rename a file |
| `file_exists` | `(path) → bool` | Check file existence |
| `get_file_size` | `(path) → u64` | Get file size in bytes |
| `detect_encoding` | `(data: Vec<u8>) → String` | Detect encoding from bytes |
| `convert_encoding_command` | `(req) → Vec<u8>` | Convert between encodings |
| `list_encodings` | `() → Vec<EncodingInfo>` | List 60+ supported encodings |
| `decode_with_encoding` | `(data, name) → String` | Decode bytes using named encoding |
| `encode_with_encoding` | `(content, name) → Vec<u8>` | Encode string using named encoding |
| `find_in_files` | `(params) → Vec<SearchMatch>` | Recursive file search |
| `save_session` | `(session)` | Save session to JSON |
| `load_session` | `() → Option<SessionData>` | Load last session |
| `clear_session` | `(）`| Delete saved session |
| `open_in_browser` | `(url)` | Open URL in default browser |
| `get_system_info` | `() → SystemInfo` | Get platform + locale |

## Keyboard Shortcuts

| Shortcut | Action | Layer |
|----------|--------|-------|
| Ctrl+N | New file | Monaco |
| Ctrl+O | Open file (dialog) | Monaco |
| Ctrl+S | Save (Save As if new) | Monaco |
| Ctrl+Shift+S | Save As (dialog) | Monaco |
| Ctrl+W | Close tab | Monaco |
| Ctrl+F | Toggle find panel | Monaco |
| Ctrl+H | Toggle replace panel | Monaco |
| Ctrl+G | Go to line | Monaco |
| Ctrl+Tab | Next tab | Global |
| Ctrl+Shift+Tab | Previous tab | Global |
| Ctrl+PageUp | Previous tab | Global |
| Ctrl+PageDown | Next tab | Global |

## State Management

- **Zustand** (`editorStore.ts`): tabs[], activeTabId, secondaryTabId, 15 actions
- Each tab: `{ id, path, name, content, encoding, modified, language, cursorLine, cursorColumn }`
- Monaco uses `key={tab.id}` to remount on tab switch
- All state mutations through store actions; no prop drilling

## Conventions

- One folder per component, `.tsx` + `.css` co-located
- CSS custom properties (`--bg-primary`, etc.) in `styles.css`
- PascalCase components, camelCase functions, kebab-case CSS classes
- `useEditorStore.getState()` for accessing store in non-React contexts (callbacks)
- Tauri IPC calls go through `src/lib/ipc.ts` only

## Rust Crates

| Crate | Version | Purpose |
|-------|---------|---------|
| tauri | 2 | Desktop framework |
| encoding_rs | 0.8 | Character encoding (60+ encodings) |
| chardetng | 0.1 | Statistical charset detection (non-BOM) |
| walkdir | 2 | Recursive directory walking |
| regex | 1 | Pattern matching |
| open | 5 | Open URLs in browser |
| sys-locale | 0.3 | System locale detection |

## Dev Commands

```bash
npm install              # Install all deps
npm run tauri dev        # Dev mode with HMR
npm run tauri build      # Production build
npx tsc --noEmit         # TypeScript check (from root)
cargo check              # Rust check (from src-tauri/)
git commit -m "..."      # Commit
```

## Next Priorities (Phase 2)

1. SearchPanel component (find/replace UI, wired to Monaco via editor ref)
2. FindInFilesPanel (results tree, click-to-navigate)
3. EncodingDialog (encoding picker for open/convert)
4. searchStore + encodingStore (Zustand stores)
5. StatusBar encoding label click → encoding dialog
