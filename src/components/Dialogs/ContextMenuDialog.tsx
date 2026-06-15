import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useContextMenuStore, CustomMenuItem } from "../../stores/contextMenuStore";
import "./ContextMenuDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

function genId(): string {
  return `ctx.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ContextMenuDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  const items = useContextMenuStore((s) => s.items);
  const setItems = useContextMenuStore((s) => s.setItems);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New item form
  const [newLabel, setNewLabel] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newSeparator, setNewSeparator] = useState(false);

  if (!open) return null;

  const handleAdd = () => {
    if (newSeparator) {
      setItems([...items, { id: genId(), label: "", action: "", separator: true }]);
    } else if (newLabel.trim() && newAction.trim()) {
      setItems([...items, { id: genId(), label: newLabel.trim(), action: newAction.trim(), separator: false }]);
    } else {
      return;
    }
    setNewLabel("");
    setNewAction("");
    setNewSeparator(false);
  };

  const handleRemove = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleUpdate = (id: string, field: keyof CustomMenuItem, value: string | boolean) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const next = [...items];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      setItems(next);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < items.length - 1) {
      const next = [...items];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      setItems(next);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("ripnotepadpp-contextmenu");
    useContextMenuStore.getState().loadItems();
  };

  // Common action suggestions
  const actionPresets = [
    { id: "edit.cut", label: "Cut" },
    { id: "edit.copy", label: "Copy" },
    { id: "edit.paste", label: "Paste" },
    { id: "edit.selectAll", label: "Select All" },
    { id: "edit.undo", label: "Undo" },
    { id: "edit.redo", label: "Redo" },
    { id: "edit.delete", label: "Delete" },
    { id: "edit.toUpper", label: "To Uppercase" },
    { id: "edit.toLower", label: "To Lowercase" },
    { id: "edit.duplicateLine", label: "Duplicate Line" },
    { id: "edit.deleteLine", label: "Delete Line" },
    { id: "edit.commentToggle", label: "Toggle Comment" },
    { id: "edit.copyFilePath", label: "Copy File Path" },
    { id: "edit.formatXml", label: "Format XML" },
    { id: "edit.sortAscending", label: "Sort Ascending" },
    { id: "edit.removeDupLines", label: "Remove Duplicates" },
    { id: "file.save", label: "Save" },
    { id: "file.close", label: "Close" },
    { id: "search.find", label: "Find" },
    { id: "search.replace", label: "Replace" },
  ];

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog context-menu-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("contextMenu.title")}</h2>
        <p className="dialog-desc">{t("contextMenu.description")}</p>

        {/* Item list */}
        <div className="ctx-item-list">
          {items.map((item, idx) => (
            <div key={item.id} className={`ctx-item ${item.separator ? "ctx-item-sep" : ""}`}>
              {item.separator ? (
                <div className="ctx-item-preview">
                  <span className="ctx-sep-label">────── {t("contextMenu.separator")} ──────</span>
                  <div className="ctx-item-actions">
                    <button className="ctx-btn" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>▲</button>
                    <button className="ctx-btn" onClick={() => handleMoveDown(idx)} disabled={idx === items.length - 1}>▼</button>
                    <button className="ctx-btn ctx-btn-remove" onClick={() => handleRemove(item.id)}>✕</button>
                  </div>
                </div>
              ) : editingId === item.id ? (
                <div className="ctx-item-edit">
                  <input
                    className="ctx-input" value={item.label}
                    onChange={(e) => handleUpdate(item.id, "label", e.target.value)}
                    placeholder="Label (&Letter for hotkey)"
                  />
                  <input
                    className="ctx-input" value={item.action}
                    onChange={(e) => handleUpdate(item.id, "action", e.target.value)}
                    placeholder="Action ID (e.g. edit.cut)"
                  />
                  <button className="ctx-btn" onClick={() => setEditingId(null)}>✓</button>
                  <button className="ctx-btn ctx-btn-remove" onClick={() => handleRemove(item.id)}>✕</button>
                </div>
              ) : (
                <div className="ctx-item-preview">
                  <span className="ctx-item-label">{item.label}</span>
                  <span className="ctx-item-action">{item.action}</span>
                  <div className="ctx-item-actions">
                    <button className="ctx-btn" onClick={() => setEditingId(item.id)}>✎</button>
                    <button className="ctx-btn" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>▲</button>
                    <button className="ctx-btn" onClick={() => handleMoveDown(idx)} disabled={idx === items.length - 1}>▼</button>
                    <button className="ctx-btn ctx-btn-remove" onClick={() => handleRemove(item.id)}>✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new item */}
        <div className="ctx-add-section">
          <h3>{t("contextMenu.addItem")}</h3>
          <div className="ctx-add-row">
            <label className="ctx-add-check">
              <input type="checkbox" checked={newSeparator} onChange={(e) => setNewSeparator(e.target.checked)} />
              {t("contextMenu.separator")}
            </label>
          </div>
          {!newSeparator && (
            <>
              <div className="ctx-add-row">
                <input className="ctx-input" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label" />
                <select
                  className="ctx-select"
                  value={newAction}
                  onChange={(e) => { setNewAction(e.target.value); if (!newLabel) setNewLabel(e.target.selectedOptions[0]?.text || ""); }}
                >
                  <option value="">{t("contextMenu.selectAction")}</option>
                  {actionPresets.map((ap) => (
                    <option key={ap.id} value={ap.id}>{ap.label} ({ap.id})</option>
                  ))}
                </select>
              </div>
              {!newAction.startsWith("actionPreset") && (
                <div className="ctx-add-row">
                  <input className="ctx-input" value={newAction} onChange={(e) => setNewAction(e.target.value)} placeholder="Or type custom action ID..." />
                </div>
              )}
            </>
          )}
          <div className="ctx-add-actions">
            <button className="btn btn-primary" onClick={handleAdd}>{t("contextMenu.add")}</button>
            <button className="btn" onClick={handleReset}>{t("contextMenu.resetDefaults")}</button>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>{t("dialog.close")}</button>
        </div>
      </div>
    </div>
  );
}
