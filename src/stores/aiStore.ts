import { create } from "zustand";
import type { ApiProvider } from "../lib/aiClient";
import { detectProvider } from "../lib/aiClient";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** Search query used to produce this message (if any) */
  searchQuery?: string;
  /** Search results that informed this message (if any) */
  searchResults?: { url: string; title: string }[];
  /** Number of web searches performed for this message */
  searchCount?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: AiMessage[];
  streaming: boolean;
  streamThinking: string;
  error: string | null;
  createdAt: number;
}

interface AiState {
  // Shared config
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  provider: ApiProvider;

  // Web search toggle
  enableWebSearch: boolean;

  // Multi-conversation
  conversations: Conversation[];
  activeId: string | null;

  // Config actions
  setConfig: (url: string, key: string, model: string, provider?: ApiProvider) => void;
  loadFromClaudeConfig: () => Promise<boolean>;

  // Web search
  toggleWebSearch: () => void;

  // Conversation lifecycle
  newConversation: () => string;
  closeConversation: (id: string) => void;
  setActive: (id: string) => void;

  // Per-conversation actions
  addMessage: (convId: string, msg: AiMessage) => void;
  updateLastMessage: (convId: string, content: string) => void;
  updateLastMessageMeta: (convId: string, meta: Partial<AiMessage>) => void;
  setStreaming: (convId: string, v: boolean) => void;
  setStreamThinking: (convId: string, text: string) => void;
  setConvError: (convId: string, err: string | null) => void;
  clearMessages: (convId: string) => void;

  // Helpers
  getActive: () => Conversation | undefined;
  getConversation: (id: string) => Conversation | undefined;
}

// ── Persistence ──

const CONFIG_KEY = "ripnotepadpp-ai-config";
const CONVS_KEY = "ripnotepadpp-ai-conversations";
const OLD_CHAT_KEY = "ripnotepadpp-ai-chat";

interface PersistedConfig {
  url: string;
  key: string;
  model: string;
  enableWebSearch?: boolean;
  provider?: ApiProvider;
}

function loadConfig(): PersistedConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { url: "", key: "", model: "" };
}

function saveConfig(url: string, key: string, model: string, enableWebSearch: boolean, provider: ApiProvider) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key, model, enableWebSearch, provider }));
  } catch { /* ignore */ }
}

