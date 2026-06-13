import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { ipc } from "../../lib/ipc";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import "./TerminalPanel.css";

export function TerminalPanel({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTab = useEditorStore((s) =>
    s.tabs.find((tb) => tb.id === s.activeTabId),
  );
  const projectRoot = useSettingsStore((s) => s.projectRoot);

  const startTerminal = useCallback(async () => {
    if (!terminalRef.current) return;

    // Kill existing terminal
    await ipc.ptyKill().catch(() => {});

    // Determine working directory
    const cwd = projectRoot
      || (activeTab?.path
        ? activeTab.path.split(/[/\\]/).slice(0, -1).join("/") || "."
        : ".");

    // Create xterm instance
    const fitAddon = new FitAddon();
    const t = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#cccccc",
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
    t.loadAddon(fitAddon);
    t.open(terminalRef.current);
    fitAddon.fit();

    term.current = t;

    // Resize on window resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    // Send keystrokes to PTY
    t.onData((data) => {
      ipc.ptyWrite(data).catch(() => {});
    });

    // Spawn shell
    t.writeln(`\x1b[90mStarting shell in: ${cwd}\x1b[0m`);
    try {
      await ipc.ptySpawn(cwd);
    } catch (err) {
      t.writeln(`\r\n\x1b[31m[ERROR] Failed to start shell: ${err}\x1b[0m`);
      return;
    }
    t.writeln(`\x1b[90mShell spawned, waiting for output...\x1b[0m`);

    // Poll for output
    pollTimer.current = setInterval(async () => {
      try {
        const data = await ipc.ptyRead();
        if (data && term.current) {
          term.current.write(data);
        }
      } catch (_) {
        // PTY might be gone
      }
    }, 50);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [activeTab?.path, projectRoot]);

  useEffect(() => {
    startTerminal();

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      term.current?.dispose();
      ipc.ptyKill().catch(() => {});
    };
  }, [startTerminal]);

  return (
    <div className="terminal-panel">
      {!embedded && (
        <div className="terminal-header">
          <span>⎇ {t("terminal.title")}</span>
          <button className="terminal-restart-btn" onClick={startTerminal} title={t("terminal.restart")}>↻</button>
        </div>
      )}
      <div ref={terminalRef} className="terminal-container" />
    </div>
  );
}
