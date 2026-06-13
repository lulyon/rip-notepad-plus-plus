import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMacroRecorder } from "../src/hooks/useMacroRecorder";
import { useMacroStore } from "../src/stores/macroStore";
import { useEditorRefStore } from "../src/stores/editorRefStore";

const mockEditor = vi.hoisted(() => ({
  trigger: vi.fn(),
  focus: vi.fn(),
  getModel: vi.fn(() => null),
}));

describe("useMacroRecorder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useMacroStore.setState({
      isRecording: false,
      isPlaying: false,
      recordedActions: [],
      recordingName: "",
      recordingStartTime: 0,
      savedMacros: [],
      currentMacroName: null,
      playbackSpeed: 1,
    });
    useEditorRefStore.setState({
      editorRef: null,
      secondaryEditorRef: null,
    });
    mockEditor.trigger.mockClear();
    mockEditor.focus.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("recording", () => {
    it("records keystrokes when macroStore.isRecording is true", () => {
      useMacroStore.getState().startRecording();
      renderHook(() => useMacroRecorder());

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", {
          key: "a", bubbles: true, cancelable: true,
        }));
      });
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", {
          key: "b", bubbles: true, cancelable: true,
        }));
      });

      const actions = useMacroStore.getState().recordedActions;
      expect(actions).toHaveLength(2);
      expect(actions[0]).toMatchObject({ actionType: "keypress", payload: { key: "a" } });
      expect(actions[1]).toMatchObject({ actionType: "keypress", payload: { key: "b" } });
    });

    it("does NOT record when not recording", () => {
      useMacroStore.setState({ isRecording: false });
      renderHook(() => useMacroRecorder());

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", {
          key: "a", bubbles: true, cancelable: true,
        }));
      });

      expect(useMacroStore.getState().recordedActions).toHaveLength(0);
    });

    it("records special keys (Enter, Backspace, Delete, arrows)", () => {
      useMacroStore.getState().startRecording();
      renderHook(() => useMacroRecorder());

      const specialKeys = ["Enter", "Backspace", "Delete", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"];
      for (const key of specialKeys) {
        act(() => {
          document.dispatchEvent(new KeyboardEvent("keydown", {
            key, bubbles: true, cancelable: true,
          }));
        });
      }

      const actions = useMacroStore.getState().recordedActions;
      expect(actions).toHaveLength(specialKeys.length);
      for (let i = 0; i < specialKeys.length; i++) {
        expect(actions[i].payload.key).toBe(specialKeys[i]);
      }
    });
  });

  describe("playback", () => {
    it("replays recorded actions", () => {
      useMacroStore.setState({
        savedMacros: [{
          name: "test-macro",
          actions: [
            { actionType: "keypress", payload: { key: "H" }, timestamp: 0 },
            { actionType: "keypress", payload: { key: "i" }, timestamp: 100 },
          ],
        }],
        currentMacroName: "test-macro",
        isPlaying: true,
      });
      useEditorRefStore.setState({ editorRef: mockEditor as any });

      renderHook(() => useMacroRecorder());

      // Advance past the initial 200ms playback started delay
      vi.advanceTimersByTime(200);
      // Advance past the first action delay (100 / 1 = 100ms)
      vi.advanceTimersByTime(100);
      // Advance past the second action delay (100 / 1 = 100ms)
      vi.advanceTimersByTime(100);

      expect(mockEditor.trigger).toHaveBeenCalledWith("keyboard", "type", { text: "H" });
      expect(mockEditor.trigger).toHaveBeenCalledWith("keyboard", "type", { text: "i" });
      expect(useMacroStore.getState().isPlaying).toBe(false);
    });

    it("does not playback when isPlaying is false", () => {
      useEditorRefStore.setState({ editorRef: mockEditor as any });

      renderHook(() => useMacroRecorder());
      vi.advanceTimersByTime(500);

      expect(mockEditor.trigger).not.toHaveBeenCalled();
    });
  });
});
