import { create } from "zustand";
import { detectLanguage } from "../lib/constants";

export interface Tab {
  id: string;
  path: string | null;
  name: string;
  content: string;
  encoding: string;
  modified: boolean;
  language: string;
  cursorLine: number;
  cursorColumn: number;
}

interface EditorState {
  tabs: Tab[];
  activeTabId: string | null;
  secondaryTabId: string | null; // for split view (Phase 4)

  // Actions
  newTab: () => string;
  openTab: (tab: Omit<Tab, "id" | "modified" | "cursorLine" | "cursorColumn">) => string;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string) => void;
  updateTabEncoding: (id: string, encoding: string) => void;
  updateTabCursor: (id: string, line: number, column: number) => void;
  markTabSaved: (id: string, path: string) => void;
  renameTab: (id: string, newPath: string) => void;
  reloadTab: (id: string, content: string, encoding: string) => void;
  getTab: (id: string) => Tab | undefined;
}

let tabCounter = 0;

function generateTabId(): string {
  tabCounter += 1;
  return `tab-${tabCounter}-${Date.now()}`;
}

function nextNewFileName(tabs: Tab[]): string {
  let n = 1;
  while (tabs.some((t) => t.name === `new ${n}`)) {
    n++;
  }
  return `new ${n}`;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  secondaryTabId: null,

  getTab: (id) => get().tabs.find((t) => t.id === id),

  newTab: () => {
    const id = generateTabId();
    const tab: Tab = {
      id,
      path: null,
      name: nextNewFileName(get().tabs),
      content: "",
      encoding: "UTF-8",
      modified: false,
      language: "plaintext",
      cursorLine: 1,
      cursorColumn: 1,
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
    return id;
  },

  openTab: (tabData) => {
    const id = generateTabId();
    const tab: Tab = {
      ...tabData,
      id,
      modified: false,
      cursorLine: 1,
      cursorColumn: 1,
      language: detectLanguage(
        tabData.path?.split(".").pop() || tabData.name.split(".").pop() || "",
      ),
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
      let newSecondaryId = s.secondaryTabId;
      if (s.activeTabId === id) {
        if (newTabs.length === 0) {
          newActiveId = null;
        } else {
          const newIdx = Math.min(idx, newTabs.length - 1);
          newActiveId = newTabs[newIdx].id;
        }
      }
      if (s.secondaryTabId === id) {
        newSecondaryId = null;
      }
      return {
        tabs: newTabs,
        activeTabId: newActiveId,
        secondaryTabId: newSecondaryId,
      };
    });
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: null, secondaryTabId: null });
  },

  closeOtherTabs: (id) => {
    set((s) => {
      const tab = s.tabs.find((t) => t.id === id);
      if (!tab) return s;
      return {
        tabs: [tab],
        activeTabId: id,
        secondaryTabId: s.secondaryTabId === id ? id : null,
      };
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

  updateTabEncoding: (id, encoding) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, encoding } : t)),
    }));
  },

  updateTabCursor: (id, line, column) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, cursorLine: line, cursorColumn: column } : t,
      ),
    }));
  },

  markTabSaved: (id, path) => {
    const name = path.split(/[/\\]/).pop() || path;
    const ext = path.split(".").pop() || "";
    const language = detectLanguage(ext);
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? { ...t, path, name, modified: false, language }
          : t,
      ),
    }));
  },

  renameTab: (id, newPath) => {
    const name = newPath.split(/[/\\]/).pop() || newPath;
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, path: newPath, name, modified: false } : t,
      ),
    }));
  },

  reloadTab: (id, content, encoding) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, content, encoding, modified: false } : t,
      ),
    }));
  },
}));
