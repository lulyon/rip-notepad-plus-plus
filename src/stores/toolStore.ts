import { create } from "zustand";

export interface ExternalTool {
  id: string;
  name: string;
  command: string;
  cwd: string; // empty = use project root
  shortcut: string; // e.g. "Ctrl+Shift+1"
}

interface ToolState {
  tools: ExternalTool[];
  addTool: (tool: ExternalTool) => void;
  updateTool: (id: string, tool: Partial<ExternalTool>) => void;
  removeTool: (id: string) => void;
  loadTools: () => void;
}

const STORAGE_KEY = "ripnotepadpp-tools";

export const useToolStore = create<ToolState>((set) => ({
  tools: (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })(),

  addTool: (tool) => {
    set((s) => {
      const next = [...s.tools, tool];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { tools: next };
    });
  },

  updateTool: (id, partial) => {
    set((s) => {
      const next = s.tools.map((t) => (t.id === id ? { ...t, ...partial } : t));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { tools: next };
    });
  },

  removeTool: (id) => {
    set((s) => {
      const next = s.tools.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { tools: next };
    });
  },

  loadTools: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) set({ tools: JSON.parse(raw) });
    } catch {}
  },
}));
