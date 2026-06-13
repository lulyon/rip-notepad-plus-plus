import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useEditorRefStore } from "../../stores/editorRefStore";
import "./GoToLineDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GoToLineDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [lineStr, setLineStr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useEditorRefStore((s) => s.editorRef);

  useEffect(() => {
    if (open) {
      setLineStr("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleGo = () => {
    const line = parseInt(lineStr, 10);
    if (!editorRef || isNaN(line) || line < 1) return;

    const model = editorRef.getModel();
    if (!model) return;

    const maxLine = model.getLineCount();
    const targetLine = Math.min(line, maxLine);

    editorRef.revealLineInCenter(targetLine);
    editorRef.setPosition({ lineNumber: targetLine, column: 1 });
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog goto-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("dialog.goToLine")}</h2>
        <div className="goto-row">
          <label>{t("dialog.lineNumber")}:</label>
          <input
            ref={inputRef}
            type="number"
            className="goto-input"
            value={lineStr}
            onChange={(e) => setLineStr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGo();
            }}
            placeholder="1"
            min="1"
          />
        </div>
        <div className="dialog-actions">
          <button className="sbtn sbtn-primary" onClick={handleGo}>
            {t("gotoLine.go")}
          </button>
          <button className="btn" onClick={onClose}>
            {t("dialog.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
