import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useGitStore } from "../../stores/gitStore";
import { ipc } from "../../lib/ipc";
import "./GitPanel.css";

export function GitPanel() {
  const { t } = useTranslation();
  const projectRoot = useSettingsStore((s) => s.projectRoot);
  const { status, loading, error, refreshStatus, clearStatus } = useGitStore();
  const [diffFile, setDiffFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState("");

  useEffect(() => {
    if (projectRoot) {
      refreshStatus(projectRoot);
    } else {
      clearStatus();
    }
  }, [projectRoot, refreshStatus, clearStatus]);

  const handleOpenDiff = async (filePath: string) => {
    if (!projectRoot) return;
    setDiffFile(filePath);
    try {
      const diff = await ipc.gitDiffFile(projectRoot, filePath);
      setDiffContent(diff);
    } catch {
      setDiffContent("Failed to load diff");
    }
  };

  const handleOpenFile = async (filePath: string) => {
    const tabs = useEditorStore.getState().tabs;
    const existing = tabs.find((t) => t.path === filePath);
    if (existing) {
      useEditorStore.getState().setActiveTab(existing.id);
    } else {
      try {
        const data = await ipc.readFile(filePath);
        useEditorStore.getState().openTab({
          path: filePath,
          name: filePath.split(/[/\\]/).pop() || filePath,
          content: data.content,
          encoding: data.encoding,
          language: "",
        });
      } catch (err) {
        console.error("Failed to open:", err);
      }
    }
  };

  if (!projectRoot) {
    return (
      <div className="git-panel">
        <div className="git-empty">{t("git.noProject")}</div>
      </div>
    );
  }

  return (
    <div className="git-panel">
      {/* Branch header */}
      <div className="git-branch">
        {loading ? (
          <span>{t("git.loading")}</span>
        ) : status ? (
          <>
            <span className="git-branch-icon">⎇</span>
            <span className="git-branch-name">{status.branch}</span>
            {status.ahead > 0 && (
              <span className="git-ahead">↑{status.ahead}</span>
            )}
            {status.behind > 0 && (
              <span className="git-behind">↓{status.behind}</span>
            )}
            <span className="git-changed-count">
              {status.changed.length} {t("git.filesChanged")}
            </span>
          </>
        ) : error ? (
          <span className="git-error" title={error}>{t("git.notRepo")}</span>
        ) : null}
      </div>

      {/* Refresh button */}
      <button
        className="git-refresh-btn"
        onClick={() => projectRoot && refreshStatus(projectRoot)}
        disabled={loading}
      >
        ↻ {t("git.refresh")}
      </button>

      {/* Changed files */}
      {status && status.changed.length > 0 && (
        <div className="git-file-list">
          {status.changed.map((entry) => (
            <div key={entry.path} className="git-file-item">
              <span className={`git-status git-status-${entry.status[0] || "M"}`}>
                {statusLabel(entry.status)}
              </span>
              <span
                className="git-file-name"
                onClick={() => handleOpenFile(entry.path)}
                title={entry.path}
              >
                {entry.display_path}
              </span>
              <button
                className="git-diff-btn"
                onClick={() => handleOpenDiff(entry.path)}
                title={t("git.viewDiff")}
              >
                diff
              </button>
            </div>
          ))}
        </div>
      )}

      {status && status.changed.length === 0 && (
        <div className="git-clean">{t("git.clean")}</div>
      )}

      {/* Diff view */}
      {diffFile && (
        <div className="git-diff-view">
          <div className="git-diff-header">
            <span>{diffFile.split("/").pop()}</span>
            <button onClick={() => { setDiffFile(null); setDiffContent(""); }}>
              ×
            </button>
          </div>
          <pre className="git-diff-content">{diffContent}</pre>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "M":  return "M";
    case "A":  return "A";
    case "D":  return "D";
    case "R":  return "R";
    case "??": return "?";
    case "MM": return "M";
    case "AM": return "A";
    default:   return status;
  }
}
