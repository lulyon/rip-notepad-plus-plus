import { create } from "zustand";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AiState {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  messages: AiMessage[];
  streaming: boolean;
  conversationTitle: string;

  setConfig: (url: string, key: string, model: string) => void;
  addMessage: (msg: AiMessage) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (v: boolean) => void;
  clearMessages: () => void;
  loadFromClaudeConfig: () => Promise<boolean>;
}

const STORAGE_KEY = "ripnotepadpp-ai-config";
const CHAT_KEY = "ripnotepadpp-ai-chat";

function loadSavedConfig(): { url: string; key: string; model: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { url: "", key: "", model: "" };
}

function saveConfig(url: string, key: string, model: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key, model }));
}

function loadSavedChat(): AiMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

const saved = loadSavedConfig();

export const useAiStore = create<AiState>((set, get) => ({
  apiBaseUrl: saved.url || "https://api.deepseek.com/anthropic",
  apiKey: saved.key || "",
  model: saved.model || "deepseek-v4-pro[1m]",
  messages: loadSavedChat(),
  streaming: false,
  conversationTitle: "AI Chat",

  setConfig: (url, key, model) => {
    saveConfig(url, key, model);
    set({ apiBaseUrl: url, apiKey: key, model });
  },

  addMessage: (msg) => {
    set((s) => {
      const next = [...s.messages, msg];
      localStorage.setItem(CHAT_KEY, JSON.stringify(next));
      return { messages: next };
    });
  },

  updateLastMessage: (content) => {
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
      }
      localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
      return { messages: msgs };
    });
  },

  setStreaming: (v) => set({ streaming: v }),

  clearMessages: () => {
    localStorage.removeItem(CHAT_KEY);
    set({ messages: [] });
  },

  loadFromClaudeConfig: async () => {
    try {
      // Read ~/.claude/settings.json via Tauri fs plugin
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const homeDir = (await import("@tauri-apps/api/path")).homeDir();
      const configPath = `${homeDir}.claude/settings.json`;
      try {
        const raw = await readTextFile(configPath);
        const config = JSON.parse(raw);
        const env = config?.env || {};
        if (env.ANTHROPIC_BASE_URL && env.ANTHROPIC_AUTH_TOKEN) {
          const url = env.ANTHROPIC_BASE_URL;
          const key = env.ANTHROPIC_AUTH_TOKEN;
          const model = env.ANTHROPIC_MODEL || "deepseek-v4-pro[1m]";
          get().setConfig(url, key, model);
          return true;
        }
      } catch { /* file not found or parse error */ }
    } catch {}
    return false;
  },
}));
