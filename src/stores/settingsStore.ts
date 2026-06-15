import { create } from "zustand";

export interface SettingsState {
  // ── Editor ──
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: "off" | "on";
  lineNumbers: "on" | "off";
  renderWhitespace: "selection" | "none" | "all";
  showIndentGuides: boolean;
  showMinimap: boolean;
  minimapWidth: number;
  minimapShowSlider: "always" | "mouseover";
  bracketPairColorization: boolean;
  smoothScrolling: boolean;
  scrollBeyondLastLine: boolean;

  // ── View ──
  splitView: "none" | "horizontal" | "vertical";
  showMenuBar: boolean;
  showStatusBar: boolean;
  showSidebar: boolean;
  sidebarWidth: number;
  projectRoot: string | null;
  projectRoots: string[];
  activeProjectRoot: string | null;
  fullScreen: boolean;
  alwaysOnTop: boolean;
  autoSave: boolean;
  autoCheckUpdate: boolean;
  columnMode: boolean;

  // ── New Document ──
  defaultEncoding: string;
  defaultLanguage: string;
  defaultEol: "LF" | "CRLF" | "CR";

  // ── Theme ──
  theme: "vs-dark" | "vs" | "hc-black";

  // ── Shortcuts ──
  shortcuts: Record<string, string>;

  // ── Actions ──
  updateSetting: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => void;
  toggleSetting: (key: keyof SettingsState) => void;
  setShortcut: (actionId: string, keybind: string) => void;
  resetShortcuts: () => void;
  loadSettings: () => void;
  addProjectRoot: (path: string) => void;
  removeProjectRoot: (path: string) => void;
}

const DEFAULT_SHORTCUTS: Record<string, string> = {
  "file.new": "Ctrl+N",
  "file.open": "Ctrl+O",
  "file.save": "Ctrl+S",
  "file.saveAs": "Ctrl+Shift+S",
  "file.close": "Ctrl+W",
  "edit.undo": "Ctrl+Z",
  "edit.redo": "Ctrl+Y",
  "edit.cut": "Ctrl+X",
  "edit.copy": "Ctrl+C",
  "edit.paste": "Ctrl+V",
  "edit.selectAll": "Ctrl+A",
  "edit.duplicateLine": "Ctrl+D",
  "edit.deleteLine": "Ctrl+L",
  "search.find": "Ctrl+F",
  "search.replace": "Ctrl+H",
  "search.goTo": "Ctrl+G",
  "search.findInFiles": "Ctrl+Shift+F",
  "view.zoomIn": "Ctrl+=",
  "view.zoomOut": "Ctrl+-",
  "view.zoomReset": "Ctrl+0",
  "view.fullScreen": "F11",
};

const STORAGE_KEY = "ripnotepadpp-settings";

function loadFromStorage(): Partial<SettingsState> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveToStorage(state: Partial<SettingsState>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently ignore storage failures
  }
}

export const useSettingsStore = create<SettingsState>((set) => {
  const saved = loadFromStorage();

  return {
    // ── Default values (overridden by saved) ──
    fontSize: saved.fontSize ?? 13,
    fontFamily: saved.fontFamily ??
      "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
    tabSize: saved.tabSize ?? 4,
    insertSpaces: saved.insertSpaces ?? true,
    wordWrap: saved.wordWrap ?? "off",
    lineNumbers: saved.lineNumbers ?? "on",
    renderWhitespace: saved.renderWhitespace ?? "selection",
    showIndentGuides: saved.showIndentGuides ?? true,
    showMinimap: saved.showMinimap ?? true,
    minimapWidth: saved.minimapWidth ?? 60,
    minimapShowSlider: saved.minimapShowSlider ?? "mouseover",
    bracketPairColorization: saved.bracketPairColorization ?? true,
    smoothScrolling: saved.smoothScrolling ?? true,
    scrollBeyondLastLine: saved.scrollBeyondLastLine ?? false,
    splitView: saved.splitView ?? "none",
    showMenuBar: saved.showMenuBar ?? true,
    showStatusBar: saved.showStatusBar ?? true,
    showSidebar: saved.showSidebar ?? false,
    sidebarWidth: saved.sidebarWidth ?? 260,
    projectRoot: saved.projectRoot ?? null,
    projectRoots: saved.projectRoots ?? (saved.projectRoot ? [saved.projectRoot] : []),
    activeProjectRoot: saved.activeProjectRoot ?? saved.projectRoot ?? null,
    fullScreen: saved.fullScreen ?? false,
    alwaysOnTop: saved.alwaysOnTop ?? false,
    autoSave: saved.autoSave ?? true,
    autoCheckUpdate: saved.autoCheckUpdate ?? true,
    columnMode: saved.columnMode ?? false,
    defaultEncoding: saved.defaultEncoding ?? "UTF-8",
    defaultLanguage: saved.defaultLanguage ?? "plaintext",
    defaultEol: saved.defaultEol ?? "LF",
    theme: saved.theme ?? "vs-dark",
    shortcuts: saved.shortcuts ?? DEFAULT_SHORTCUTS,

    // ── Actions ──
    updateSetting: (key, value) => {
      set((s) => {
        const next = { ...s, [key]: value };
        saveToStorage({ [key]: value });
        return next;
      });
    },

    toggleSetting: (key) => {
      set((s) => {
        const current = s[key as keyof SettingsState];
        if (typeof current !== "boolean") return s; // Guard: only toggle booleans
        const nextVal = !current;
        saveToStorage({ [key]: nextVal } as any);
        return { ...s, [key]: nextVal } as any;
      });
    },

    setShortcut: (actionId, keybind) => {
      set((s) => {
        const next = {
          shortcuts: { ...s.shortcuts, [actionId]: keybind },
        };
        saveToStorage({ shortcuts: next.shortcuts });
        return next;
      });
    },

    resetShortcuts: () => {
      set({ shortcuts: { ...DEFAULT_SHORTCUTS } });
      saveToStorage({ shortcuts: { ...DEFAULT_SHORTCUTS } });
    },

    addProjectRoot: (path) => {
      set((s) => {
        if (s.projectRoots.includes(path)) return s;
        const roots = [...s.projectRoots, path];
        saveToStorage({ projectRoots: roots } as any);
        return { projectRoots: roots, activeProjectRoot: path, projectRoot: path };
      });
    },
    removeProjectRoot: (path) => {
      set((s) => {
        const roots = s.projectRoots.filter((r) => r !== path);
        const newActive = s.activeProjectRoot === path ? (roots[0] || null) : s.activeProjectRoot;
        // When no roots left, switch to auto-detect mode (projectRoot=null)
        saveToStorage({ projectRoots: roots, activeProjectRoot: newActive } as any);
        return { projectRoots: roots, activeProjectRoot: newActive, projectRoot: roots.length > 0 ? newActive : null };
      });
    },

    loadSettings: () => {
      const data = loadFromStorage();
      set(data);
    },
  };
});
