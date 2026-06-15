# ripNotepad++ — AI Development Guide

## Project Identity

A cross-platform text editor replacing Notepad++. Built on **Tauri v2** (Rust backend) + **Monaco Editor** (VS Code's editor engine) + **React 19** + **TypeScript** + **Vite 6**.

- **Product name**: ripNotepad++
- **Identifier**: `com.ripnotepad.plusplus`
- **Target**: Windows, macOS, Linux
- **Node**: >= 20
- **Rust**: >= 1.70 (edition 2021)
- **Version**: 0.3.0 (15 phases complete)
- **Tests**: 70 E2E + 308 unit (Playwright + vitest)
- **IPC Commands**: 37 (file_ops, encoding, search, session, system, plugin, git, monitor)

## Architecture

```
┌─ WebView (React + Monaco + i18n) ───────────────────────────┐
│  MenuBar │ TabBar(drag) │ Sidebar │ SplitEditor │ StatusBar │
│  SearchPanel(overlay) │ Dialogs(portals)                     │
│  Zustand stores: editor / search / settings / macro /        │
│  encoding / plugin / git / clipboard / editorRef /           │
│  bookmark / mark / contextMenu / udl                         │
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
| `src/App.tsx` | Root: hooks + MenuBar + TabBar + Sidebar + SplitEditor + StatusBar + 10 dialogs |
| `src/stores/editorStore.ts` | tabs[], activeTabId, secondaryTabId, unsaved dialog state, 19 actions (incl. moveTab) |
| `src/stores/settingsStore.ts` | 26 settings: font, theme, wordWrap, splitView, alwaysOnTop, showSidebar... |
| `src/stores/searchStore.ts` | find/replace state, findInFiles, markAll |
| `src/stores/macroStore.ts` | recording/playback/saved macros |
| `src/stores/encodingStore.ts` | encoding registry, convertTabEncoding |
| `src/stores/pluginStore.ts` | plugin list, start/stop/sendCommand |
| `src/stores/gitStore.ts` | Git status state, branch, changed files |
| `src/stores/clipboardStore.ts` | Clipboard history entries, live monitoring |
| `src/stores/editorRefStore.ts` | editorRef (shared Monaco instance ref) |
| `src/components/Editor/Editor.tsx` | Monaco Editor + columnSelection + cursor tracking |
| `src/components/Editor/SplitEditor.tsx` | Horizontal/vertical split |
| `src/components/MenuBar/MenuBar.tsx` | Custom HTML menu bar, Alt+letter navigation |
| `src/components/MenuBar/menuDefinitions.ts` | 11 menus: File/Edit/Search/View/Encoding/Language/Macro/Run/Plugins/Window/Help |
| `src/components/MenuBar/MenuItem.tsx` | Recursive menu item with submenu support |
| `src/components/TabBar/TabBar.tsx` | Tab strip + drag-and-drop reorder + context menu |
| `src/components/TabBar/TabContextMenu.tsx` | Close/Close Others/Close All/Copy Path (i18n) |
| `src/components/StatusBar/StatusBar.tsx` | File name, language, encoding, Ln/Col, git branch |
| `src/components/SearchPanel/SearchPanel.tsx` | Find/replace with regex, case, word, wrap, FindInFiles |
| `src/components/Panels/Sidebar.tsx` | Sidebar: Files (tree) + Git (status/diff) + Symbols (3 tabs) |
| `src/components/Panels/GitPanel.tsx` | Git changed files list, inline diff view |
| `src/components/Panels/ClipboardPanel.tsx` | Clipboard history with search, pin, paste at cursor |
| `src/components/Panels/JsonViewerPanel.tsx` | Recursive JSON tree view with copy path |
| `src/components/Panels/DocListPanel.tsx` | Open document list with modified indicators |
| `src/components/Panels/TaskListPanel.tsx` | TODO/FIXME/HACK/XXX/NOTE/OPTIMIZE/BUG scanner |
| `src/components/Dialogs/CompareDialog.tsx` | Side-by-side file diff comparison (Monaco DiffEditor) |
| `src/components/Dialogs/CommandPalette.tsx` | Fuzzy command search, keyboard navigation |
| `src/components/Dialogs/UnsavedChangesDialog.tsx` | Save/Discard/Cancel prompt on close |
| `src/hooks/useMenuActions.ts` | All menu action handlers (80+ actions) |
| `src/hooks/useMonacoActions.ts` | Ctrl+S/N/O/W/F/H/G + save/open/new/close IPC + Command Palette |
| `src/hooks/useWindowTitle.ts` | Sync window title with active tab |
| `src/hooks/useFileDrop.ts` | Drag-and-drop file opening |
| `src/hooks/useKeyboardShortcuts.ts` | Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+PageUp/Down |
| `src/hooks/useMacroRecorder.ts` | Intercept Monaco events for macro recording |
| `src/hooks/useAutoSave.ts` | 30s interval auto-save modified tabs |
| `src/hooks/usePluginBridge.ts` | Push editor state to Rust, notify plugins on file events |
| `src/lib/ipc.ts` | Typed invoke() wrapper for all 31 Rust commands |
| `src/lib/constants.ts` | 75 language extension→Monaco ID mappings |
| `src/lib/fileUtils.ts` | Path utils, binary detection, size formatting |
| `src/i18n/` | i18next config + zh.ts / en.ts locale files (213 keys) |
| `src/types/ipc.ts` | TypeScript interfaces for all IPC types |
| `src-tauri/src/lib.rs` | Command registration (31 commands) |
| `src-tauri/src/models.rs` | Shared serializable structs (12 types) |
| `src-tauri/src/commands/` | file_ops, encoding, search, session, system, plugin, git |
| `src-tauri/src/encoding/` | detect (BOM+chardetng), convert (encoding_rs 43 encodings) |
| `src-tauri/src/search/` | finder (regex+walkdir grep) |
| `src-tauri/src/plugin_api/` | types, manager (discover/start/stop/send/notify) |

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
| `UnsavedChangesDialog` | Close modified tab | Save/Discard/Cancel prompt |
| `CompareDialog` | Plugins → Compare | Side-by-side file diff (Monaco DiffEditor) |
| `CommandPalette` | Ctrl+Shift+P | Fuzzy command search and execute |
| `HashDialog` | Tools menu | MD5/SHA-1/SHA-256/SHA-512 generation |
| `SummaryDialog` | View → Summary | Document stats (chars/words/lines) |
| `UdlDialog` | Language menu | User-defined language editor |
| `ContextMenuDialog` | File → Edit Context Menu | Customize right-click menu items |

## IPC Commands (Rust → TS) — 31 total

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
| `create_directory` | `(path)` | Create a directory |
| `delete_directory` | `(path)` | Delete a directory |

### Encoding
| Command | Signature | Purpose |
|---------|-----------|---------|
| `detect_encoding` | `(data: Vec<u8>) → String` | Detect encoding from bytes |
| `convert_encoding_command` | `(req) → Vec<u8>` | Convert between encodings |
| `list_encodings` | `() → Vec<EncodingInfo>` | List 43 supported encodings |
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
| `open_terminal` | `(cwd, profile?)` | Open terminal in directory |
| `run_command` | `(command, cwd?) → CommandResult` | Execute shell command (cross-platform) |
| `get_system_info` | `() → SystemInfo` | Get platform + locale |

### Plugin
| Command | Signature | Purpose |
|---------|-----------|---------|
| `list_plugins` | `() → Vec<PluginInfo>` | Discover plugins in plugins/ dir |
| `start_plugin` | `(name)` | Start plugin sidecar process |
| `stop_plugin` | `(name)` | Stop plugin process |
| `send_plugin_command` | `(name, method, params?) → Value` | JSON-RPC 2.0 request to plugin |
| `update_editor_state` | `(state)` | Push editor state to plugins |
| `notify_plugins` | `(event, data)` | Broadcast event to all running plugins |

### Git
| Command | Signature | Purpose |
|---------|-----------|---------|
| `git_status` | `(repo_path) → GitStatus` | Get working tree status |
| `git_branch` | `(repo_path) → String` | Get current branch name |
| `git_diff_file` | `(repo_path, file_path) → String` | Get diff for a specific file |

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
| Ctrl+Shift+P | Command palette | Monaco |
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
| `editorStore` | tabs[], activeTabId, secondaryTabId, unsavedTabs, 19 actions | — |
| `settingsStore` | 26 settings, shortcuts, updateSetting, toggleSetting | localStorage |
| `searchStore` | find/replace state, findInFiles results, markAll | — |
| `macroStore` | isRecording, recordedActions[], savedMacros[] | localStorage |
| `encodingStore` | supportedEncodings[], encodingGroups, convertTabEncoding | — |
| `pluginStore` | plugins[], loadPlugins, start/stop/sendCommand | — |
| `gitStore` | status, loading, error, refreshStatus | — |
| `clipboardStore` | entries[], maxEntries, listening, start/stop/pin/remove | — |
| `editorRefStore` | editorRef (shared Monaco instance ref) | — |

Each tab: `{ id, path, name, content, encoding, modified, language, cursorLine, cursorColumn }`

## i18n

- **Framework**: react-i18next + i18next
- **Locales**: `src/i18n/zh.ts` (Chinese), `src/i18n/en.ts` (English)
- **Config**: `src/i18n/index.ts` (default: zh, persisted to localStorage)
- **Language switcher**: Preferences → General → Language
- **Coverage**: Menus, welcome screen, tab context menu, status bar, sidebar panels, all dialogs (290+ keys, 7 languages: zh/en/ja/ko/fr/ar/he)

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
| tauri-plugin-dialog | 2 | Native file dialogs |
| tauri-plugin-fs | 2 | File system access |
| tauri-plugin-shell | 2 | Shell command execution |
| serde / serde_json | 1 | Serialization (JSON-RPC, config, manifests) |
| encoding_rs | 0.8 | Character encoding (43 encodings) |
| chardetng | 0.1 | Statistical charset detection (non-BOM) |
| walkdir | 2 | Recursive directory walking |
| regex | 1 | Pattern matching |
| open | 5 | Open URLs/files in default app |
| sys-locale | 0.3 | System locale detection |
| log | 0.4 | Logging facade |
| image | 0.25 | Icon/image processing (PNG) |

## npm Dependencies

| Package | Purpose |
|---------|---------|
| @monaco-editor/react + monaco-editor | Editor engine |
| @tauri-apps/api + plugin-* | Tauri IPC |
| react + react-dom | UI framework |
| zustand | State management |
| i18next + react-i18next | Internationalization |
| @xterm/xterm + @xterm/addon-fit | Terminal emulator (legacy, removed) |
| typescript + vite + @vitejs/plugin-react | Build toolchain |

## Testing

```bash
npm test              # Run all tests
npm run test:unit     # 308 vitest unit tests (18 suites)
npm run test:e2e      # 70 Playwright E2E tests
npm run test:check    # TypeScript + Rust compile checks
```

- **18 test suites, 308 unit tests**: stores, hooks, preview engine renderers
- **70 E2E tests**: UI basics, feature coverage, NP++ features, deep behavior
- Headless Chromium with mocked Tauri IPC
- Config: `e2e/playwright.config.ts` (webServer auto-starts Vite)

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

1. **SplitEditor sync scroll** — synchronize scroll between primary/secondary panes
2. **Advanced Git** — stage/unstage, commit, branch switch
3. **Cross-platform testing** — Windows/Linux packaging and testing
4. **Themes marketplace** — import/export custom themes
5. **Plugin marketplace** — discover and install plugins from a central registry
6. **Real plugin selection data** — pass actual cursor/selection info to plugins
7. **Performance** — virtual scrolling for large files, web workers
