import { create } from "zustand";

export interface Tab {
  id: string;
  path: string | null;
  name: string;
  content: string;
  encoding: string;
  modified: boolean;
  language: string;
}

interface EditorState {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  newTab: () => void;
  openTab: (tab: Omit<Tab, "id" | "modified">) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string) => void;
  markTabSaved: (id: string, path: string) => void;
}

let tabCounter = 0;

function generateTabId(): string {
  tabCounter += 1;
  return `tab-${tabCounter}-${Date.now()}`;
}

function detectLanguage(filePath: string | null, _name: string): string {
  const source = filePath || _name;
  if (source) {
    const ext = source.split(".").pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      html: "html",
      css: "css",
      scss: "scss",
      md: "markdown",
      py: "python",
      rs: "rust",
      go: "go",
      java: "java",
      c: "c",
      cpp: "cpp",
      h: "c",
      hpp: "cpp",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      toml: "toml",
      sh: "shell",
      bash: "shell",
      zsh: "shell",
      sql: "sql",
      rb: "ruby",
      php: "php",
      swift: "swift",
      kt: "kotlin",
      dart: "dart",
      lua: "lua",
      r: "r",
      txt: "plaintext",
    };
    if (ext && extMap[ext]) return extMap[ext];
  }
  return "plaintext";
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  newTab: () => {
    const id = generateTabId();
    const tab: Tab = {
      id,
      path: null,
      name: `new ${get().tabs.length + 1}`,
      content: "",
      encoding: "UTF-8",
      modified: false,
      language: "plaintext",
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
  },

  openTab: (tabData) => {
    const id = generateTabId();
    const tab: Tab = {
      ...tabData,
      id,
      modified: false,
      language: detectLanguage(tabData.path, tabData.name),
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
    return id;
  },

  closeTab: (id) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      const newTabs = s.tabs.filter((t) => t.id !== id);
      let newActiveId = s.activeTabId;
      if (s.activeTabId === id) {
        if (newTabs.length === 0) {
          newActiveId = null;
        } else {
          // Activate adjacent tab
          const newIdx = Math.min(idx, newTabs.length - 1);
          newActiveId = newTabs[newIdx].id;
        }
      }
      return { tabs: newTabs, activeTabId: newActiveId };
    });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  updateTabContent: (id, content) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, content, modified: true } : t,
      ),
    }));
  },

  updateTabLanguage: (id, language) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, language } : t)),
    }));
  },

  markTabSaved: (id, path) => {
    const name = path.split(/[/\\]/).pop() || path;
    const language = detectLanguage(path, name);
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? { ...t, path, name, modified: false, language }
          : t,
      ),
    }));
  },
}));
