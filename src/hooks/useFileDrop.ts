import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEditorStore } from "../stores/editorStore";
import { useSettingsStore } from "../stores/settingsStore";
import { ipc } from "../lib/ipc";
import { detectLanguage } from "../lib/constants";
import { isBinaryExtension } from "../lib/fileUtils";

export function useFileDrop() {
  useEffect(() => {
    let cancelled = false;
    let unlistenFn: (() => void) | undefined;

    async function setup() {
      const appWindow = getCurrentWindow();
      const unlisten = await appWindow.onDragDropEvent((event) => {
        if (cancelled) return;
        if (event.payload.type === "drop") {
          for (const path of event.payload.paths) {
            // Check if it's a directory
            ipc.fileExists(path).then((exists) => {
              if (!exists || cancelled) return;
              // Heuristic: paths without common file extensions are likely dirs
              // Better: use a proper dir check via list_directory
              return ipc.listDirectory(path).then(() => {
                // Success = it's a directory → set as project root
                useSettingsStore.getState().updateSetting("projectRoot", path);
                // Auto-open sidebar
                if (!useSettingsStore.getState().showSidebar) {
                  useSettingsStore.getState().updateSetting("showSidebar", true);
                }
                // Save to session
                const tabs = useEditorStore.getState().tabs;
                ipc.saveSession({
                  open_tabs: tabs.filter((t) => t.path).map((t) => ({
                    path: t.path!, encoding: t.encoding, language: t.language,
                  })),
                  active_tab_id: useEditorStore.getState().activeTabId,
                  project_root: path,
                  window_width: null, window_height: null,
                }).catch(() => {});
              }).catch(() => {
                // Not a directory → open as file
                if (isBinaryExtension(path)) return;
                ipc.readFile(path).then((result) => {
                  if (cancelled) return;
                  const name = path.split(/[/\\]/).pop() || path;
                  const ext = path.split(".").pop() || "";
                  useEditorStore.getState().openTab({
                    path, name,
                    content: result.content,
                    encoding: result.encoding,
                    language: detectLanguage(ext),
                  });
                }).catch((err) => {
                  console.error(`Failed to open dropped file: ${path}`, err);
                });
              });
            }).catch(() => {});
          }
        }
      });

      if (cancelled) {
        unlisten();
      } else {
        unlistenFn = unlisten;
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (unlistenFn) unlistenFn();
    };
  }, []); // Stable — no dependencies needed
}
