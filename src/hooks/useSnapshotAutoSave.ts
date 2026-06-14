import { useEffect, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import { ipc } from "../lib/ipc";

/**
 * Periodically saves snapshots of modified tabs for crash recovery.
 * Every 7 seconds, saves all modified tabs with paths to temp backup files.
 * On startup, checks for orphan snapshots.
 */
export function useSnapshotAutoSave() {
  const tabs = useEditorStore((s) => s.tabs);
  const snapshotTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load orphan snapshots on startup (crash recovery)
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    ipc.loadSnapshots().then((snapshots) => {
      if (snapshots.length > 0) {
        console.info(`Found ${snapshots.length} crash recovery snapshot(s)`);
        // Could show a UI prompt here to restore
      }
    }).catch(() => {});
  }, []);

  // Save snapshots every 7 seconds for modified tabs
  useEffect(() => {
    snapshotTimer.current = setInterval(() => {
      const store = useEditorStore.getState();
      for (const tab of store.tabs) {
        if (tab.modified && tab.content) {
          ipc.saveSnapshot(tab.id, tab.path, tab.content).catch(() => {});
        }
      }
    }, 7000);

    return () => {
      if (snapshotTimer.current) clearInterval(snapshotTimer.current);
    };
  }, []);

  // Clear snapshots when tabs are saved/closed
  // We watch for tabs going from modified to unmodified
  const prevModified = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const tab of tabs) {
      const wasModified = prevModified.current.has(tab.id);
      if (wasModified && !tab.modified) {
        // Tab was saved — clear its snapshot
        ipc.clearSnapshot(tab.id).catch(() => {});
      }
    }
    // Also clear for tabs that were removed
    const currentIds = new Set(tabs.map((t) => t.id));
    for (const prevId of prevModified.current) {
      if (!currentIds.has(prevId)) {
        ipc.clearSnapshot(prevId).catch(() => {});
      }
    }
    prevModified.current = new Set(tabs.filter((t) => t.modified).map((t) => t.id));
  }, [tabs]);
}
