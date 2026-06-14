import { useCallback } from "react";
import type { OnMount } from "@monaco-editor/react";
import { useEditorStore } from "../stores/editorStore";
import { useBookmarkStore } from "../stores/bookmarkStore";
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
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
          monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyS,
        ],
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
          monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
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
        id: "file-open-folder",
        label: "Open Folder...",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO,
          monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyO,
        ],
        run: () => {
          window.dispatchEvent(new CustomEvent("menu-action", { detail: "file.openFolder" }));
        },
      });

      editor.addAction({
        id: "file-open",
        label: "Open...",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO,
          monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyO,
        ],
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
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
          monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyN,
        ],
        run: () => {
          useEditorStore.getState().newTab();
        },
      });

      editor.addAction({
        id: "file-close",
        label: "Close Tab",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW,
          monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyW,
        ],
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
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
          monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyF,
        ],
        run: () => {
          // emit custom event for SearchPanel to toggle
          window.dispatchEvent(new CustomEvent("toggle-find-panel"));
        },
      });

      editor.addAction({
        id: "replace-toggle",
        label: "Replace...",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH,
          monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyH,
        ],
        run: () => {
          window.dispatchEvent(new CustomEvent("toggle-replace-panel"));
        },
      });

      editor.addAction({
        id: "go-to-line",
        label: "Go To Line...",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG,
          monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyG,
        ],
        run: () => {
          window.dispatchEvent(new CustomEvent("open-go-to-line"));
        },
      });

      editor.addAction({
        id: "command-palette",
        label: "Command Palette...",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
          monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
        ],
        run: () => {
          window.dispatchEvent(new CustomEvent("open-command-palette"));
        },
      });

      // ── Bookmark toggle — Ctrl+F2 ──
      editor.addAction({
        id: "bookmark-toggle",
        label: "Toggle Bookmark",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.F2, monaco.KeyMod.WinCtrl | monaco.KeyCode.F2],
        run: () => {
          const tabId = useEditorStore.getState().activeTabId;
          if (!tabId) return;
          const pos = editor.getPosition();
          if (pos) useBookmarkStore.getState().toggleBookmark(tabId, pos.lineNumber, pos.column);
          window.dispatchEvent(new CustomEvent("bookmarks-changed"));
        },
      });

      // ── Next bookmark — F2 ──
      editor.addAction({
        id: "bookmark-next",
        label: "Next Bookmark",
        keybindings: [monaco.KeyCode.F2],
        run: () => {
          const tabId = useEditorStore.getState().activeTabId;
          if (!tabId) return;
          const pos = editor.getPosition();
          if (!pos) return;
          const next = useBookmarkStore.getState().findNextBookmark(tabId, pos.lineNumber);
          if (next !== null) {
            editor.setPosition({ lineNumber: next, column: 1 });
            editor.revealLineInCenter(next);
          }
        },
      });

      // ── Prev bookmark — Shift+F2 ──
      editor.addAction({
        id: "bookmark-prev",
        label: "Previous Bookmark",
        keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F2],
        run: () => {
          const tabId = useEditorStore.getState().activeTabId;
          if (!tabId) return;
          const pos = editor.getPosition();
          if (!pos) return;
          const prev = useBookmarkStore.getState().findPrevBookmark(tabId, pos.lineNumber);
          if (prev !== null) {
            editor.setPosition({ lineNumber: prev, column: 1 });
            editor.revealLineInCenter(prev);
          }
        },
      });

      // ── Go to matching brace — Ctrl+B ──
      editor.addAction({
        id: "goto-brace",
        label: "Go to Matching Brace",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyB],
        run: () => editor.getAction("editor.action.jumpToBracket")?.run(),
      });

      // ── Select matching braces — Ctrl+Shift+B ──
      editor.addAction({
        id: "select-braces",
        label: "Select Matching Braces",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyB],
        run: () => editor.getAction("editor.action.selectToBracket")?.run(),
      });

      // ── Comment toggle — Ctrl+Q ──
      editor.addAction({
        id: "comment-toggle",
        label: "Toggle Comment",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyQ, monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyQ],
        run: () => editor.getAction("editor.action.commentLine")?.run(),
      });

      // ── Block comment — Ctrl+Shift+Q ──
      editor.addAction({
        id: "block-comment",
        label: "Block Comment",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyQ],
        run: () => editor.getAction("editor.action.blockComment")?.run(),
      });

      // ── Restore Last Closed File — Ctrl+Shift+T ──
      editor.addAction({
        id: "restore-last-closed",
        label: "Restore Last Closed File",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyT,
          monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyT,
        ],
        run: () => useEditorStore.getState().restoreLastClosedTab(),
      });

      // ── Distraction Free Mode — F12 ──
      editor.addAction({
        id: "distraction-free",
        label: "Distraction Free Mode",
        keybindings: [monaco.KeyCode.F12],
        run: () => { window.dispatchEvent(new CustomEvent("menu-action", { detail: "view.distractionFree" })); },
      });

      // ── Launch Claude — Ctrl+Alt+C ──
      editor.addAction({
        id: "launch-claude",
        label: "Launch Claude",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyC,
          monaco.KeyMod.WinCtrl | monaco.KeyMod.Alt | monaco.KeyCode.KeyC,
        ],
        run: () => { window.dispatchEvent(new CustomEvent("menu-action", { detail: "run.claudeCode" })); },
      });

      // ── Launch Codex — Ctrl+Alt+X ──
      editor.addAction({
        id: "launch-codex",
        label: "Launch Codex",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyX,
          monaco.KeyMod.WinCtrl | monaco.KeyMod.Alt | monaco.KeyCode.KeyX,
        ],
        run: () => { window.dispatchEvent(new CustomEvent("menu-action", { detail: "run.codex" })); },
      });
    },
    [],
  );

  return { handleMount };
}
