import { useEffect, useRef } from "react";
import { useMacroStore } from "../stores/macroStore";
import { useEditorRefStore } from "../stores/editorRefStore";

/**
 * Hooks into the Monaco editor to record keyboard input and
 * editor actions during macro recording, and play them back.
 */
export function useMacroRecorder() {
  const isRecording = useMacroStore((s) => s.isRecording);
  const isPlaying = useMacroStore((s) => s.isPlaying);
  const recordAction = useMacroStore((s) => s.recordAction);
  const setIsPlaying = useMacroStore((s) => s.setIsPlaying);
  const currentMacroName = useMacroStore((s) => s.currentMacroName);
  const savedMacros = useMacroStore((s) => s.savedMacros);
  const playbackSpeed = useMacroStore((s) => s.playbackSpeed);
  const editorRef = useEditorRefStore((s) => s.editorRef);

  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Record keystrokes when recording is active
  useEffect(() => {
    if (!isRecording) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Record meaningful keystrokes
      if (
        e.key.length === 1 || // printable characters
        e.key === "Enter" ||
        e.key === "Tab" ||
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.key.startsWith("Arrow")
      ) {
        recordAction("keypress", {
          key: e.key,
          ctrlKey: e.ctrlKey || e.metaKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
        });
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () =>
      document.removeEventListener("keydown", handleKeyDown, true);
  }, [isRecording, recordAction]);

  // Playback
  useEffect(() => {
    if (!isPlaying || !currentMacroName || !editorRef) return;

    const macro = savedMacros.find((m) => m.name === currentMacroName);
    if (!macro) {
      setIsPlaying(false);
      return;
    }

    // Focus the editor
    editorRef.focus();

    let idx = 0;
    const playNext = () => {
      if (idx >= macro.actions.length) {
        setIsPlaying(false);
        return;
      }

      const action = macro.actions[idx];
      const prevAction = idx > 0 ? macro.actions[idx - 1] : null;
      const delay = prevAction
        ? (action.timestamp - prevAction.timestamp) / playbackSpeed
        : 100 / playbackSpeed;

      playbackTimerRef.current = setTimeout(() => {
        if (action.actionType === "keypress") {
          const { key } = action.payload as Record<string, string>;

          if (key === "Backspace") {
            editorRef.trigger("keyboard", "deleteLeft", {});
          } else if (key === "Delete") {
            editorRef.trigger("keyboard", "deleteRight", {});
          } else if (key.startsWith("Arrow")) {
            const dir = key.replace("Arrow", "").toLowerCase();
            editorRef.trigger("keyboard", "type", { text: "" });
            editorRef.setPosition({
              lineNumber: Math.max(1, editorRef.getPosition()!.lineNumber + (dir === "up" ? -1 : dir === "down" ? 1 : 0)),
              column: Math.max(1, editorRef.getPosition()!.column + (dir === "left" ? -1 : dir === "right" ? 1 : 0)),
            });
          } else {
            editorRef.trigger("keyboard", "type", { text: key === "Enter" ? "\n" : key });
          }
        }
        idx++;
        playNext();
      }, Math.max(10, delay));
    };

    // Start after a short delay
    playbackTimerRef.current = setTimeout(playNext, 200);

    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
    };
  }, [
    isPlaying,
    currentMacroName,
    savedMacros,
    editorRef,
    playbackSpeed,
    setIsPlaying,
  ]);
}
