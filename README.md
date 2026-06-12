# ripNotepad++

A cross-platform text editor — a complete replacement for Notepad++.

Built with **Tauri v2** + **Monaco Editor** + **React** + **TypeScript**.

## Features (planned)

- [x] Multi-tab editing with Monaco Editor (VS Code engine)
- [x] Syntax highlighting for 30+ languages
- [x] Code folding, bracket matching, minimap
- [ ] File open/save with encoding detection (UTF-8, GBK, Shift-JIS, etc.)
- [ ] Find & replace with regex
- [ ] Multi-window / split view
- [ ] Macro recording & playback
- [ ] Plugin system
- [ ] Themes (light/dark/custom)

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

# Start dev server (Tauri + Vite HMR)
npm run tauri dev

# Build for production
npm run tauri build
```

## Architecture

```
rip-notepad-plus-plus/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── Editor/         # Monaco Editor wrapper
│   │   ├── TabBar/         # Multi-tab management
│   │   └── StatusBar/      # Status bar (line, col, encoding)
│   ├── stores/             # Zustand state management
│   └── App.tsx
├── src-tauri/              # Backend (Rust)
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   └── lib.rs          # Tauri commands
│   └── tauri.conf.json     # Tauri configuration
└── package.json
```

## License

MIT
