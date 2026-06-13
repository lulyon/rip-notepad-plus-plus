import { describe, it, expect, beforeEach, vi } from "vitest";
import { useMacroStore } from "../src/stores/macroStore";

beforeEach(() => {
  localStorage.clear();
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
});

describe("macroStore", () => {
  describe("startRecording", () => {
    it("sets isRecording to true and clears recorded actions", () => {
      // Pre-populate some actions to verify they are cleared
      useMacroStore.setState({
        recordedActions: [
          { actionType: "type", payload: { text: "a" }, timestamp: 0 },
        ],
      });

      useMacroStore.getState().startRecording();

      const s = useMacroStore.getState();
      expect(s.isRecording).toBe(true);
      expect(s.recordedActions).toHaveLength(0);
      expect(s.recordingName).toBe("");
      expect(s.recordingStartTime).toBeGreaterThan(0);
    });
  });

  describe("recordAction", () => {
    it("adds an action when recording", () => {
      useMacroStore.getState().startRecording();

      useMacroStore.getState().recordAction("type", { text: "a" });

      const actions = useMacroStore.getState().recordedActions;
      expect(actions).toHaveLength(1);
      expect(actions[0].actionType).toBe("type");
      expect(actions[0].payload).toEqual({ text: "a" });
      expect(actions[0].timestamp).toBeGreaterThanOrEqual(0);
    });

    it("skips adding actions when not recording", () => {
      useMacroStore.getState().recordAction("type", { text: "a" });

      expect(useMacroStore.getState().recordedActions).toHaveLength(0);
    });

    it("records multiple actions in sequence", () => {
      useMacroStore.getState().startRecording();
      useMacroStore.getState().recordAction("type", { text: "h" });
      useMacroStore.getState().recordAction("type", { text: "e" });
      useMacroStore.getState().recordAction("type", { text: "l" });
      useMacroStore.getState().recordAction("type", { text: "l" });
      useMacroStore.getState().recordAction("type", { text: "o" });

      expect(useMacroStore.getState().recordedActions).toHaveLength(5);
    });

    it("uses empty object as default payload", () => {
      useMacroStore.getState().startRecording();
      useMacroStore.getState().recordAction("cursorMove");
      const actions = useMacroStore.getState().recordedActions;
      expect(actions[0].payload).toEqual({});
    });
  });

  describe("stopRecording", () => {
    it("sets isRecording to false and sets recording name", () => {
      useMacroStore.getState().startRecording();
      useMacroStore.getState().recordAction("type", { text: "a" });

      useMacroStore.getState().stopRecording();

      const s = useMacroStore.getState();
      expect(s.isRecording).toBe(false);
      expect(s.recordingName).toBe("Unnamed");
      expect(s.recordedActions).toHaveLength(1); // actions preserved
    });
  });

  describe("saveMacro", () => {
    it("saves recorded actions as a named macro", () => {
      useMacroStore.getState().startRecording();
      useMacroStore.getState().recordAction("type", { text: "a" });
      useMacroStore.getState().stopRecording();

      useMacroStore.getState().saveMacro("My Macro");

      const s = useMacroStore.getState();
      expect(s.savedMacros).toHaveLength(1);
      expect(s.savedMacros[0].name).toBe("My Macro");
      expect(s.savedMacros[0].actions).toHaveLength(1);
    });

    it("does not save when no actions recorded", () => {
      useMacroStore.getState().startRecording();
      useMacroStore.getState().stopRecording();

      useMacroStore.getState().saveMacro("Empty Macro");

      expect(useMacroStore.getState().savedMacros).toHaveLength(0);
    });

    it("saves multiple macros", () => {
      useMacroStore.getState().startRecording();
      useMacroStore.getState().recordAction("type", { text: "a" });
      useMacroStore.getState().stopRecording();
      useMacroStore.getState().saveMacro("Macro 1");

      useMacroStore.getState().startRecording();
      useMacroStore.getState().recordAction("type", { text: "b" });
      useMacroStore.getState().stopRecording();
      useMacroStore.getState().saveMacro("Macro 2");

      expect(useMacroStore.getState().savedMacros).toHaveLength(2);
    });

    it("persists saved macros to localStorage", () => {
      useMacroStore.getState().startRecording();
      useMacroStore.getState().recordAction("type", { text: "x" });
      useMacroStore.getState().stopRecording();
      useMacroStore.getState().saveMacro("Persisted");

      const stored = JSON.parse(
        localStorage.getItem("ripnotepadpp-macros") || "[]",
      );
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe("Persisted");
    });
  });

  describe("deleteMacro", () => {
    it("removes a saved macro by name", () => {
      useMacroStore.setState({
        savedMacros: [{ name: "Test", actions: [] }],
      });

      useMacroStore.getState().deleteMacro("Test");

      expect(useMacroStore.getState().savedMacros).toHaveLength(0);
    });

    it("clears currentMacroName when deleting the selected macro", () => {
      useMacroStore.setState({
        savedMacros: [{ name: "Test", actions: [] }],
        currentMacroName: "Test",
      });

      useMacroStore.getState().deleteMacro("Test");

      expect(useMacroStore.getState().currentMacroName).toBeNull();
    });

    it("leaves currentMacroName unchanged when deleting a different macro", () => {
      useMacroStore.setState({
        savedMacros: [
          { name: "A", actions: [] },
          { name: "B", actions: [] },
        ],
        currentMacroName: "A",
      });

      useMacroStore.getState().deleteMacro("B");

      expect(useMacroStore.getState().currentMacroName).toBe("A");
    });
  });

  describe("loadMacros", () => {
    it("reloads macros from localStorage", () => {
      localStorage.setItem(
        "ripnotepadpp-macros",
        JSON.stringify([{ name: "Reloaded", actions: [] }]),
      );

      useMacroStore.getState().loadMacros();

      expect(useMacroStore.getState().savedMacros).toHaveLength(1);
      expect(useMacroStore.getState().savedMacros[0].name).toBe("Reloaded");
    });
  });

  describe("setPlaybackMacro", () => {
    it("sets the current macro name", () => {
      useMacroStore.getState().setPlaybackMacro("My Macro");
      expect(useMacroStore.getState().currentMacroName).toBe("My Macro");
    });

    it("clears the current macro name with null", () => {
      useMacroStore.getState().setPlaybackMacro("My Macro");
      useMacroStore.getState().setPlaybackMacro(null);
      expect(useMacroStore.getState().currentMacroName).toBeNull();
    });
  });

  describe("setPlaybackSpeed", () => {
    it("sets playback speed", () => {
      useMacroStore.getState().setPlaybackSpeed(2);
      expect(useMacroStore.getState().playbackSpeed).toBe(2);
    });

    it("accepts 0.5 speed", () => {
      useMacroStore.getState().setPlaybackSpeed(0.5);
      expect(useMacroStore.getState().playbackSpeed).toBe(0.5);
    });
  });

  describe("setIsPlaying", () => {
    it("sets isPlaying state", () => {
      useMacroStore.getState().setIsPlaying(true);
      expect(useMacroStore.getState().isPlaying).toBe(true);

      useMacroStore.getState().setIsPlaying(false);
      expect(useMacroStore.getState().isPlaying).toBe(false);
    });
  });
});
