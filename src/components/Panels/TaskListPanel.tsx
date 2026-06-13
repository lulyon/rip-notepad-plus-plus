import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import "./TaskListPanel.css";

interface Task {
  line: number;
  text: string;
  type: string;
}

const PATTERNS: { regex: RegExp; type: string }[] = [
  { regex: /\bTODO\b[:\s]*(.*)/i, type: "TODO" },
  { regex: /\bFIXME\b[:\s]*(.*)/i, type: "FIXME" },
  { regex: /\bHACK\b[:\s]*(.*)/i, type: "HACK" },
  { regex: /\bXXX\b[:\s]*(.*)/i, type: "XXX" },
  { regex: /\bNOTE\b[:\s]*(.*)/i, type: "NOTE" },
  { regex: /\bOPTIMIZE\b[:\s]*(.*)/i, type: "OPTIMIZE" },
  { regex: /\bBUG\b[:\s]*(.*)/i, type: "BUG" },
];

export function TaskListPanel() {
  const { t } = useTranslation();
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const activeTab = useEditorStore((s) => s.tabs.find((tb) => tb.id === activeTabId));
  const editorRef = useEditorRefStore((s) => s.editorRef);

  const tasks = useMemo(() => {
    if (!activeTab?.content) return [];
    const lines = activeTab.content.split("\n");
    const results: Task[] = [];
    for (let i = 0; i < lines.length; i++) {
      for (const pat of PATTERNS) {
        const match = lines[i].match(pat.regex);
        if (match) {
          results.push({ line: i + 1, text: (match[1] || lines[i]).trim(), type: pat.type });
          break; // One match per line
        }
      }
    }
    return results;
  }, [activeTab?.content]);

  const goToLine = useCallback((line: number) => {
    if (!editorRef) return;
    editorRef.revealLineInCenter(line);
    editorRef.setPosition({ lineNumber: line, column: 1 });
    editorRef.focus();
  }, [editorRef]);

  if (!activeTab) {
    return <div className="tasklist-panel"><div className="tasklist-empty">{t("tasklist.noFile")}</div></div>;
  }

  if (tasks.length === 0) {
    return <div className="tasklist-panel"><div className="tasklist-empty">{t("tasklist.empty")}</div></div>;
  }

  const typeColors: Record<string, string> = {
    TODO: "#4ec9b0", FIXME: "#f44747", HACK: "#c586c0",
    XXX: "#dcdcaa", NOTE: "#569cd6", OPTIMIZE: "#b5cea8", BUG: "#e2b714",
  };

  return (
    <div className="tasklist-panel">
      <div className="tasklist-header">{tasks.length} {t("tasklist.count")}</div>
      <div className="tasklist-list">
        {tasks.map((task, i) => (
          <div key={i} className="tasklist-item" onClick={() => goToLine(task.line)}>
            <span className="tasklist-type" style={{ color: typeColors[task.type] }}>
              {task.type}
            </span>
            <span className="tasklist-text">{task.text}</span>
            <span className="tasklist-line">:{task.line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
