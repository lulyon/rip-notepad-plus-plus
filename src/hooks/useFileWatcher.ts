import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";
import { ipc } from "../lib/ipc";

/**
 * Watches open files for external changes.
 * When a file is modified outside the editor, prompts the user to reload.
 * Uses a polling approach (every 3s) via check_file_changed.
 */
export function useFileWatcher() {
  const tabs = useEditorStore((s) => s.tabs);

  useEffect(() => {
    const filesWithPaths = tabs.filter((t) => t.path).map((t) => ({ id: t.id, path: t.path! }));

    // Poll for external changes every 3 seconds
    const interval = setInterval(async () => {
      for (const { id, path } of filesWithPaths) {
        try {
          const changed = await ipc.checkFileChanged(path);
          if (changed) {
            // Reload the file content
            const result = await ipc.readFile(path);
            const store = useEditorStore.getState();
            const tab = store.tabs.find((t) => t.id === id);
            if (tab && result.content !== tab.content) {
              store.reloadTab(id, result.content, result.encoding);
              // Update mtime after reload
              await ipc.updateFileMtime(path);
            }
          }
        } catch {
          // File might be deleted or inaccessible — ignore
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [tabs.map((t) => t.path).join(",")]);

  // Also listen for Tauri events (real-time notifications from the watcher)
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<{ path: string }>("file-externally-changed", async (event) => {
        const { path } = event.payload;
        const store = useEditorStore.getState();
        const tab = store.tabs.find((t) => t.path === path);
        if (tab) {
          try {
            const result = await ipc.readFile(path);
            if (result.content !== tab.content) {
              store.reloadTab(tab.id, result.content, result.encoding);
              await ipc.updateFileMtime(path);
            }
          } catch {
            // Ignore
          }
        }
      }).then((fn) => {
        unlisten = fn;
      });
    });

    return () => {
      unlisten?.();
    };
  }, []);
}
