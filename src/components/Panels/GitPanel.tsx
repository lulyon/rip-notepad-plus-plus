import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useGitStore } from "../../stores/gitStore";
import { ipc } from "../../lib/ipc";
import { CommitDialog } from "../Dialogs/CommitDialog";
import "./GitPanel.css";

/** Derive repo path: configured projectRoot > active editor file's directory. */
function useRepoPath(): string {
  const projectRoot = useSettingsStore((s) => s.projectRoot);
  if (projectRoot) return projectRoot;
  // Fall back to active editor file's directory
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const tab = tabs.find((t) => t.id === activeTabId);
  if (tab?.path) {
    const i = Math.max(tab.path.lastIndexOf("/"), tab.path.lastIndexOf("\\"));
    if (i > 0) return tab.path.slice(0, i);
  }
  return "";
}

export function GitPanel() {
  const { t } = useTranslation();
  const projectRoot = useRepoPath();
  const { status, loading, error, refreshStatus } = useGitStore();
  const [diffFile, setDiffFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState("");
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranchName, setNewBranchName] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [commitOpen, setCommitOpen] = useState(false);

  const refresh = useCallback(() => {
    if (projectRoot) refreshStatus(projectRoot);
  }, [projectRoot, refreshStatus]);

  useEffect(() => { refresh(); }, [refresh]);

  // Listen for status bar branch click
  useEffect(() => {
    const handler = () => { if (projectRoot) loadBranches(); };
    window.addEventListener("git-show-branches", handler);
    return () => window.removeEventListener("git-show-branches", handler);
  }, [projectRoot]);

  // Reset staged state when status changes
  useEffect(() => {
    if (status) {
      setStagedFiles(new Set(status.changed.filter((e) => e.status[0] === "M" || e.status[0] === "A").map((e) => e.path)));
    }
  }, [status]);

  const doStage = async (path: string) => {
    if (!projectRoot) return;
    try {
      await ipc.gitStage(projectRoot, path);
      setStagedFiles((s) => new Set(s).add(path));
      refresh();
    } catch (e: any) { setActionMsg(e); }
  };

  const doUnstage = async (path: string) => {
    if (!projectRoot) return;
    try {
      await ipc.gitUnstage(projectRoot, path);
      setStagedFiles((s) => { const n = new Set(s); n.delete(path); return n; });
      refresh();
    } catch (e: any) { setActionMsg(e); }
  };

  const doStageAll = async () => {
    if (!projectRoot || !status) return;
    try { await ipc.gitStageAll(projectRoot); refresh(); } catch (e: any) { setActionMsg(e); }
  };

  const doPush = async () => {
    if (!projectRoot) return;
    try { const r = await ipc.gitPush(projectRoot); setActionMsg(r || t("git.pushOk")); refresh(); }
    catch (e: any) { setActionMsg(t("git.pushFailed", { error: e })); }
  };

  const doPull = async () => {
    if (!projectRoot) return;
    try { const r = await ipc.gitPull(projectRoot); setActionMsg(r || t("git.pullOk")); refresh(); }
    catch (e: any) { setActionMsg(t("git.pullFailed", { error: e })); }
  };

  const loadBranches = async () => {
    if (!projectRoot) return;
    try { setBranches(await ipc.gitListBranches(projectRoot)); } catch {}
    setShowBranchMenu((v) => !v);
  };

  const doSwitchBranch = async (branch: string) => {
    if (!projectRoot) return;
    try {
      await ipc.gitCheckoutBranch(projectRoot, branch.startsWith("remotes/") ? branch.split("/").slice(2).join("/") : branch);
      setShowBranchMenu(false); refresh();
    } catch (e: any) { setActionMsg(t("git.checkoutFailed", { error: e })); }
  };

  const doCreateBranch = async () => {
    if (!projectRoot || !newBranchName.trim()) return;
    try { await ipc.gitCreateBranch(projectRoot, newBranchName.trim()); setNewBranchName(""); refresh(); }
    catch (e: any) { setActionMsg(e); }
  };

  const handleOpenFile = async (filePath: string) => {
    const tabs = useEditorStore.getState().tabs;
    const existing = tabs.find((t) => t.path === filePath);
    if (existing) { useEditorStore.getState().setActiveTab(existing.id); return; }
    try {
      const data = await ipc.readFile(filePath);
      useEditorStore.getState().openTab({ path: filePath, name: filePath.split(/[/\\]/).pop() || filePath, content: data.content, encoding: data.encoding, language: "" });
    } catch (err) { console.error(err); }
  };

  const handleOpenDiff = async (filePath: string) => {
    if (!projectRoot) return;
    setDiffFile(filePath);
    try { setDiffContent(await ipc.gitDiffFile(projectRoot, filePath)); } catch { setDiffContent("Failed"); }
  };

  if (!projectRoot) {
    return <div className="git-panel"><div className="git-empty">{t("git.noProject")}</div></div>;
  }

  return (
    <div className="git-panel">
      {/* Branch + actions row */}
      <div className="git-branch">
        {loading ? <span>{t("git.loading")}</span> : status ? <>
          <span className="git-branch-icon">⎇</span>
          <span className="git-branch-name" onClick={loadBranches} title="Switch branch">{status.branch}</span>
          {status.ahead > 0 && <span className="git-ahead">↑{status.ahead}</span>}
          {status.behind > 0 && <span className="git-behind">↓{status.behind}</span>}
          <span className="git-changed-count">{status.changed.length} {t("git.filesChanged")}</span>
        </> : error ? <span className="git-error">{t("git.notRepo")}</span> : null}
        <div className="git-actions">
          <button className="git-action-btn" onClick={doPull} title="Pull">↓</button>
          <button className="git-action-btn" onClick={doPush} title="Push">↑</button>
          <button className="git-action-btn" onClick={refresh} disabled={loading} title="Refresh">↻</button>
        </div>
      </div>

      {/* Branch menu dropdown */}
      {showBranchMenu && (
        <div className="git-branch-menu">
          <div className="git-branch-create">
            <input className="git-input" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder={t("git.newBranch")} />
            <button className="git-btn" onClick={doCreateBranch}>+</button>
          </div>
          {branches.map((b, i) => (
            <div key={i} className={`git-branch-item${b === status?.branch ? " active" : ""}`} onClick={() => doSwitchBranch(b)}>
              {b.replace("remotes/origin/", "origin/")}
            </div>
          ))}
        </div>
      )}

      {/* Action message */}
      {actionMsg && <div className="git-action-msg" onClick={() => setActionMsg("")}>{actionMsg}</div>}

      {/* Changed files with stage checkboxes */}
      {status && status.changed.length > 0 && (
        <div className="git-file-list">
          {status.changed.map((entry) => {
            const isStaged = stagedFiles.has(entry.path) || entry.status === "A";
            return (
              <div key={entry.path} className="git-file-item">
                <input type="checkbox" className="git-stage-cb" checked={isStaged}
                  onChange={() => isStaged ? doUnstage(entry.path) : doStage(entry.path)} />
                <span className={`git-status git-status-${entry.status[0] || "M"}`}>{statusLabel(entry.status)}</span>
                <span className="git-file-name" onClick={() => handleOpenFile(entry.path)} title={entry.path}>{entry.display_path}</span>
                <button className="git-diff-btn" onClick={() => handleOpenDiff(entry.path)} title={t("git.viewDiff")}>{t("git.diff")}</button>
              </div>
            );
          })}
        </div>
      )}

      {status && status.changed.length === 0 && <div className="git-clean">{t("git.clean")}</div>}

      {/* Stage all + Commit */}
      {status && status.changed.length > 0 && (
        <div className="git-commit-section">
          <button className="git-action-btn" onClick={doStageAll}>{t("git.stageAll")}</button>
          <button className="git-btn git-commit-btn" onClick={() => setCommitOpen(true)}>{t("git.commit")}</button>
        </div>
      )}

      <CommitDialog
        open={commitOpen}
        files={status?.changed || []}
        onCommit={async (msg) => {
          if (!projectRoot) return;
          try { await ipc.gitCommit(projectRoot, msg); refresh(); setActionMsg(t("git.committed")); }
          catch (e: any) { setActionMsg(t("git.commitFailed", { error: e })); }
        }}
        onClose={() => setCommitOpen(false)}
      />

      {/* Diff view */}
      {diffFile && (
        <div className="git-diff-view">
          <div className="git-diff-header"><span>{diffFile.split("/").pop()}</span>
            <button onClick={() => { setDiffFile(null); setDiffContent(""); }}>×</button></div>
          <pre className="git-diff-content">{diffContent}</pre>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string): string {
  const s = status.trim();
  if (s === "M" || s === "MM" || s === "AM") return "M";
  if (s === "A") return "A"; if (s === "D") return "D";
  if (s === "R") return "R"; if (s === "??") return "?";
  return s;
}
