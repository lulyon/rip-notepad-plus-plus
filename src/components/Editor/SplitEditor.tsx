import { useEffect } from "react";
import { Editor } from "./Editor";
import { useSettingsStore } from "../../stores/settingsStore";
import { useEditorStore } from "../../stores/editorStore";
import "./SplitEditor.css";

export function SplitEditor() {
  const splitView = useSettingsStore((s) => s.splitView);
  const secondaryTabId = useEditorStore((s) => s.secondaryTabId);
  const activeTabId = useEditorStore((s) => s.activeTabId);

  // Initialize secondary tab to active tab when split activates
  useEffect(() => {
    if (splitView !== "none" && !secondaryTabId && activeTabId) {
      useEditorStore.setState({ secondaryTabId: activeTabId });
    }
    if (splitView === "none" && secondaryTabId) {
      useEditorStore.setState({ secondaryTabId: null });
    }
  }, [splitView, secondaryTabId, activeTabId]);

  if (splitView === "none") {
    return <Editor />;
  }

  return (
    <div className={`split-editor split-${splitView}`}>
      <div className="split-pane">
        <Editor />
      </div>
      <div className="split-divider" />
      <div className="split-pane">
        {secondaryTabId ? (
          <Editor key={`sec-${secondaryTabId}`} tabId={secondaryTabId} />
        ) : (
          <div className="split-empty">No tab selected</div>
        )}
      </div>
    </div>
  );
}
