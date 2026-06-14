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
  pinned: boolean;
  color: number | null; // null = no color, 1-5 = color index
}

export interface ClosedTabData {
  path: string | null;
  name: string;
  content: string;
  encoding: string;
  language: string;
  cursorLine: number;
  cursorColumn: number;
}

interface EditorState {
  tabs: Tab[];
  activeTabId: string | null;
  secondaryTabId: string | null; // for split view (Phase 4)
  // Unsaved changes dialog
  unsavedTabs: Tab[] | null; // non-null = show dialog, list of modified tabs to resolve
  pendingCloseAll: boolean; // true = close all tabs after resolving unsaved
  // Closed tab stack (for Restore Last Closed, max 20)
  closedTabStack: ClosedTabData[];

  // Actions
  newTab: () => string;
  openTab: (tab: Omit<Tab, "id" | "modified" | "cursorLine" | "cursorColumn" | "pinned" | "color">) => string;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  closeAllButCurrent: () => void;
  closeOtherTabs: (id: string) => void;
  togglePinTab: (id: string) => void;
  setTabColor: (id: string, color: number | null) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string) => void;
  updateTabEncoding: (id: string, encoding: string) => void;
  updateTabCursor: (id: string, line: number, column: number) => void;
  markTabSaved: (id: string, path: string) => void;
  renameTab: (id: string, newPath: string) => void;
  reloadTab: (id: string, content: string, encoding: string) => void;
  getTab: (id: string) => Tab | undefined;
  moveTab: (fromIndex: number, toIndex: number) => void;
  dismissUnsavedDialog: () => void;
  forceCloseTab: (id: string) => void;
  forceCloseAllTabs: () => void;
  clearModified: (id: string) => void;
  restoreLastClosedTab: () => void;
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
  unsavedTabs: null,
  pendingCloseAll: false,
  closedTabStack: [],

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
      pinned: false,
      color: null,
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
      pinned: false,
      color: null,
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
    const tab = get().tabs.find((t) => t.id === id);
    if (tab?.pinned) return; // cannot close pinned tab
    // If tab is modified, show unsaved changes dialog instead of closing
    if (tab?.modified) {
      set({ unsavedTabs: [tab], pendingCloseAll: false });
      return;
    }
    // Save to closed tab stack (max 20)
    if (tab) {
      const stack = get().closedTabStack;
      const entry = {
        path: tab.path,
        name: tab.name,
        content: tab.content,
        encoding: tab.encoding,
        language: tab.language,
        cursorLine: tab.cursorLine,
        cursorColumn: tab.cursorColumn,
      };
      const newStack = [...stack, entry].slice(-20);
      set({ closedTabStack: newStack });
    }
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
    const tabs = get().tabs;
    const pinned = tabs.filter((t) => t.pinned);
    if (pinned.length === tabs.length) return; // all pinned, nothing to close
    const modified = tabs.filter((t) => t.modified && !t.pinned);
    if (modified.length > 0) {
      set({ unsavedTabs: modified, pendingCloseAll: true });
      return;
    }
    // Close only unpinned tabs, keep pinned open
    set((s) => ({
      tabs: pinned,
      activeTabId: pinned.length > 0 ? pinned[0].id : null,
      secondaryTabId: pinned.length > 0 && s.secondaryTabId && pinned.some(t => t.id === s.secondaryTabId) ? s.secondaryTabId : null,
    }));
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

  moveTab: (fromIndex, toIndex) => {
    set((s) => {
      if (
        fromIndex < 0 || fromIndex >= s.tabs.length ||
        toIndex < 0 || toIndex >= s.tabs.length ||
        fromIndex === toIndex
      ) {
        return s;
      }
      const newTabs = [...s.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return { ...s, tabs: newTabs };
    });
  },

  togglePinTab: (id) => set((s) => ({
    tabs: s.tabs.map((t) => t.id === id ? { ...t, pinned: !t.pinned } : t),
  })),

  setTabColor: (id, color) => set((s) => ({
    tabs: s.tabs.map((t) => t.id === id ? { ...t, color } : t),
  })),

  closeAllButCurrent: () => {
    set((s) => {
      const active = s.tabs.find((t) => t.id === s.activeTabId);
      if (!active) return s;
      return { tabs: [active], activeTabId: active.id, secondaryTabId: null };
    });
  },

  dismissUnsavedDialog: () => {
    set({ unsavedTabs: null, pendingCloseAll: false });
  },

  // Force-close without checking modified flag (used by unsaved dialog after save/discard)
  forceCloseTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (tab) {
      const stack = get().closedTabStack;
      const entry = {
        path: tab.path,
        name: tab.name,
        content: tab.content,
        encoding: tab.encoding,
        language: tab.language,
        cursorLine: tab.cursorLine,
        cursorColumn: tab.cursorColumn,
      };
      const newStack = [...stack, entry].slice(-20);
      set({ closedTabStack: newStack });
    }
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

  forceCloseAllTabs: () => {
    const pinned = get().tabs.filter((t) => t.pinned);
    if (pinned.length > 0) {
      set({ tabs: pinned, activeTabId: pinned[0].id, secondaryTabId: null });
    } else {
      set({ tabs: [], activeTabId: null, secondaryTabId: null });
    }
  },

  clearModified: (id) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, modified: false } : t,
      ),
    }));
  },

  restoreLastClosedTab: () => {
    const stack = get().closedTabStack;
    if (stack.length === 0) return;
    const lastClosed = stack[stack.length - 1];
    const { cursorLine, cursorColumn, ...tabData } = lastClosed;
    const id = get().openTab(tabData);
    if (id) {
      get().updateTabCursor(id, cursorLine, cursorColumn);
    }
    set({ closedTabStack: stack.slice(0, -1) });
  },
}));
