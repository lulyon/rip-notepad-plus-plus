import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useEncodingStore } from "../../stores/encodingStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useGitStore } from "../../stores/gitStore";
import { useEffect } from "react";
import "./StatusBar.css";

export function StatusBar() {
  const { t } = useTranslation();
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const openEncodingDialog = useEncodingStore((s) => s.openEncodingDialog);
  const projectRoot = useSettingsStore((s) => s.projectRoot);
  const gitStatus = useGitStore((s) => s.status);
  const refreshStatus = useGitStore((s) => s.refreshStatus);

  // Refresh git status when project root changes
  useEffect(() => {
    if (projectRoot) {
      refreshStatus(projectRoot).catch(() => {});
    }
  }, [projectRoot, refreshStatus]);

  if (!activeTab) {
    return (
      <div className="status-bar">
        <span className="status-item">ripNotepad++</span>
        {gitStatus && (
          <span className="status-item git-branch-item" onClick={() => window.dispatchEvent(new CustomEvent("git-show-branches"))} title="Click to switch branch">
            ⎇ {gitStatus.branch}
          </span>
        )}
        <span className="status-item">Ready</span>
      </div>
    );
  }

  return (
    <div className="status-bar">
      <span className="status-item">
        {activeTab.modified ? "● " : ""}
        {activeTab.name}
      </span>
      <span className="status-item">{activeTab.language}</span>
      <span
        className="status-item status-clickable"
        onClick={openEncodingDialog}
        title={t("status.clickToChange")}
      >
        {activeTab.encoding}
      </span>
      <span className="status-item">
        Ln {activeTab.cursorLine}, Col {activeTab.cursorColumn}
      </span>
      {gitStatus && (
        <span className="status-item git-branch-item">
          ⎇ {gitStatus.branch}
          {gitStatus.ahead > 0 && ` ↑${gitStatus.ahead}`}
          {gitStatus.behind > 0 && ` ↓${gitStatus.behind}`}
        </span>
      )}
      {import.meta.env.DEV && activeTab && (
        <span className="status-item" style={{ fontSize: "10px", opacity: 0.5 }}>
          {(activeTab.content.length / 1024).toFixed(0)}KB
        </span>
      )}
    </div>
  );
}
