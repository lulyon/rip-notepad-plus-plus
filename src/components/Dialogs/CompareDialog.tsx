import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../../stores/editorStore";
import { ipc } from "../../lib/ipc";
import { DiffEditor } from "@monaco-editor/react";
import { useSettingsStore } from "../../stores/settingsStore";
import "./CompareDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CompareDialog({ open: isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const theme = useSettingsStore((s) => s.theme);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);

  const [leftContent, setLeftContent] = useState("");
  const [rightContent, setRightContent] = useState("");
  const [leftLabel, setLeftLabel] = useState("");
  const [rightLabel, setRightLabel] = useState("");
  const [mode, setMode] = useState<"select" | "compare">("select");

  // Auto-fill active tab
  useEffect(() => {
    if (!isOpen) return;
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab?.path) {
      setLeftContent(activeTab.content);
      setLeftLabel(activeTab.name);
    }
    // Reset right side
    setRightContent("");
    setRightLabel("");
    setMode("select");
  }, [isOpen, activeTabId]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const pickFile = useCallback(async (side: "left" | "right") => {
    const result = await open({ title: `Select ${side} file`, multiple: false });
    if (result && typeof result === "string") {
      try {
        const data = await ipc.readFile(result);
        const name = result.split(/[/\\]/).pop() || result;
        if (side === "left") {
          setLeftContent(data.content);
          setLeftLabel(name);
        } else {
          setRightContent(data.content);
          setRightLabel(name);
        }
      } catch (err) {
        console.error("Failed to read:", err);
      }
    }
  }, []);

  const startCompare = useCallback(() => {
    if (leftContent && rightContent) {
      setMode("compare");
    }
  }, [leftContent, rightContent]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog compare-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="compare-header">
          <h2>{t("compare.title")}</h2>
          <div className="compare-header-actions">
            {mode === "compare" && (
              <button className="btn" onClick={() => setMode("select")}>
                ← {t("compare.back")}
              </button>
            )}
            <button className="btn" onClick={onClose}>×</button>
          </div>
        </div>

        {mode === "select" ? (
          /* Selection mode */
          <div className="compare-select">
            <div className="compare-file-picker">
              <label>{t("compare.left")}</label>
              <div className="compare-path">{leftLabel || t("compare.selectFile")}</div>
              <button className="btn" onClick={() => pickFile("left")}>
                {t("compare.browse")}
              </button>
              {leftContent && (
                <div className="compare-preview">
                  {leftContent.substring(0, 200)}
                </div>
              )}
            </div>
            <div className="compare-file-picker">
              <label>{t("compare.right")}</label>
              <div className="compare-path">{rightLabel || t("compare.selectFile")}</div>
              <button className="btn" onClick={() => pickFile("right")}>
                {t("compare.browse")}
              </button>
              {rightContent && (
                <div className="compare-preview">
                  {rightContent.substring(0, 200)}
                </div>
              )}
            </div>
            <div className="compare-actions">
              <button
                className="btn btn-primary"
                disabled={!leftContent || !rightContent}
                onClick={startCompare}
              >
                {t("compare.compare")}
              </button>
            </div>
          </div>
        ) : (
          /* Diff mode */
          <div className="compare-diff-container">
            <div className="compare-labels">
              <span className="compare-label-left">{leftLabel}</span>
              <span className="compare-label-right">{rightLabel}</span>
            </div>
            <DiffEditor
              height="calc(100% - 30px)"
              language="plaintext"
              original={leftContent}
              modified={rightContent}
              theme={theme}
              options={{
                fontSize: 13,
                renderSideBySide: true,
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
