import { useEditorStore } from "./stores/editorStore";
import { useWindowTitle } from "./hooks/useWindowTitle";
import { useFileDrop } from "./hooks/useFileDrop";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { TabBar } from "./components/TabBar/TabBar";
import { Editor } from "./components/Editor/Editor";
import { StatusBar } from "./components/StatusBar/StatusBar";

function App() {
  const activeTabId = useEditorStore((s) => s.activeTabId);

  // Global hooks
  useWindowTitle();
  useFileDrop();
  useKeyboardShortcuts();

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
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
