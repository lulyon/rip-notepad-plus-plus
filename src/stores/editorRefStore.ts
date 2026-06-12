import { create } from "zustand";
import type { editor } from "monaco-editor";

interface EditorRefState {
  editorRef: editor.IStandaloneCodeEditor | null;
  setEditorRef: (ref: editor.IStandaloneCodeEditor | null) => void;
}

export const useEditorRefStore = create<EditorRefState>((set) => ({
  editorRef: null,
  setEditorRef: (ref) => set({ editorRef: ref }),
}));
