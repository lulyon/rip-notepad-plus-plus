import { useEditorStore } from "./stores/editorStore";
import { TabBar } from "./components/TabBar/TabBar";
import { Editor } from "./components/Editor/Editor";
import { StatusBar } from "./components/StatusBar/StatusBar";

function App() {
  const activeTabId = useEditorStore((s) => s.activeTabId);

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
          </div>
        )}
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
