import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import "./SummaryDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SummaryDialog({ open, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const tab = useEditorStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId),
  );

  const stats = useMemo(() => {
    if (!tab) return null;

    const content = tab.content;
    const totalChars = content.length;
    const charsNoSpaces = content.replace(/\s/g, "").length;
    const lines = content.split("\n");
    const totalLines = lines.length;
    const words = content
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    return {
      fileName: tab.name,
      filePath: tab.path || "-",
      totalChars,
      charsNoSpaces,
      totalLines,
      totalWords: words,
      encoding: tab.encoding,
      language: tab.language,
      cursorLine: tab.cursorLine,
      cursorColumn: tab.cursorColumn,
    };
  }, [tab]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog summary-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("dialog.summary")}</h2>

        {!tab ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("dialog.summaryNoFile")}
          </p>
        ) : (
          <div className="summary-grid">
            {/* File section */}
            <div className="summary-section-title">
              {t("dialog.summaryFile")}
            </div>
            <div className="summary-label">{t("dialog.summaryFileName")}</div>
            <div className="summary-value">{stats?.fileName}</div>

            <div className="summary-label">{t("dialog.summaryFilePath")}</div>
            <div className="summary-value">{stats?.filePath}</div>

            <div className="summary-label">{t("dialog.summaryFileSize")}</div>
            <div className="summary-value">
              {tab.path
                ? t("dialog.summaryFromFileManager")
                : t("dialog.summaryMemoryOnly")}
            </div>

            {/* Content section */}
            <div className="summary-section-title">
              {t("dialog.summaryContent")}
            </div>
            <div className="summary-label">{t("dialog.summaryChars")}</div>
            <div className="summary-value">
              {stats?.totalChars.toLocaleString()}
            </div>

            <div className="summary-label">
              {t("dialog.summaryCharsNoSpaces")}
            </div>
            <div className="summary-value">
              {stats?.charsNoSpaces.toLocaleString()}
            </div>

            <div className="summary-label">{t("dialog.summaryWords")}</div>
            <div className="summary-value">
              {stats?.totalWords.toLocaleString()}
            </div>

            <div className="summary-label">{t("dialog.summaryLines")}</div>
            <div className="summary-value">
              {stats?.totalLines.toLocaleString()}
            </div>

            {/* Properties section */}
            <div className="summary-section-title">
              {t("dialog.summaryProperties")}
            </div>
            <div className="summary-label">{t("dialog.summaryEncoding")}</div>
            <div className="summary-value">{stats?.encoding}</div>

            <div className="summary-label">{t("dialog.summaryLanguage")}</div>
            <div className="summary-value">{stats?.language}</div>

            <div className="summary-label">{t("dialog.summaryCursor")}</div>
            <div className="summary-value">
              {t("status.line")} {stats?.cursorLine}, {t("status.column")}{" "}
              {stats?.cursorColumn}
            </div>
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>
            {t("dialog.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
