import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./CommitDialog.css";

interface Props {
  open: boolean;
  files: Array<{ path: string; display_path: string; status: string }>;
  onCommit: (message: string) => void;
  onClose: () => void;
}

export function CommitDialog({ open, files, onCommit, onClose }: Props) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCommit = () => {
    if (!message.trim()) return;
    onCommit(message.trim());
    setMessage("");
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog commit-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("commit.title")}</h2>

        <div className="commit-files">
          <div className="commit-files-header">{t("commit.filesStaged", { count: files.length })}</div>
          {files.map((f) => (
            <div key={f.path} className="commit-file-item">
              <span className={`git-status git-status-${f.status[0] || "M"}`}>{f.status}</span>
              <span>{f.display_path}</span>
            </div>
          ))}
        </div>

        <textarea
          className="commit-msg-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("commit.messagePlaceholder")}
          rows={4}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCommit(); }
          }}
          autoFocus
        />

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={handleCommit} disabled={!message.trim()}>
            {t("commit.commit")}
          </button>
          <button className="btn" onClick={onClose}>{t("commit.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
