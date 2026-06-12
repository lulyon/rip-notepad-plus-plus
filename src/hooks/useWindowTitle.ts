import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEditorStore } from "../stores/editorStore";

export function useWindowTitle() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);

  useEffect(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const title = activeTab
      ? `ripNotepad++ - ${activeTab.name}${activeTab.modified ? " ●" : ""}`
      : "ripNotepad++";

    const appWindow = getCurrentWindow();
    appWindow.setTitle(title).catch(() => {
      // Silently ignore — title setting may fail in some environments
    });
  }, [tabs, activeTabId]);
}
