import { useSettingsStore } from "../stores/settingsStore";
import { useAiStore } from "../stores/aiStore";
import type { ApiProvider } from "./aiClient";

export const SYNC_VERSION = 1;
export const GIST_FILENAME = "ripnotepadpp-sync.json";
const API_BASE = "https://api.github.com/gists";

// ── Types ──

export interface SyncPayload {
  version: 1;
  timestamp: number;
  source: string;
  settings: {
    app: Record<string, unknown>;
    shortcuts: Record<string, string>;
    aiConfig: {
      apiBaseUrl: string;
      model: string;
      enableWebSearch: boolean;
      provider: string;
    };
  };
}

// ── Build Payload ──

/** Read current settings from live stores and return a serializable payload. */
export function buildSyncPayload(): SyncPayload {
  const s = useSettingsStore.getState();
  const ai = useAiStore.getState();

  return {
    version: 1,
    timestamp: Date.now(),
    source: "ripNotepad++ 0.3.0",
    settings: {
      app: {
        fontSize: s.fontSize,
        fontFamily: s.fontFamily,
        tabSize: s.tabSize,
        insertSpaces: s.insertSpaces,
        wordWrap: s.wordWrap,
        lineNumbers: s.lineNumbers,
        renderWhitespace: s.renderWhitespace,
        showIndentGuides: s.showIndentGuides,
        showMinimap: s.showMinimap,
        minimapWidth: s.minimapWidth,
        minimapShowSlider: s.minimapShowSlider,
        bracketPairColorization: s.bracketPairColorization,
        smoothScrolling: s.smoothScrolling,
        scrollBeyondLastLine: s.scrollBeyondLastLine,
        splitView: s.splitView,
        showMenuBar: s.showMenuBar,
        showStatusBar: s.showStatusBar,
        showSidebar: s.showSidebar,
        sidebarWidth: s.sidebarWidth,
        fullScreen: s.fullScreen,
        alwaysOnTop: s.alwaysOnTop,
        autoSave: s.autoSave,
        autoCheckUpdate: s.autoCheckUpdate,
        columnMode: s.columnMode,
        defaultEncoding: s.defaultEncoding,
        defaultLanguage: s.defaultLanguage,
        defaultEol: s.defaultEol,
        theme: s.theme,
      },
      shortcuts: { ...s.shortcuts },
      aiConfig: {
        apiBaseUrl: ai.apiBaseUrl,
        model: ai.model,
        enableWebSearch: ai.enableWebSearch,
        provider: ai.provider,
        // apiKey intentionally excluded — device-specific secret
      },
    },
  };
}

// ── Apply Payload ──

/** Apply a sync payload to live stores. Preserves existing apiKey. */
export function applySyncPayload(payload: SyncPayload): { applied: number } {
  const s = useSettingsStore.getState();
  let count = 0;

  // Apply app settings one-by-one (updateSetting persists each individually)
  for (const [key, value] of Object.entries(payload.settings.app)) {
    if (value !== undefined && key in s) {
      s.updateSetting(key as keyof typeof s, value as never);
      count++;
    }
  }

  // Apply shortcuts
  for (const [actionId, keybind] of Object.entries(payload.settings.shortcuts)) {
    s.setShortcut(actionId, keybind);
    count++;
  }

  // Apply AI config — preserve existing apiKey (not synced)
  const ai = useAiStore.getState();
  const ac = payload.settings.aiConfig;
  ai.setConfig(ac.apiBaseUrl, ai.apiKey, ac.model, ac.provider as ApiProvider);
  count++;

  return { applied: count };
}

// ── GitHub Gist API ──

function headers(token: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "ripNotepad++/0.3.0",
    "Content-Type": "application/json",
  };
}

async function githubError(res: Response): Promise<string> {
  const s = res.status;
  let detail = "";
  try {
    const body = await res.json();
    detail = body.message || "";
  } catch {
    // ignore parse errors
  }
  if (s === 401) return "Invalid or expired token";
  if (s === 404) return "Sync file not found — export first to create one";
  if (s === 403) {
    return detail.includes("rate limit")
      ? "GitHub API rate limited — try again in an hour"
      : "Check token scope — needs \"gist\" permission";
  }
  if (s === 422) return "Validation error: " + (detail || "check your input");
  return `GitHub API error ${s}${detail ? ": " + detail : ""}`;
}

export async function githubCreateGist(
  token: string,
  content: string,
): Promise<{ id: string; htmlUrl: string }> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      description: "ripNotepad++ settings sync",
      public: false,
      files: { [GIST_FILENAME]: { content } },
    }),
  });
  if (!res.ok) throw new Error(await githubError(res));
  const data = await res.json();
  return { id: data.id, htmlUrl: data.html_url };
}

export async function githubGetGist(
  token: string,
  gistId: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/${gistId}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await githubError(res));
  const data = await res.json();
  const file = data.files?.[GIST_FILENAME];
  if (!file?.content) throw new Error("Sync file not found in Gist — export first to create one");
  return file.content;
}

export async function githubUpdateGist(
  token: string,
  gistId: string,
  content: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/${gistId}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content } },
    }),
  });
  if (!res.ok) throw new Error(await githubError(res));
}
