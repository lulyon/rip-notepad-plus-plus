import { useState, useEffect } from "react";
import { useEditorStore } from "./stores/editorStore";
import { useWindowTitle } from "./hooks/useWindowTitle";
import { useFileDrop } from "./hooks/useFileDrop";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { ipc } from "./lib/ipc";
import { detectLanguage } from "./lib/constants";
import { TabBar } from "./components/TabBar/TabBar";
import { Editor } from "./components/Editor/Editor";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { SearchPanel } from "./components/SearchPanel/SearchPanel";
import { EncodingDialog } from "./components/Dialogs/EncodingDialog";
import { GoToLineDialog } from "./components/Dialogs/GoToLineDialog";

function App() {
  const activeTabId = useEditorStore((s) => s.activeTabId);

  const [gotoLineOpen, setGotoLineOpen] = useState(false);

  // Global hooks
  useWindowTitle();
  useFileDrop();
  useKeyboardShortcuts();

  // Listen for custom events from Monaco actions
  useEffect(() => {
    function onOpenGoToLine() {
      setGotoLineOpen(true);
    }

    function onNavigateToMatch(e: Event) {
      const match = (e as CustomEvent).detail;
      if (!match?.path) return;

      const tabs = useEditorStore.getState().tabs;
      const existingTab = tabs.find((t) => t.path === match.path);

      if (existingTab) {
        useEditorStore.getState().setActiveTab(existingTab.id);
      } else {
        ipc.readFile(match.path).then((result) => {
          const name = match.path.split(/[/\\]/).pop() || match.path;
          const ext = match.path.split(".").pop() || "";
          useEditorStore.getState().openTab({
            path: match.path,
            name,
            content: result.content,
            encoding: result.encoding,
            language: detectLanguage(ext),
          });
        }).catch((err) => {
          console.error("Failed to open file from search results:", err);
        });
      }
    }

    window.addEventListener("open-go-to-line", onOpenGoToLine);
    window.addEventListener("navigate-to-match", onNavigateToMatch);
    return () => {
      window.removeEventListener("open-go-to-line", onOpenGoToLine);
      window.removeEventListener("navigate-to-match", onNavigateToMatch);
    };
  }, []);

  return (
    <div className="app">
      <TabBar />
      <div className="editor-area">
        {activeTabId ? (
          <Editor />
        ) : (
          <div className="welcome">
            <h1>ripNotepad++</h1>
            <p>Ctrl+N new file · Ctrl+O open · Ctrl+S save</p>
            <p>Drop files here to open</p>
          </div>
        )}
        <SearchPanel />
      </div>
      <StatusBar />
      <EncodingDialog />
      <GoToLineDialog open={gotoLineOpen} onClose={() => setGotoLineOpen(false)} />
    </div>
  );
}

export default App;