function loadConversations(): Conversation[] {
  // Migrate old single-chat data
  const old = localStorage.getItem(OLD_CHAT_KEY);
  if (old) {
    try {
      const oldMsgs: AiMessage[] = JSON.parse(old);
      localStorage.removeItem(OLD_CHAT_KEY);
      if (oldMsgs.length > 0) {
        const conv: Conversation = {
          id: `conv-1`,
          title: makeTitle(oldMsgs),
          messages: oldMsgs,
          streaming: false,
          streamThinking: "",
          error: null,
          createdAt: oldMsgs[0]?.timestamp || Date.now(),
        };
        const data = [conv];
        localStorage.setItem(CONVS_KEY, JSON.stringify(data));
        return data;
      }
    } catch { /* ignore */ }
  }
  // Normal load
  try {
    const raw = localStorage.getItem(CONVS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveConversations(_convs: Conversation[]) {
  // localStorage may be unavailable in test environments (opaque origin)
  try {
    localStorage.setItem(CONVS_KEY, JSON.stringify(_convs));
  } catch { /* ignore */ }
}

function makeTitle(msgs: AiMessage[]): string {
  const first = msgs.find((m) => m.role === "user");
  if (!first) return "New Chat";
  const t = first.content.replace(/\n/g, " ").trim();
  return t.length > 20 ? t.slice(0, 20) + "…" : t;
}

// ── Store ──

const savedConfig = loadConfig();
const initialConversations = loadConversations();
let convSeq = initialConversations.length;

export const useAiStore = create<AiState>((set, get) => ({
  apiBaseUrl: savedConfig.url || "https://api.deepseek.com/anthropic",
  apiKey: savedConfig.key || "",
  model: savedConfig.model || "deepseek-v4-pro",
  provider: savedConfig.provider || detectProvider(savedConfig.url || "https://api.deepseek.com/anthropic"),

  enableWebSearch: savedConfig.enableWebSearch !== false, // default true

  conversations: initialConversations,
  activeId: initialConversations.length > 0 ? initialConversations[0].id : null,

  // ── Config ──

  setConfig: (url, key, model, provider) => {
    const p = provider || detectProvider(url);
    saveConfig(url, key, model, get().enableWebSearch, p);
    set({ apiBaseUrl: url, apiKey: key, model, provider: p });
  },

  loadFromClaudeConfig: async () => {
    try {
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
      } catch { /* file not found */ }
    } catch { /* Tauri FS unavailable */ }
    return false;
  },

  // ── Web search ──

  toggleWebSearch: () => {
    set((s) => {
      const next = !s.enableWebSearch;
      saveConfig(s.apiBaseUrl, s.apiKey, s.model, next, s.provider);
      return { enableWebSearch: next };
    });
  },

  // ── Conversation lifecycle ──

  newConversation: () => {
    convSeq += 1;
    const id = `conv-${Date.now()}-${convSeq}`;
    const conv: Conversation = {
      id,
      title: "New Chat",
      messages: [],
      streaming: false,
      streamThinking: "",
      error: null,
      createdAt: Date.now(),
    };
    set((s) => {
      const conversations = [...s.conversations, conv];
      saveConversations(conversations);
      return { conversations, activeId: id };
    });
    return id;
  },

  closeConversation: (id: string) => {
    set((s) => {
      if (s.conversations.length <= 1) return s; // keep last tab
      const idx = s.conversations.findIndex((c) => c.id === id);
      const conversations = s.conversations.filter((c) => c.id !== id);
      saveConversations(conversations);
      let activeId = s.activeId;
      if (activeId === id) {
        const newIdx = Math.min(idx, conversations.length - 1);
        activeId = conversations[newIdx]?.id || null;
      }
      return { conversations, activeId };
    });
  },

  setActive: (id: string) => set({ activeId: id }),

  // ── Per-conversation actions ──

  addMessage: (convId, msg) => {
    set((s) => {
      const conversations = s.conversations.map((c) => {
        if (c.id !== convId) return c;
        const messages = [...c.messages, msg];
        // Auto-title from first user message
        const title = c.messages.length === 0 && msg.role === "user"
          ? makeTitle([msg])
          : c.title;
        return { ...c, messages, title };
      });
      saveConversations(conversations);
      return { conversations };
    });
  },

  updateLastMessage: (convId, content) => {
    set((s) => {
      const conversations = s.conversations.map((c) => {
        if (c.id !== convId) return c;
        const messages = [...c.messages];
        if (messages.length > 0 && messages[messages.length - 1].role === "assistant") {
          messages[messages.length - 1] = { ...messages[messages.length - 1], content };
        }
        return { ...c, messages };
      });
      saveConversations(conversations);
      return { conversations };
    });
  },

  updateLastMessageMeta: (convId, meta) => {
    set((s) => {
      const conversations = s.conversations.map((c) => {
        if (c.id !== convId) return c;
        const messages = [...c.messages];
        const lastIdx = messages.length - 1;
        if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
          messages[lastIdx] = { ...messages[lastIdx], ...meta };
        }
        return { ...c, messages };
      });
      saveConversations(conversations);
      return { conversations };
    });
  },

  setStreaming: (convId, v) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, streaming: v } : c
      ),
    }));
  },

  setStreamThinking: (convId, text) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, streamThinking: text } : c
      ),
    }));
  },

  setConvError: (convId, err) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, error: err, streaming: false } : c
      ),
    }));
  },

  clearMessages: (convId) => {
    set((s) => {
      const conversations = s.conversations.map((c) =>
        c.id === convId ? { ...c, messages: [], title: "New Chat", error: null } : c
      );
      saveConversations(conversations);
      return { conversations };
    });
  },

  // ── Helpers ──

  getActive: () => {
    const { conversations, activeId } = get();
    return conversations.find((c) => c.id === activeId);
  },

  getConversation: (id: string) => {
    return get().conversations.find((c) => c.id === id);
  },
}));
