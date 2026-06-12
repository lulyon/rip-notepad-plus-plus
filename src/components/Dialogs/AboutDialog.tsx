import { useEffect } from "react";
import "./AboutDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog about-dialog" onClick={(e) => e.stopPropagation()}>
        <h1>ripNotepad++</h1>
        <p className="about-version">Version 0.2.0</p>
        <p className="about-desc">
          A cross-platform text editor replacement for Notepad++.
        </p>
        <p className="about-stack">
          Built with Tauri v2 + Monaco Editor + React + TypeScript + Rust
        </p>
        <p className="about-copy">&copy; 2026 ripNotepad++ contributors</p>
        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
