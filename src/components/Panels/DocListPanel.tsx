import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import "./DocListPanel.css";

export function DocListPanel() {
  const { t } = useTranslation();
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);

  if (tabs.length === 0) {
    return (
      <div className="doclist-panel">
        <div className="doclist-empty">{t("doclist.empty")}</div>
      </div>
    );
  }

  return (
    <div className="doclist-panel">
      <div className="doclist-header">
        {tabs.length} {t("doclist.count")}
      </div>
      <div className="doclist-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`doclist-item ${tab.id === activeTabId ? "active" : ""} ${tab.modified ? "modified" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="doclist-icon">{tab.modified ? "●" : "○"}</span>
            <span className="doclist-name">{tab.name}</span>
            <button
              className="doclist-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
