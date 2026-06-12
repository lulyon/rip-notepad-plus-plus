import { useEditorStore } from "../../stores/editorStore";
import "./StatusBar.css";

export function StatusBar() {
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="status-bar">
        <span className="status-item">ripNotepad++</span>
        <span className="status-item">Ready</span>
      </div>
    );
  }

  return (
    <div className="status-bar">
      <span className="status-item">
        {activeTab.modified ? "●" : ""} {activeTab.name}
      </span>
      <span className="status-item">{activeTab.language}</span>
      <span className="status-item">{activeTab.encoding}</span>
      <span className="status-item">
        Ln {1}, Col {1}
      </span>
    </div>
  );
}
