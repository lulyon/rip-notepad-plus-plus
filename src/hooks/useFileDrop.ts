import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEditorStore } from "../stores/editorStore";
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
            if (isBinaryExtension(path)) continue;

            ipc
              .readFile(path)
              .then((result) => {
                if (cancelled) return;
                const name = path.split(/[/\\]/).pop() || path;
                const ext = path.split(".").pop() || "";
                const language = detectLanguage(ext);
                useEditorStore.getState().openTab({
                  path,
                  name,
                  content: result.content,
                  encoding: result.encoding,
                  language,
                });
              })
              .catch((err) => {
                console.error(`Failed to open dropped file: ${path}`, err);
              });
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
