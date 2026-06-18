import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Editor } from "./Editor";
import { useSettingsStore } from "../../stores/settingsStore";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import "./SplitEditor.css";

export function SplitEditor() {
  const { t } = useTranslation();
  const splitView = useSettingsStore((s) => s.splitView);
  const secondaryTabId = useEditorStore((s) => s.secondaryTabId);
  const activeTabId = useEditorStore((s) => s.activeTabId);

  // Refs for scroll sync disposables
  const primaryDisposable = useRef<{ dispose(): void } | null>(null);
  const secondaryDisposable = useRef<{ dispose(): void } | null>(null);

  // Initialize secondary tab to active tab when split activates
  useEffect(() => {
    if (splitView !== "none" && !secondaryTabId && activeTabId) {
      useEditorStore.setState({ secondaryTabId: activeTabId });
    }
    if (splitView === "none" && secondaryTabId) {
      useEditorStore.setState({ secondaryTabId: null });
    }
  }, [splitView, secondaryTabId, activeTabId]);

  // Sync scroll between primary and secondary editors
  useEffect(() => {
    if (splitView === "none") return;

    // Poll for editor refs (they mount asynchronously via Monaco)
    const interval = setInterval(() => {
      const { editorRef, secondaryEditorRef } = useEditorRefStore.getState();
      if (!editorRef || !secondaryEditorRef) return;

      // Clean up previous disposables
      primaryDisposable.current?.dispose();
      secondaryDisposable.current?.dispose();

      let syncing = false;

      primaryDisposable.current = editorRef.onDidScrollChange((e) => {
        if (syncing) return;
        syncing = true;
        secondaryEditorRef.setScrollTop(e.scrollTop);
        secondaryEditorRef.setScrollLeft(e.scrollLeft);
        syncing = false;
      });

      secondaryDisposable.current = secondaryEditorRef.onDidScrollChange((e) => {
        if (syncing) return;
        syncing = true;
        editorRef.setScrollTop(e.scrollTop);
        editorRef.setScrollLeft(e.scrollLeft);
        syncing = false;
      });

      clearInterval(interval);
    }, 100);

    return () => {
      clearInterval(interval);
      primaryDisposable.current?.dispose();
      secondaryDisposable.current?.dispose();
    };
  }, [splitView, secondaryTabId]);

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
          <div className="split-empty">{t("splitEditor.noTab")}</div>
        )}
      </div>
    </div>
  );
}
