import { useCallback } from "react";
import type { OnMount } from "@monaco-editor/react";
import { useEditorStore } from "../stores/editorStore";
import { ipc } from "../lib/ipc";
import { detectLanguage } from "../lib/constants";
import { open, save } from "@tauri-apps/plugin-dialog";

export function useMonacoActions() {
  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      // ── File Operations ──
      editor.addAction({
        id: "file-save",
        label: "Save",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => {
          const tab = useEditorStore.getState().tabs.find(
            (t) => t.id === useEditorStore.getState().activeTabId,
          );
          if (!tab) return;

          if (tab.path) {
            ipc
              .writeFile(tab.path, tab.content, tab.encoding)
              .then(() => {
                useEditorStore.getState().markTabSaved(tab.id, tab.path!);
              })
              .catch((err) => {
                console.error("Save failed:", err);
              });
          } else {
            // Save As — prompt for file path
            save({
              title: "Save As",
              defaultPath: tab.name,
              filters: [{ name: "All Files", extensions: ["*"] }],
            }).then((filePath) => {
              if (filePath) {
                ipc
                  .writeFile(filePath, tab.content, tab.encoding)
                  .then(() => {
                    useEditorStore.getState().markTabSaved(tab.id, filePath);
                  })
                  .catch((err) => {
                    console.error("Save failed:", err);
                  });
              }
            });
          }
        },
      });

      editor.addAction({
        id: "file-save-as",
        label: "Save As...",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
        ],
        run: () => {
          const tab = useEditorStore.getState().tabs.find(
            (t) => t.id === useEditorStore.getState().activeTabId,
          );
          if (!tab) return;

          save({
            title: "Save As",
            defaultPath: tab.path || tab.name,
            filters: [{ name: "All Files", extensions: ["*"] }],
          }).then((filePath) => {
            if (filePath) {
              ipc
                .writeFile(filePath, tab.content, tab.encoding)
                .then(() => {
                  useEditorStore.getState().markTabSaved(tab.id, filePath);
                })
                .catch((err) => {
                  console.error("Save failed:", err);
                });
            }
          });
        },
      });

      editor.addAction({
        id: "file-open",
        label: "Open...",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO],
        run: () => {
          open({
            title: "Open File",
            multiple: true,
            filters: [{ name: "All Files", extensions: ["*"] }],
          }).then((result) => {
            const files: string[] = result
              ? (Array.isArray(result) ? result : [result])
              : [];
            for (const path of files) {
              ipc
                .readFile(path)
                .then((fileData) => {
                  const name = path.split(/[/\\]/).pop() || path;
                  const ext = path.split(".").pop() || "";
                  useEditorStore.getState().openTab({
                    path,
                    name,
                    content: fileData.content,
                    encoding: fileData.encoding,
                    language: detectLanguage(ext),
                  });
                })
                .catch((err) => {
                  console.error("Open failed:", err);
                });
            }
          });
        },
      });

      editor.addAction({
        id: "file-new",
        label: "New",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
        run: () => {
          useEditorStore.getState().newTab();
        },
      });

      editor.addAction({
        id: "file-close",
        label: "Close Tab",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW],
        run: () => {
          const activeId = useEditorStore.getState().activeTabId;
          if (activeId) {
            useEditorStore.getState().closeTab(activeId);
          }
        },
      });

      // ── Find/Replace ──
      // Disable Monaco's built-in find widget — we use custom SearchPanel
      editor.updateOptions({
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: "never" as const,
        },
      });

      // Override Ctrl+F and Ctrl+H to NOT open Monaco's widget
      // (These will be handled by the global SearchPanel)
      editor.addAction({
        id: "find-toggle",
        label: "Find...",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
        run: () => {
          // emit custom event for SearchPanel to toggle
          window.dispatchEvent(new CustomEvent("toggle-find-panel"));
        },
      });

      editor.addAction({
        id: "replace-toggle",
        label: "Replace...",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
        run: () => {
          window.dispatchEvent(new CustomEvent("toggle-replace-panel"));
        },
      });

      editor.addAction({
        id: "go-to-line",
        label: "Go To Line...",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG],
        run: () => {
          window.dispatchEvent(new CustomEvent("open-go-to-line"));
        },
      });
    },
    [],
  );

  return { handleMount };
}
