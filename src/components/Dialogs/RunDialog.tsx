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
            onKeyDown={(e) => {
              if (e.key === "Enter" && command.trim()) {
                setOutput(`> ${command}\n`);
                if (command.startsWith("open ") && activeTab?.path) {
                  ipc.openInBrowser(activeTab.path).catch((err) => {
                    setOutput((p) => p + `Error: ${err}\n`);
                  });
                } else {
                  setOutput((p) => p + "Command execution not available in dev mode\n");
                }
              }
            }}
            placeholder="open index.html / command..."
          />
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
