import type { Tab } from "../../stores/editorStore";
import "./UnsavedChangesDialog.css";

interface Props {
  unsavedTabs: Tab[];
  onSave: (tab: Tab) => void;
  onDiscard: (tab: Tab) => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  unsavedTabs,
  onSave,
  onDiscard,
  onCancel,
}: Props) {
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
          <button className="btn btn-primary" onClick={() => unsavedTabs.forEach(onSave)}>
            Save All
          </button>
          <button className="btn" onClick={() => unsavedTabs.forEach(onDiscard)}>
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
