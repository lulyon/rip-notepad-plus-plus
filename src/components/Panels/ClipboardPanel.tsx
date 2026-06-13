import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useClipboardStore } from "../../stores/clipboardStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import "./ClipboardPanel.css";

export function ClipboardPanel() {
  const { t } = useTranslation();
  const { entries, startListening, stopListening, removeEntry, togglePin, clearAll } =
    useClipboardStore();
  const [search, setSearch] = useState("");
  const editorRef = useEditorRefStore((s) => s.editorRef);

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, [startListening, stopListening]);

  const filtered = search.trim()
    ? useClipboardStore.getState().search(search)
    : entries;

  const handlePaste = useCallback(
    (text: string) => {
      if (!editorRef) {
        navigator.clipboard.writeText(text);
        return;
      }
      // Paste at cursor in Monaco
      const selection = editorRef.getSelection();
      if (selection) {
        editorRef.executeEdits("clipboard-paste", [
          { range: selection, text },
        ]);
      } else {
        const pos = editorRef.getPosition();
        if (pos) {
          editorRef.executeEdits("clipboard-paste", [
            { range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, text },
          ]);
        }
      }
      editorRef.focus();
    },
    [editorRef],
  );

  const handleCopyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  };

  return (
    <div className="clipboard-panel">
      <div className="clipboard-toolbar">
        <input
          className="clipboard-search"
          type="text"
          placeholder={t("clipboard.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {entries.length > 0 && (
          <button className="clipboard-clear-btn" onClick={clearAll} title={t("clipboard.clear")}>
            🗑
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="clipboard-empty">
          {search ? t("clipboard.noResults") : t("clipboard.empty")}
        </div>
      ) : (
        <div className="clipboard-list">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className={`clipboard-item ${entry.pinned ? "pinned" : ""}`}
            >
              <div className="clipboard-item-header">
                <span className="clipboard-time">{formatTime(entry.time)}</span>
                <span className="clipboard-preview">
                  {entry.text.substring(0, 60).replace(/\n/g, "↵")}
                </span>
                <div className="clipboard-actions">
                  <button
                    className="clipboard-action-btn"
                    onClick={() => handlePaste(entry.text)}
                    title={t("clipboard.paste")}
                  >
                    📋
                  </button>
                  <button
                    className="clipboard-action-btn"
                    onClick={() => handleCopyToClipboard(entry.text)}
                    title={t("clipboard.copy")}
                  >
                    📄
                  </button>
                  <button
                    className={`clipboard-action-btn ${entry.pinned ? "active" : ""}`}
                    onClick={() => togglePin(entry.id)}
                    title={t("clipboard.pin")}
                  >
                    📌
                  </button>
                  <button
                    className="clipboard-action-btn"
                    onClick={() => removeEntry(entry.id)}
                    title={t("clipboard.remove")}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="clipboard-item-text">
                {entry.text.substring(0, 200)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
