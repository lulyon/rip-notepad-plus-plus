import { useState, useEffect, useRef } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { ipc } from "../../lib/ipc";
import "./RunDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RunDialog({ open, onClose }: Props) {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeTab = useEditorStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId),
  );

  useEffect(() => {
    if (open) {
      // Default: open in browser for HTML files
      if (activeTab?.language === "html") {
        setCommand(activeTab.path ? `open ${activeTab.path}` : "");
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, activeTab]);

  const executeCommand = async () => {
    const cmd = command.trim();
    if (!cmd) return;

    setOutput((p) => p + `> ${cmd}\n`);
    setRunning(true);

    try {
      const cwd = activeTab?.path
        ? activeTab.path.split(/[/\\]/).slice(0, -1).join("/") || undefined
        : undefined;
      const result = await ipc.runCommand(cmd, cwd);
      setOutput((p) => p + `${result.stdout}${result.stderr ? `\n[stderr]\n${result.stderr}` : ""}`);
      if (result.exit_code !== 0) {
        setOutput((p) => p + `\n[exit code: ${result.exit_code}]`);
      }
    } catch (err) {
      setOutput((p) => p + `Error: ${err}\n`);
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog run-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Run Command</h2>
        <div className="run-row">
          <input
            ref={inputRef}
            type="text"
            className="run-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={running}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && !running) {
                await executeCommand();
              }
            }}
            placeholder="Enter a shell command..."
          />
          <button
            className="btn run-btn"
            onClick={executeCommand}
            disabled={running || !command.trim()}
          >
            {running ? "Running..." : "Run"}
          </button>
        </div>

        {output && (
          <pre className="run-output">{output}</pre>
        )}

        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
