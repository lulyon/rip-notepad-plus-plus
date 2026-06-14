import { create } from "zustand";

/**
 * Customizable context menu items.
 * Persisted to localStorage so users can add/remove/reorder.
 */
export interface CustomMenuItem {
  id: string;
  label: string;       // Display text (supports & for accelerators)
  action: string;       // Menu action ID to dispatch (e.g. "edit.cut", "file.save")
  separator: boolean;   // If true, renders as separator (label/action ignored)
}

interface ContextMenuState {
  items: CustomMenuItem[];

  // Actions
  setItems: (items: CustomMenuItem[]) => void;
  addItem: (item: CustomMenuItem) => void;
  removeItem: (id: string) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  loadItems: () => void;
}

const STORAGE_KEY = "ripnotepadpp-contextmenu";

const DEFAULT_ITEMS: CustomMenuItem[] = [
  { id: "ctx.cut", label: "Cu&t", action: "edit.cut", separator: false },
  { id: "ctx.copy", label: "&Copy", action: "edit.copy", separator: false },
  { id: "ctx.paste", label: "&Paste", action: "edit.paste", separator: false },
  { id: "ctx.selectAll", label: "Select &All", action: "edit.selectAll", separator: false },
  { id: "ctx.sep1", label: "", action: "", separator: true },
  { id: "ctx.uppercase", label: "To &Uppercase", action: "edit.toUpper", separator: false },
  { id: "ctx.lowercase", label: "To &Lowercase", action: "edit.toLower", separator: false },
  { id: "ctx.sep2", label: "", action: "", separator: true },
  { id: "ctx.comment", label: "Toggle &Comment", action: "edit.commentToggle", separator: false },
  { id: "ctx.sep3", label: "", action: "", separator: true },
  { id: "ctx.copyPath", label: "Copy File &Path", action: "edit.copyFilePath", separator: false },
];

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  items: DEFAULT_ITEMS,

  setItems: (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    set({ items });
  },

  addItem: (item) => {
    set((s) => {
      const next = [...s.items, item];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { items: next };
    });
  },

  removeItem: (id) => {
    set((s) => {
      const next = s.items.filter((i) => i.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { items: next };
    });
  },

  moveItem: (fromIndex, toIndex) => {
    set((s) => {
      if (
        fromIndex < 0 || fromIndex >= s.items.length ||
        toIndex < 0 || toIndex >= s.items.length ||
        fromIndex === toIndex
      ) return s;
      const next = [...s.items];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { items: next };
    });
  },

  loadItems: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CustomMenuItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ items: parsed });
          return;
        }
      }
    } catch {
      // Use defaults
    }
    set({ items: DEFAULT_ITEMS });
  },
}));
