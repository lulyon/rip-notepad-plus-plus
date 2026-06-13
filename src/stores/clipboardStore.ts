import { create } from "zustand";

export interface ClipboardEntry {
  id: number;
  text: string;
  time: number;
  pinned: boolean;
}

interface ClipboardState {
  entries: ClipboardEntry[];
  maxEntries: number;
  listening: boolean;

  startListening: () => void;
  stopListening: () => void;
  addEntry: (text: string) => void;
  removeEntry: (id: number) => void;
  togglePin: (id: number) => void;
  clearAll: () => void;
  search: (query: string) => ClipboardEntry[];
}

let nextId = 0;
let copyHandler: ((e: ClipboardEvent) => void) | null = null;

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  entries: [],
  maxEntries: 50,
  listening: false,

  startListening: () => {
    if (get().listening) return;
    copyHandler = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain")?.trim();
      if (text && text.length > 0 && text.length < 50000) {
        get().addEntry(text);
      }
    };
    document.addEventListener("copy", copyHandler);
    set({ listening: true });
  },

  stopListening: () => {
    if (copyHandler) {
      document.removeEventListener("copy", copyHandler);
      copyHandler = null;
    }
    set({ listening: false });
  },

  addEntry: (text: string) => {
    set((s) => {
      // Deduplicate: remove existing entry with same text
      const filtered = s.entries.filter((e) => e.text !== text);
      const entry: ClipboardEntry = {
        id: ++nextId,
        text,
        time: Date.now(),
        pinned: false,
      };
      const newEntries = [entry, ...filtered].slice(0, s.maxEntries);
      return { entries: newEntries };
    });
  },

  removeEntry: (id: number) => {
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },

  togglePin: (id: number) => {
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, pinned: !e.pinned } : e,
      ),
    }));
  },

  clearAll: () => {
    set({ entries: [] });
  },

  search: (query: string) => {
    const q = query.toLowerCase();
    return get().entries.filter((e) => e.text.toLowerCase().includes(q));
  },
}));
