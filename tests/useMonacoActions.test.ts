import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMonacoActions } from "../src/hooks/useMonacoActions";

// Mock Tauri dialog since useMonacoActions imports it
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(null),
}));

// Minimal IPC mock for the IPC calls inside handleMount action handlers
vi.mock("../src/lib/ipc", () => ({
  ipc: {
    readFile: vi.fn().mockResolvedValue({ content: "", encoding: "UTF-8", detected_by_bom: false }),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("useMonacoActions", () => {
  it("exports handleMount function", () => {
    const { result } = renderHook(() => useMonacoActions());
    expect(result.current).toHaveProperty("handleMount");
    expect(typeof result.current.handleMount).toBe("function");
  });

  it("handleMount does not throw when called with minimal editor mock", () => {
    const { result } = renderHook(() => useMonacoActions());

    const mockEditor = {
      addAction: vi.fn(),
      updateOptions: vi.fn(),
    };

    const mockMonaco = {
      KeyMod: { CtrlCmd: 2048, Shift: 1024, WinCtrl: 256 },
      KeyCode: {
        KeyS: 49, KeyO: 24, KeyN: 50, KeyW: 52,
        KeyF: 33, KeyH: 36, KeyG: 35, KeyP: 40,
      },
    };

    expect(() => {
      (result.current.handleMount as any)(mockEditor, mockMonaco);
    }).not.toThrow();

    expect(mockEditor.addAction).toHaveBeenCalled();
    expect(mockEditor.updateOptions).toHaveBeenCalled();
  });
});
