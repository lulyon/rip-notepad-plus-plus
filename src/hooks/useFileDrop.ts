import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEditorStore } from "../stores/editorStore";
import { ipc } from "../lib/ipc";
import { detectLanguage } from "../lib/constants";
import { isBinaryExtension } from "../lib/fileUtils";

export function useFileDrop() {
  const openTab = useEditorStore((s) => s.openTab);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setup() {
      const appWindow = getCurrentWindow();
      unlisten = await appWindow.onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          for (const path of event.payload.paths) {
            if (isBinaryExtension(path)) continue;

            ipc
              .readFile(path)
              .then((result) => {
                const name = path.split(/[/\\]/).pop() || path;
                const ext = path.split(".").pop() || "";
                const language = detectLanguage(ext);
                openTab({
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
    }

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, [openTab]);
}
