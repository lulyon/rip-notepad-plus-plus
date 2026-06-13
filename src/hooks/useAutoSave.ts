import { useEffect, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useSettingsStore } from "../stores/settingsStore";
import { ipc } from "../lib/ipc";

const DEFAULT_INTERVAL_MS = 30000; // 30 seconds

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interval = DEFAULT_INTERVAL_MS;

  useEffect(() => {
    timerRef.current = setInterval(async () => {
      const store = useEditorStore.getState();
      const autoSaveEnabled = useSettingsStore.getState().autoSave ?? true;
      if (!autoSaveEnabled) return;

      for (const tab of store.tabs) {
        if (tab.path && tab.modified) {
          try {
            await ipc.writeFile(tab.path, tab.content, tab.encoding);
            store.markTabSaved(tab.id, tab.path);
          } catch (_) {
            // Silently fail — file may be read-only
          }
        }
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interval]);
}
