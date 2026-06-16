import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { ipc } from "../../lib/ipc";
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";
import "./Terminal.css";

interface Props {
  visible: boolean;
}

export function TerminalPanel({ visible }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XtermTerminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const cancelledRef = useRef(false);
  const [sessionId, setSessionId] = useState(() => `term-${Date.now()}`);
  const [started, setStarted] = useState(false);
  const [exited, setExited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Spawn PTY ──

  const spawnPty = useCallback(async (sid: string) => {
    try {
      setError(null);
      await ipc.ptySpawn(sid, undefined, undefined, 80, 24);
      setStarted(true);
      setExited(false);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }, []);

  const startTerminal = async () => {
    await spawnPty(sessionId);
  };

  // ── Restart after exit ──

  const restartTerminal = async () => {
    // Kill old PTY
    ipc.ptyKill(sessionId).catch(() => {});
    // Dispose old xterm
    unlistenRef.current?.();
    unlistenRef.current = null;
    cancelledRef.current = true;
    termRef.current?.dispose();
    termRef.current = null;
    fitRef.current = null;
    // New session
    const newId = `term-${Date.now()}`;
    setSessionId(newId);
    setStarted(false);
    setExited(false);
    await spawnPty(newId);
  };

  // ── Init xterm ──

  useEffect(() => {
    if (!started || !containerRef.current || termRef.current) return;

    cancelledRef.current = false;
    const term = new XtermTerminal({
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
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    // User input → PTY (no exited check needed; dead writes harmlessly fail)
    term.onData((data) => {
      const bytes = new TextEncoder().encode(data);
      ipc.ptyWrite(sessionId, Array.from(bytes)).catch(() => {});
    });

    // PTY output → terminal
    listen<{ id: string; data?: number[]; error?: string; type?: string }>(
      "pty://data",
      (e) => {
        if (e.payload.id !== sessionId) return;
        if (e.payload.data) {
          term.write(new Uint8Array(e.payload.data));
        }
        if (e.payload.type === "exit") {
          term.writeln("\r\n\x1b[33m[Process exited — click Restart to reopen]\x1b[0m");
          setExited(true);
        }
      },
    ).then((fn) => {
      if (cancelledRef.current) {
        fn(); // unlisten immediately if cancelled
      } else {
        unlistenRef.current = fn;
      }
    });

    termRef.current = term;
    fitRef.current = fit;

    const handleResize = () => {
      if (!fitRef.current) return;
      try {
        fitRef.current.fit();
        const dims = fitRef.current.proposeDimensions();
        if (dims) {
          ipc.ptyResize(sessionId, dims.cols, dims.rows).catch(() => {});
        }
      } catch { /* container may be hidden */ }
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
  }, [started, sessionId]);

  // ── Kill PTY on unmount ──

  useEffect(() => {
    return () => {
      ipc.ptyKill(sessionId).catch(() => {});
    };
  }, [sessionId]);

  // ── Refit on visibility ──

  useEffect(() => {
    if (visible && fitRef.current && !exited) {
      setTimeout(() => {
        try {
          fitRef.current?.fit();
          const dims = fitRef.current?.proposeDimensions();
          if (dims) {
            ipc.ptyResize(sessionId, dims.cols, dims.rows).catch(() => {});
          }
        } catch { /* ignore */ }
      }, 100);
    }
  }, [visible, sessionId, exited]);

  // ── Render ──

  return (
    <div className="terminal-panel" style={{ display: visible ? "flex" : "none" }}>
      {!started ? (
        <div className="terminal-empty">
          {error ? (
            <div className="terminal-error">
              <p>{t("terminal.spawnFailed")}: {error}</p>
              <button className="terminal-start-btn" onClick={startTerminal}>
                ↻ {t("terminal.retry")}
              </button>
            </div>
          ) : (
            <button className="terminal-start-btn" onClick={startTerminal}>
              ▶ {t("terminal.start")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div ref={containerRef} className={`terminal-container${exited ? " exited" : ""}`} />
          {exited && (
            <div className="terminal-restart-bar">
              <span>{t("terminal.exited")}</span>
              <button className="terminal-restart-btn" onClick={restartTerminal}>
                ↻ {t("terminal.restart")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
