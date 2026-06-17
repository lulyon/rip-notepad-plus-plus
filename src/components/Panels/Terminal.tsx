import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { ipc } from "../../lib/ipc";
import { listen } from "@tauri-apps/api/event";
import { useEditorStore } from "../../stores/editorStore";
import type { UnlistenFn } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";
import "./Terminal.css";

// ── Types ──

interface Props {
  visible: boolean;
}

interface TabInfo {
  id: string;
  sessionId: string;
  title: string;
  started: boolean;
  exited: boolean;
  error: string | null;
}

// ── Helpers ──

let tabCounter = 0;

function shellName(): string {
  const s = (typeof navigator !== "undefined" && (navigator as any).userAgentData?.platform) || "";
  if (s.includes("Win")) return "pwsh";
  return "zsh";
}

function makeTabTitle(cwd: string | undefined): string {
  if (cwd) {
    const i = Math.max(cwd.lastIndexOf("/"), cwd.lastIndexOf("\\"));
    if (i >= 0 && i < cwd.length - 1) return cwd.slice(i + 1);
    if (cwd === "/") return "/";
    return cwd;
  }
  return shellName();
}

function createTab(cwd: string | undefined): TabInfo {
  tabCounter += 1;
  const ts = Date.now();
  return {
    id: `tab-${ts}-${tabCounter}`,
    sessionId: `term-${ts}-${tabCounter}`,
    title: makeTabTitle(cwd),
    started: false,
    exited: false,
    error: null,
  };
}

function useWorkDir(): string | undefined {
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab?.path) return undefined;
  const i = Math.max(tab.path.lastIndexOf("/"), tab.path.lastIndexOf("\\"));
  return i > 0 ? tab.path.slice(0, i) : undefined;
}

// ── Xterm theme ──

const XTERM_OPTIONS = {
  fontSize: 12,
  fontFamily: "Menlo, Monaco, 'Courier New', monospace",
  cursorBlink: true,
  allowProposedApi: true,
  theme: {
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    cursor: "#d4d4d4",
    selectionBackground: "#264f78",
    black: "#000000",
    red: "#cd3131",
    green: "#0dbc79",
    yellow: "#e5e510",
    blue: "#2472c8",
    magenta: "#bc3fbc",
    cyan: "#11a8cd",
    white: "#e5e5e5",
    brightBlack: "#666666",
    brightRed: "#f14c4c",
    brightGreen: "#23d18b",
    brightYellow: "#f5f543",
    brightBlue: "#3b8eea",
    brightMagenta: "#d670d6",
    brightCyan: "#29b8db",
    brightWhite: "#e5e5e5",
  },
};

// ── Single Terminal Tab ──

interface TabPaneProps {
  tab: TabInfo;
  visible: boolean;
  workDir: string | undefined;
  onStart: (tabId: string) => void;
  onExit: (tabId: string) => void;
  onError: (tabId: string, err: string | null) => void;
  onRestart: (tabId: string) => void;
}

