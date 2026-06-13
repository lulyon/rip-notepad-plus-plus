import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcuts } from "../src/hooks/useKeyboardShortcuts";
import { useEditorStore } from "../src/stores/editorStore";

/** Helper: dispatch a keyboard event with given options */
function fireKey(key: string, opts: { ctrl?: boolean; shift?: boolean; meta?: boolean } = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    ctrlKey: opts.ctrl ?? false,
    shiftKey: opts.shift ?? false,
    metaKey: opts.meta ?? false,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
      secondaryTabId: null,
      unsavedTabs: null,
      pendingCloseAll: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Ctrl+Tab dispatches next tab action", () => {
    const tab1Id = useEditorStore.getState().newTab();
    const tab2Id = useEditorStore.getState().newTab();
    useEditorStore.setState({ activeTabId: tab1Id });

    renderHook(() => useKeyboardShortcuts());

    fireKey("Tab", { ctrl: true });

    expect(useEditorStore.getState().activeTabId).toBe(tab2Id);
  });

  it("Ctrl+Shift+Tab dispatches previous tab", () => {
    const tab1Id = useEditorStore.getState().newTab();
    const tab2Id = useEditorStore.getState().newTab();
    useEditorStore.setState({ activeTabId: tab2Id });

    renderHook(() => useKeyboardShortcuts());

    fireKey("Tab", { ctrl: true, shift: true });

    expect(useEditorStore.getState().activeTabId).toBe(tab1Id);
  });

  it("Ctrl+PageDown goes to next tab", () => {
    const tab1Id = useEditorStore.getState().newTab();
    const tab2Id = useEditorStore.getState().newTab();
    useEditorStore.setState({ activeTabId: tab1Id });

    renderHook(() => useKeyboardShortcuts());

    fireKey("PageDown", { ctrl: true });

    expect(useEditorStore.getState().activeTabId).toBe(tab2Id);
  });

  it("Ctrl+PageUp goes to previous tab", () => {
    const tab1Id = useEditorStore.getState().newTab();
    const tab2Id = useEditorStore.getState().newTab();
    useEditorStore.setState({ activeTabId: tab2Id });

    renderHook(() => useKeyboardShortcuts());

    fireKey("PageUp", { ctrl: true });

    expect(useEditorStore.getState().activeTabId).toBe(tab1Id);
  });

  it("fires regardless of event target (no input/textarea filter)", () => {
    useEditorStore.getState().newTab();
    const tab2Id = useEditorStore.getState().newTab();
    useEditorStore.setState({ activeTabId: useEditorStore.getState().tabs[0].id });

    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Tab",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }));
    });

    expect(useEditorStore.getState().activeTabId).toBe(tab2Id);
    document.body.removeChild(input);
  });
});
