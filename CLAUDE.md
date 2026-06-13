# ripNotepad++ — AI Development Guide

## Project Identity

A cross-platform text editor replacing Notepad++. Built on **Tauri v2** (Rust backend) + **Monaco Editor** (VS Code's editor engine) + **React 19** + **TypeScript** + **Vite 6**.

- **Product name**: ripNotepad++
- **Identifier**: `com.ripnotepad.plusplus`
- **Target**: Windows, macOS, Linux
- **Node**: >= 20
- **Rust**: >= 1.70 (edition 2021)
- **Version**: 0.3.0 (10 phases complete)
- **Tests**: 32 E2E (Playwright + mocked Tauri IPC)
- **IPC Commands**: 30 (file_ops, encoding, search, session, system, plugin, git)

## Architecture

```
┌─ WebView (React + Monaco + i18n) ───────────────────────────┐
│  MenuBar │ TabBar(drag) │ Sidebar │ SplitEditor │ StatusBar │
│  SearchPanel(overlay) │ Dialogs(portals)                     │
│  Zustand stores: editor / search / settings / macro /        │
│  encoding / plugin                                           │
├─ Tauri IPC (src/lib/ipc.ts) ────────────────────────────────┤
├─ Rust Backend ──────────────────────────────────────────────┤
│  commands/ (file_ops, encoding, search, session, system,     │
│             plugin, git)                                      │
│  encoding/ (detect BOM+chardetng, convert encoding_rs 60+)   │
│  search/   (regex+walkdir grep)                              │
│  plugin_api/ (sidecar manager, JSON-RPC 2.0)                │
└─────────────────────────────────────────────────────────────┘
         │ stdin/stdout (JSON-RPC 2.0)
         ▼
┌─ Plugin Process (any language) ─────────────────────────────┐
│  plugins/<name>/plugin.json + main.{py,js,rs,...}           │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| Path | Role |
|------|------|
| `src/App.tsx` | Root: hooks + MenuBar + TabBar + Sidebar + SplitEditor + StatusBar + 6 dialogs |
| `src/stores/editorStore.ts` | tabs[], activeTabId, secondaryTabId, 16 actions (incl. moveTab) |
| `src/stores/settingsStore.ts` | 20+ settings: font, theme, wordWrap, splitView, alwaysOnTop, showSidebar... |
| `src/stores/searchStore.ts` | find/replace state, findInFiles, markAll |
| `src/stores/macroStore.ts` | recording/playback/saved macros |
| `src/stores/encodingStore.ts` | encoding registry, convertTabEncoding |
| `src/stores/pluginStore.ts` | plugin list, start/stop/sendCommand |
| `src/components/Editor/Editor.tsx` | Monaco Editor + columnSelection + cursor tracking |
| `src/components/Editor/SplitEditor.tsx` | Horizontal/vertical split with sync scroll |
| `src/components/MenuBar/MenuBar.tsx` | Custom HTML menu bar, Alt+letter navigation |
| `src/components/MenuBar/menuDefinitions.ts` | 11 menus: File/Edit/Search/View/Encoding/Language/Macro/Run/Plugins/Window/Help |
| `src/components/MenuBar/MenuItem.tsx` | Recursive menu item with submenu support |
| `src/components/TabBar/TabBar.tsx` | Tab strip + drag-and-drop reorder + context menu |
| `src/components/TabBar/TabContextMenu.tsx` | Close/Close Others/Close All/Copy Path (i18n) |
| `src/components/StatusBar/StatusBar.tsx` | File name, language, encoding, Ln/Col |
| `src/components/SearchPanel/SearchPanel.tsx` | Find/replace with regex, case, word, wrap, FindInFiles |
| `src/components/Panels/Sidebar.tsx` | Sidebar with Files (tree) + Git (status/diff) + Symbols tabs |
| `src/components/Panels/GitPanel.tsx` | Git changed files list, inline diff view |
| `src/stores/gitStore.ts` | Git status state, branch, changed files |
| `src/hooks/useMenuActions.ts` | All menu action handlers (50+ actions) |
| `src/hooks/useMonacoActions.ts` | Ctrl+S/N/O/W/F/H/G + save/open/new/close IPC |
| `src/hooks/useWindowTitle.ts` | Sync window title with active tab |
| `src/hooks/useFileDrop.ts` | Drag-and-drop file opening |
| `src/hooks/useKeyboardShortcuts.ts` | Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+PageUp/Down |
| `src/hooks/useMacroRecorder.ts` | Intercept Monaco events for macro recording |
| `src/lib/ipc.ts` | Typed invoke() wrapper for all 24 Rust commands |
| `src/lib/constants.ts` | 60+ language extension→Monaco ID mappings |
| `src/lib/fileUtils.ts` | Path utils, binary detection, size formatting |
| `src/i18n/` | i18next config + zh.ts / en.ts locale files (100+ keys) |
| `src/types/ipc.ts` | TypeScript interfaces for all IPC types |
| `src-tauri/src/lib.rs` | Command registration (24 commands) |
| `src-tauri/src/models.rs` | Shared serializable structs (10+ types) |
| `src-tauri/src/commands/` | file_ops, encoding, search, session, system, plugin |
| `src-tauri/src/encoding/` | detect (BOM+chardetng), convert (encoding_rs 60+) |
| `src-tauri/src/search/` | finder (regex+walkdir grep) |
| `src-tauri/src/plugin_api/` | types, manager (discover/start/stop/send) |

## Dialogs

| Dialog | Trigger | Purpose |
|--------|---------|---------|
| `EncodingDialog` | StatusBar click / Encoding menu | Encoding picker for open/convert |
| `GoToLineDialog` | Ctrl+G | Jump to line number |
| `PreferencesDialog` | File → Preferences | Theme, font, editing, new doc, language settings |
| `ShortcutMapperDialog` | File → Shortcut Mapper | View/rebind keyboard shortcuts |
| `RunDialog` | Run → Run... | Execute shell commands (Rust run_command) |
| `AboutDialog` | Help → About | Version, tech stack, copyright |
| `PluginDialog` | Plugins → Plugin Manager | Start/stop/list plugins |
| `UnsavedChangesDialog` | Close unsaved tab | Save/Discard/Cancel prompt |

## IPC Commands (Rust → TS) — 24 total

### File Ops
| Command | Signature | Purpose |
|---------|-----------|---------|
| `read_file` | `(path, encoding?) → FileReadResult` | Read file with encoding detection (>50MB rejected) |
| `write_file` | `(path, content, encoding)` | Write file with encoding |
| `delete_file` | `(path)` | Delete a file |
| `rename_file` | `(old_path, new_path)` | Rename a file |
| `file_exists` | `(path) → bool` | Check file existence |
| `get_file_size` | `(path) → u64` | Get file size in bytes |
| `list_directory` | `(path) → Vec<DirEntry>` | List directory contents (sidebar file tree) |

### Encoding
| Command | Signature | Purpose |
|---------|-----------|---------|
| `detect_encoding` | `(data: Vec<u8>) → String` | Detect encoding from bytes |
| `convert_encoding_command` | `(req) → Vec<u8>` | Convert between encodings |
| `list_encodings` | `() → Vec<EncodingInfo>` | List 60+ supported encodings |
| `decode_with_encoding` | `(data, name) → String` | Decode bytes using named encoding |
| `encode_with_encoding` | `(content, name) → Vec<u8>` | Encode string using named encoding |

### Search
| Command | Signature | Purpose |
|---------|-----------|---------|
| `find_in_files` | `(params) → Vec<SearchMatch>` | Recursive file search (regex+walkdir) |

### Session
| Command | Signature | Purpose |
|---------|-----------|---------|
| `save_session` | `(session)` | Save session to JSON |
| `load_session` | `() → Option<SessionData>` | Load last session |
| `clear_session` | `()` | Delete saved session |

### System
| Command | Signature | Purpose |
|---------|-----------|---------|
| `open_in_browser` | `(url)` | Open URL in default browser |
| `run_command` | `(command, cwd?) → CommandResult` | Execute shell command (cross-platform) |
| `get_system_info` | `() → SystemInfo` | Get platform + locale |

### Plugin
| Command | Signature | Purpose |
|---------|-----------|---------|
| `list_plugins` | `() → Vec<PluginInfo>` | Discover plugins in plugins/ dir |
| `start_plugin` | `(name)` | Start plugin sidecar process |
| `stop_plugin` | `(name)` | Stop plugin process |
| `send_plugin_command` | `(name, method, params?) → Value` | JSON-RPC 2.0 request to plugin |

## Keyboard Shortcuts

| Shortcut | Action | Layer |
|----------|--------|-------|
| Ctrl+N | New file | Monaco |
| Ctrl+O | Open file (dialog) | Monaco |
| Ctrl+S | Save (Save As if new) | Monaco |
| Ctrl+Shift+S | Save As (dialog) | Monaco |
| Ctrl+W | Close tab | Monaco |
| Ctrl+P | Print | Monaco |
| Ctrl+F | Toggle find panel | Monaco |
| Ctrl+H | Toggle replace panel | Monaco |
| Ctrl+G | Go to line | Monaco |
| Ctrl+D | Duplicate line | Monaco |
| Ctrl+L | Delete line | Monaco |
| Ctrl+Shift+Up | Move line up | Monaco |
| Ctrl+Shift+Down | Move line down | Monaco |
| Ctrl+Tab | Next tab | Global |
| Ctrl+Shift+Tab | Previous tab | Global |
| Ctrl+PageUp | Previous tab | Global |
| Ctrl+PageDown | Next tab | Global |
| F11 | Full screen | Global |
| F3 | Find next | Monaco |
| Shift+F3 | Find previous | Monaco |
| Alt+F4 | Exit | Global |

## Plugin System

Plugins are sidecar processes communicating via **JSON-RPC 2.0** over stdin/stdout.

### Plugin Manifest (plugin.json)
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Description",
  "author": "Author",
  "main": "main.py",
  "runtime": "python3",
  "enabled": true
}
```

### Plugin Directory Structure
```
plugins/
└── sample-hello/
    ├── plugin.json     ← manifest
    └── main.py          ← entry point (any language)
```

### JSON-RPC 2.0 Protocol
- Each message is one JSON line on stdin/stdout
- Request: `{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}`
- Response: `{"jsonrpc":"2.0","id":1,"result":"pong"}`
- Notification (no id): `{"jsonrpc":"2.0","method":"shutdown"}`
- Stderr goes to editor log

## State Management

Zustand stores (all persistent where applicable):

| Store | Key State | Persistence |
|-------|-----------|-------------|
| `editorStore` | tabs[], activeTabId, secondaryTabId, moveTab, 16 actions | — |
| `settingsStore` | 20+ settings, shortcuts, updateSetting, toggleSetting | localStorage |
| `searchStore` | find/replace state, findInFiles results, markAll | — |
| `macroStore` | isRecording, recordedActions[], savedMacros[] | — |
| `encodingStore` | supportedEncodings[], convertTabEncoding | — |
| `pluginStore` | plugins[], loadPlugins, start/stop/sendCommand | — |
| `editorRefStore` | editorRef (shared Monaco instance ref) | — |

Each tab: `{ id, path, name, content, encoding, modified, language, cursorLine, cursorColumn }`

## i18n

- **Framework**: react-i18next + i18next
- **Locales**: `src/i18n/zh.ts` (Chinese), `src/i18n/en.ts` (English)
- **Config**: `src/i18n/index.ts` (default: zh, persisted to localStorage)
- **Language switcher**: Preferences → General → Language
- **Coverage**: All menus, dialogs, tab context menu, status bar, welcome screen (100+ keys)

## Conventions

- One folder per component, `.tsx` + `.css` co-located
- CSS custom properties (`--bg-primary`, etc.) in `styles.css`
- PascalCase components, camelCase functions, kebab-case CSS classes
- `useEditorStore.getState()` for accessing store in non-React contexts (callbacks)
- Tauri IPC calls go through `src/lib/ipc.ts` only
- All user-facing strings use `t("key")` from react-i18next

## Rust Crates

| Crate | Version | Purpose |
|-------|---------|---------|
| tauri | 2 | Desktop framework |
| serde / serde_json | 1 | Serialization (JSON-RPC, config, manifests) |
| encoding_rs | 0.8 | Character encoding (60+ encodings) |
| chardetng | 0.1 | Statistical charset detection (non-BOM) |
| walkdir | 2 | Recursive directory walking |
| regex | 1 | Pattern matching |
| open | 5 | Open URLs in browser |
| sys-locale | 0.3 | System locale detection |

## npm Dependencies

| Package | Purpose |
|---------|---------|
| @monaco-editor/react + monaco-editor | Editor engine |
| @tauri-apps/api + plugin-* | Tauri IPC |
| react + react-dom | UI framework |
| zustand | State management |
| i18next + react-i18next | Internationalization |
| typescript + vite + @vitejs/plugin-react | Build toolchain |

## Testing

```bash
npm run test:e2e      # 32 Playwright tests (UI + compile checks), ~80s
npm run test:check    # TypeScript + Rust compile checks only
```

- **30 UI tests**: menu items, dialogs, tab operations, sidebar, i18n, search, language
- **2 compile checks**: `cargo check` and `npx tsc --noEmit`
- Headless Chromium with mocked Tauri IPC (`window.__TAURI_INTERNALS__`)
- Config: `e2e/playwright.config.ts` (webServer auto-starts Vite)
- Test files: `e2e/ui-tests.spec.ts`, `e2e/feature-coverage.spec.ts`

## Dev Commands

### Start the app

```bash
npm run tauri dev        # Full app: Vite HMR + Tauri desktop window
npm run dev              # Frontend only: Vite at http://localhost:1420 (no Rust)
```

On first run, Tauri compiles Rust backend (~5s incremental, ~30s clean). The Vite dev server starts in ~300ms. If port 1420 is in use, kill the old process first:

```bash
lsof -ti :1420 | xargs kill
npm run tauri dev
```

### Build

```bash
npm run tauri build      # Production build → src-tauri/target/release/
npx tsc --noEmit         # TypeScript type-check only (no emit)
cargo check              # Rust type-check only (from src-tauri/)
```

### Dependencies

```bash
npm install              # Install all npm deps (after clone)
```

### Git

```bash
git add -A
git commit -m "feat: description"
git push
```

## Next Priorities

1. **Auto-updater** — Tauri updater integration for auto-updates
2. **Cross-platform testing** — Windows/Linux packaging and testing
3. **Themes marketplace** — import/export custom themes
4. **Plugin marketplace** — discover and install plugins from a central registry
5. **Advanced Git** — stage/unstage, commit, branch switch
6. **Performance** — virtual scrolling for large files, web workers