function TerminalTabPane({ tab, visible, workDir, onStart, onExit, onError, onRestart }: TabPaneProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XtermTerminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const cancelledRef = useRef(false);

  // ── Spawn PTY ──

  const spawn = useCallback(async () => {
    try {
      onError(tab.id, null);
      await ipc.ptySpawn(tab.sessionId, undefined, workDir, 80, 24);
      onStart(tab.id);
    } catch (e: any) {
      onError(tab.id, e?.message || String(e));
    }
  }, [tab.id, tab.sessionId, workDir, onStart, onError]);

  // Trigger spawn from parent
  useEffect(() => {
    if (tab.started || tab.error) return;
    // Auto-spawn when tab mounts (first time)
    const timer = setTimeout(() => spawn(), 100);
    return () => clearTimeout(timer);
  }, []); // only on mount

  // ── Restart ──

  const restart = useCallback(async () => {
    ipc.ptyKill(tab.sessionId).catch(() => {});
    unlistenRef.current?.();
    unlistenRef.current = null;
    cancelledRef.current = true;
    termRef.current?.dispose();
    termRef.current = null;
    fitRef.current = null;
    if (containerRef.current) containerRef.current.innerHTML = "";
    // Reset & respawn
    onRestart(tab.id);
    setTimeout(() => spawn(), 50);
  }, [tab.id, tab.sessionId, spawn, onRestart]);

  // ── Init xterm ──

  useEffect(() => {
    if (!tab.started || !containerRef.current || termRef.current) return;

    cancelledRef.current = false;
    const term = new XtermTerminal(XTERM_OPTIONS);
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    term.onData((data) => {
      const bytes = new TextEncoder().encode(data);
      ipc.ptyWrite(tab.sessionId, Array.from(bytes)).catch(() => {});
    });

    listen<{ id: string; data?: number[]; error?: string; type?: string }>(
      "pty://data",
      (e) => {
        if (e.payload.id !== tab.sessionId) return;
        if (e.payload.data) {
          term.write(new Uint8Array(e.payload.data));
        }
        if (e.payload.type === "exit") {
          term.writeln("\r\n\x1b[33m[Process exited — click Restart to reopen]\x1b[0m");
          onExit(tab.id);
        }
      },
    ).then((fn) => {
      if (cancelledRef.current) fn();
      else unlistenRef.current = fn;
    });

    termRef.current = term;
    fitRef.current = fit;

    const handleResize = () => {
      if (!fitRef.current) return;
      try {
        fitRef.current.fit();
        const dims = fitRef.current.proposeDimensions();
        if (dims) ipc.ptyResize(tab.sessionId, dims.cols, dims.rows).catch(() => {});
      } catch { /* hidden */ }
    };

    const observer = new ResizeObserver(() => handleResize());
    observer.observe(containerRef.current);
    setTimeout(() => handleResize(), 200);

    return () => {
      cancelledRef.current = true;
      observer.disconnect();
      unlistenRef.current?.();
      unlistenRef.current = null;
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [tab.started, tab.sessionId]);

  // ── Kill PTY on unmount ──

  useEffect(() => {
    return () => {
      ipc.ptyKill(tab.sessionId).catch(() => {});
    };
  }, [tab.sessionId]);

  // ── Refit on visibility ──

  useEffect(() => {
    if (visible && fitRef.current && !tab.exited) {
      setTimeout(() => {
        try {
          fitRef.current?.fit();
          const dims = fitRef.current?.proposeDimensions();
          if (dims) ipc.ptyResize(tab.sessionId, dims.cols, dims.rows).catch(() => {});
        } catch { /* ignore */ }
      }, 100);
    }
  }, [visible, tab.sessionId, tab.exited]);

  // ── Render ──

  return (
    <div className="terminal-tab-pane" style={{ display: visible ? "flex" : "none" }}>
      {!tab.started ? (
        <div className="terminal-empty">
          {tab.error ? (
            <div className="terminal-error">
              <p>{t("terminal.spawnFailed")}: {tab.error}</p>
              <button className="terminal-start-btn" onClick={spawn}>
                ↻ {t("terminal.retry")}
              </button>
            </div>
          ) : (
            <button className="terminal-start-btn" onClick={spawn}>
              ▶ {t("terminal.start")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div ref={containerRef} className={`terminal-container${tab.exited ? " exited" : ""}`} />
          {tab.exited && (
            <div className="terminal-restart-bar">
              <span>{t("terminal.exited")}</span>
              <button className="terminal-restart-btn" onClick={restart}>
                ↻ {t("terminal.restart")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Terminal Panel (tab manager) ──

export function TerminalPanel({ visible }: Props) {
  const { t } = useTranslation();
  const workDir = useWorkDir();
  const [tabs, setTabs] = useState<TabInfo[]>(() => [createTab(workDir)]);
  const [activeIdx, setActiveIdx] = useState(0);

  // ── Tab actions ──

  const addTab = useCallback(() => {
    const newTab = createTab(workDir);
    setTabs((prev) => [...prev, newTab]);
    setActiveIdx((prev) => prev + 1); // switch to new tab
  }, [workDir]);

  const closeTab = useCallback((idx: number) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev; // never close last tab
      const tab = prev[idx];
      // Kill PTY (component unmount handles xterm disposal)
      ipc.ptyKill(tab.sessionId).catch(() => {});
      const next = prev.filter((_, i) => i !== idx);
      return next;
    });
    setActiveIdx((prev) => {
      if (prev >= idx) return Math.max(0, prev - 1);
      return prev;
    });
  }, []);

  const updateTab = useCallback((tabId: string, patch: Partial<TabInfo>) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t)));
  }, []);

  const handleStart = useCallback((tabId: string) => {
    updateTab(tabId, { started: true, exited: false, error: null });
  }, [updateTab]);

  const handleExit = useCallback((tabId: string) => {
    updateTab(tabId, { exited: true });
  }, [updateTab]);

  const handleError = useCallback((tabId: string, err: string | null) => {
    updateTab(tabId, { error: err });
  }, [updateTab]);

  const handleRestart = useCallback((tabId: string) => {
    updateTab(tabId, { started: false, exited: false, error: null });
  }, [updateTab]);

  // ── Kill all PTYs on unmount ──

  useEffect(() => {
    return () => {
      for (const tab of tabs) {
        ipc.ptyKill(tab.sessionId).catch(() => {});
      }
    };
  }, []);

  // ── Render ──

  return (
    <div className="terminal-panel" style={{ display: visible ? "flex" : "none" }}>
      {/* Tab bar */}
      <div className="terminal-tab-bar">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            className={`terminal-tab ${i === activeIdx ? "active" : ""}`}
            onClick={() => setActiveIdx(i)}
            title={tab.sessionId}
          >
            <span className="terminal-tab-title">
              {tab.exited ? "⚫" : tab.started ? "🟢" : "⚪"} {tab.title}
            </span>
            {tabs.length > 1 && (
              <span
                className="terminal-tab-close"
                onClick={(e) => { e.stopPropagation(); closeTab(i); }}
                title={t("tab.close")}
              >×</span>
            )}
          </button>
        ))}
        <button className="terminal-tab terminal-tab-plus" onClick={addTab} title={t("terminal.newTab")}>
          +
        </button>
      </div>

      {/* Tab panes */}
      {tabs.map((tab, i) => (
        <TerminalTabPane
          key={tab.id}
          tab={tab}
          visible={visible && i === activeIdx}
          workDir={workDir}
          onStart={handleStart}
          onExit={handleExit}
          onError={handleError}
          onRestart={handleRestart}
        />
      ))}
    </div>
  );
}
