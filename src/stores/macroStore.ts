import { create } from "zustand";

export interface MacroAction {
  actionType: string;
  payload: Record<string, unknown>;
  timestamp: number; // ms since recording start
}

export interface SavedMacro {
  name: string;
  actions: MacroAction[];
}

interface MacroState {
  isRecording: boolean;
  isPlaying: boolean;
  recordedActions: MacroAction[];
  recordingName: string;
  recordingStartTime: number;
  savedMacros: SavedMacro[];
  currentMacroName: string | null;
  playbackSpeed: number;

  startRecording: () => void;
  stopRecording: () => void;
  recordAction: (actionType: string, payload?: Record<string, unknown>) => void;
  saveMacro: (name: string) => void;
  deleteMacro: (name: string) => void;
  loadMacros: () => void;
  setPlaybackMacro: (name: string | null) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
}

const STORAGE_KEY = "ripnotepadpp-macros";

function loadSavedMacros(): SavedMacro[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function persistMacros(macros: SavedMacro[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(macros));
  } catch {
    // Silently ignore
  }
}

export const useMacroStore = create<MacroState>((set, get) => ({
  isRecording: false,
  isPlaying: false,
  recordedActions: [],
  recordingName: "",
  recordingStartTime: 0,
  savedMacros: loadSavedMacros(),
  currentMacroName: null,
  playbackSpeed: 1,

  startRecording: () => {
    set({
      isRecording: true,
      recordedActions: [],
      recordingName: "",
      recordingStartTime: Date.now(),
    });
  },

  stopRecording: () => {
    set({ isRecording: false, recordingName: "Unnamed" });
  },

  recordAction: (actionType, payload = {}) => {
    const state = get();
    if (!state.isRecording) return;

    const timestamp = Date.now() - state.recordingStartTime;
    set((s) => ({
      recordedActions: [
        ...s.recordedActions,
        { actionType, payload, timestamp },
      ],
    }));
  },

  saveMacro: (name) => {
    const state = get();
    if (state.recordedActions.length === 0) return;

    const macro: SavedMacro = {
      name,
      actions: [...state.recordedActions],
    };

    set((s) => ({
      savedMacros: [...s.savedMacros, macro],
      recordingName: name,
    }));

    persistMacros(get().savedMacros);
  },

  deleteMacro: (name) => {
    set((s) => ({
      savedMacros: s.savedMacros.filter((m) => m.name !== name),
      currentMacroName: s.currentMacroName === name ? null : s.currentMacroName,
    }));
    persistMacros(get().savedMacros);
  },

  loadMacros: () => {
    set({ savedMacros: loadSavedMacros() });
  },

  setPlaybackMacro: (name) => {
    set({ currentMacroName: name });
  },

  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: speed });
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing });
  },
}));
