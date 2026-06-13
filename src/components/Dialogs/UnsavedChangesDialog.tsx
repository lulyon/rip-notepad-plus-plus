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
  if (unsavedTabs.length === 0) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>Unsaved Changes</h2>
        <p>The following files have unsaved changes:</p>
        <ul className="unsaved-list">
          {unsavedTabs.map((tab) => (
            <li key={tab.id}>
              <span className="unsaved-name">{tab.name}</span>
              <span className="unsaved-path">{tab.path || "Untitled"}</span>
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onSaveAll}>
            Save All
          </button>
          <button className="btn" onClick={onDiscardAll}>
            Discard All
          </button>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
