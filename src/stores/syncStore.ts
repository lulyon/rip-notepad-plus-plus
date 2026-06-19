import { create } from "zustand";
import {
  buildSyncPayload,
  applySyncPayload,
  githubCreateGist,
  githubGetGist,
  githubUpdateGist,
} from "../lib/sync";

// ── Types ──

export interface SyncState {
  // Persisted config
  provider: "github_gist" | null;
  githubToken: string;
  githubGistId: string | null;
  lastSyncTimestamp: number | null;

  // Transient UI state
  syncStatus: "idle" | "exporting" | "importing" | "success" | "error";
  lastError: string | null;

  // Actions
  setGithubToken: (token: string) => void;
  setGithubGistId: (id: string | null) => void;
  exportSettings: () => Promise<void>;
  importSettings: () => Promise<void>;
  resetStatus: () => void;
}

// ── Persistence ──

const STORAGE_KEY = "ripnotepadpp-sync-config";

function loadConfig(): Partial<SyncState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return {};
}

function saveConfig(state: SyncState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      provider: state.provider,
      githubToken: state.githubToken,
      githubGistId: state.githubGistId,
      lastSyncTimestamp: state.lastSyncTimestamp,
    }));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ── Store ──

const saved = loadConfig();

export const useSyncStore = create<SyncState>((set, get) => ({
  // Initial state from localStorage
  provider: saved.provider || null,
  githubToken: saved.githubToken || "",
  githubGistId: saved.githubGistId || null,
  lastSyncTimestamp: saved.lastSyncTimestamp || null,
  syncStatus: "idle",
  lastError: null,

  // ── Config actions ──

  setGithubToken: (token: string) => {
    set({ githubToken: token });
    saveConfig(get());
  },

  setGithubGistId: (id: string | null) => {
    set({ githubGistId: id });
    saveConfig(get());
  },

  resetStatus: () => set({ syncStatus: "idle", lastError: null }),

  // ── Sync actions ──

  exportSettings: async () => {
    const state = get();
    if (!state.githubToken) {
      set({ syncStatus: "error", lastError: "Enter a Personal Access Token first" });
      return;
    }
    set({ syncStatus: "exporting", lastError: null });
    try {
      const payload = buildSyncPayload();
      const json = JSON.stringify(payload, null, 2);
      if (state.githubGistId) {
        await githubUpdateGist(state.githubToken, state.githubGistId, json);
      } else {
        const { id } = await githubCreateGist(state.githubToken, json);
        set({ githubGistId: id });
      }
      set({ syncStatus: "success", lastSyncTimestamp: Date.now() });
      saveConfig(get());
    } catch (err: unknown) {
      set({
        syncStatus: "error",
        lastError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  importSettings: async () => {
    const state = get();
    if (!state.githubToken) {
      set({ syncStatus: "error", lastError: "Enter a Personal Access Token first" });
      return;
    }
    if (!state.githubGistId) {
      set({ syncStatus: "error", lastError: "Export to Cloud first to create a sync file" });
      return;
    }
    set({ syncStatus: "importing", lastError: null });
    try {
      const content = await githubGetGist(state.githubToken, state.githubGistId);
      const payload = JSON.parse(content);
      if (!payload.version || !payload.settings) {
        throw new Error("Invalid sync data — corrupted or outdated format");
      }
      applySyncPayload(payload);
      set({ syncStatus: "success", lastSyncTimestamp: Date.now() });
      saveConfig(get());
    } catch (err: unknown) {
      set({
        syncStatus: "error",
        lastError: err instanceof Error ? err.message : String(err),
      });
    }
  },
}));

// ── Test helper ──

export function resetSyncStore() {
  useSyncStore.setState({
    provider: null,
    githubToken: "",
    githubGistId: null,
    lastSyncTimestamp: null,
    syncStatus: "idle",
    lastError: null,
  });
}
