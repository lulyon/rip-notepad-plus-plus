import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Tab } from "../../stores/editorStore";
import "./UnsavedChangesDialog.css";

interface Props {
  unsavedTabs: Tab[];
  onSaveAll: () => void;
  onDiscardAll: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  unsavedTabs,
  onSaveAll,
  onDiscardAll,
  onCancel,
}: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  if (unsavedTabs.length === 0) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>{t("dialog.unsavedChanges")}</h2>
        <p>{t("dialog.unsavedDesc")}</p>
        <ul className="unsaved-list">
          {unsavedTabs.map((tab) => (
            <li key={tab.id}>
              <span className="unsaved-name">{tab.name}</span>
              <span className="unsaved-path">{tab.path || t("app.newFile")}</span>
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onSaveAll}>
            {t("dialog.saveAll")}
          </button>
          <button className="btn" onClick={onDiscardAll}>
            {t("dialog.discardAll")}
          </button>
          <button className="btn" onClick={onCancel}>
            {t("dialog.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
