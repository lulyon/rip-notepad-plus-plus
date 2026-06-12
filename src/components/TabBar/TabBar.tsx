import { useState, useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { TabContextMenu } from "./TabContextMenu";
import "./TabBar.css";

export function TabBar() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const newTab = useEditorStore((s) => s.newTab);

  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      setContextMenu({ tabId, x: e.clientX, y: e.clientY });
    },
    [],
  );

  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
          >
            <span className="tab-label">
              {tab.modified ? "● " : ""}
              {tab.name}
            </span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              title="Close"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="tab-new" onClick={newTab} title="New file (Ctrl+N)">
        +
      </button>

      {contextMenu && (
        <TabContextMenu
          tabId={contextMenu.tabId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
