import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UdlConfig {
  id: string;
  name: string;
  extensions: string[];
  lineComment: string;
  blockCommentStart: string;
  blockCommentEnd: string;
  keywords: string[];       // 8 groups
  keywordColors: string[];  // CSS color per group, default black
  operators: string;
  delimiters: string;
  stringChars: string;
  caseSensitive: boolean;
  autoIndent: boolean;
}

interface UdlState {
  udls: UdlConfig[];

  addUdl: (udl: UdlConfig) => void;
  updateUdl: (id: string, udl: Partial<UdlConfig>) => void;
  deleteUdl: (id: string) => void;
  getUdl: (id: string) => UdlConfig | undefined;
}

function generateId(): string {
  return `udl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultUdl(): UdlConfig {
  return {
    id: generateId(),
    name: "",
    extensions: [],
    lineComment: "//",
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    keywords: ["", "", "", "", "", "", "", ""],
    keywordColors: [
      "#569cd6", "#ce9178", "#6a9955", "#dcdcaa",
      "#c586c0", "#9cdcfe", "#d4d4d4", "#4ec9b0",
    ],
    operators: "+-*/=<>!&|~^%",
    delimiters: "() [] {}",
    stringChars: "\"'",
    caseSensitive: true,
    autoIndent: true,
  };
}

const STORAGE_KEY = "ripnotepadpp-udls";

export const useUdlStore = create<UdlState>()(
  persist(
    (set, get) => ({
      udls: [],

      addUdl: (udl) => {
        set((s) => ({ udls: [...s.udls, udl] }));
      },

      updateUdl: (id, partial) => {
        set((s) => ({
          udls: s.udls.map((u) => (u.id === id ? { ...u, ...partial } : u)),
        }));
      },

      deleteUdl: (id) => {
        set((s) => ({ udls: s.udls.filter((u) => u.id !== id) }));
      },

      getUdl: (id) => {
        return get().udls.find((u) => u.id === id);
      },

      loadUdls: () => {
        try {
          const data = localStorage.getItem(STORAGE_KEY);
          if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              set({ udls: parsed });
            }
          }
        } catch {
          // ignore
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ udls: state.udls }),
    },
  ),
);
