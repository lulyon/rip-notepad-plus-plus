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
  minimapEnabled: boolean;
  bracketPairColorization: boolean;
  smoothScrolling: boolean;
  scrollBeyondLastLine: boolean;

  // ── View ──
  splitView: "none" | "horizontal" | "vertical";
  showMenuBar: boolean;
  showStatusBar: boolean;
  fullScreen: boolean;

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
    minimapEnabled: saved.minimapEnabled ?? true,
    bracketPairColorization: saved.bracketPairColorization ?? true,
    smoothScrolling: saved.smoothScrolling ?? true,
    scrollBeyondLastLine: saved.scrollBeyondLastLine ?? false,
    splitView: saved.splitView ?? "none",
    showMenuBar: saved.showMenuBar ?? true,
    showStatusBar: saved.showStatusBar ?? true,
    fullScreen: saved.fullScreen ?? false,
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
        const nextVal = !current;
        saveToStorage({ [key]: nextVal });
        return { ...s, [key]: nextVal };
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

    loadSettings: () => {
      const data = loadFromStorage();
      set(data);
    },
  };
});
