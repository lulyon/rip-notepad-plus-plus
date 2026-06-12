import { useState, useEffect } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import "./ShortcutMapperDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShortcutMapperDialog({ open, onClose }: Props) {
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const setShortcut = useSettingsStore((s) => s.setShortcut);
  const resetShortcuts = useSettingsStore((s) => s.resetShortcuts);

  const [search, setSearch] = useState("");
  const [rebindingId, setRebindingId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (rebindingId) return; // capturing keys
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, rebindingId]);

  // Capture key combination for rebinding
  useEffect(() => {
    if (!rebindingId) return;

    function captureKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");

      // Filter out modifier-only presses
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        return;
      }

      // Map special keys
      const keyMap: Record<string, string> = {
        " ": "Space",
        ArrowUp: "Up",
        ArrowDown: "Down",
        ArrowLeft: "Left",
        ArrowRight: "Right",
        Tab: "Tab",
        Escape: "Escape",
        Delete: "Del",
        Backspace: "Backspace",
        Insert: "Insert",
        Home: "Home",
        End: "End",
        PageUp: "PageUp",
        PageDown: "PageDown",
        Enter: "Enter",
      };
      const keyName = keyMap[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);

      parts.push(keyName);
      const binding = parts.join("+");

      setShortcut(rebindingId!, binding);
      setRebindingId(null);
    }

    window.addEventListener("keydown", captureKey, true);
    return () => window.removeEventListener("keydown", captureKey, true);
  }, [rebindingId, setShortcut]);

  if (!open) return null;

  const entries = Object.entries(shortcuts).filter(
    ([id, binding]) =>
      !search ||
      id.toLowerCase().includes(search.toLowerCase()) ||
      binding.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog shortcut-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Shortcut Mapper</h2>

        <input
          type="text"
          className="shortcut-search"
          placeholder="Filter shortcuts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="shortcut-list">
          {entries.map(([id, binding]) => (
            <div key={id} className="shortcut-row">
              <span className="shortcut-label">{id}</span>
              <button
                className={`shortcut-binding ${rebindingId === id ? "rebinding" : ""}`}
                onClick={() => setRebindingId(id === rebindingId ? null : id)}
              >
                {rebindingId === id ? "Press keys..." : binding}
              </button>
            </div>
          ))}
        </div>

        <div className="dialog-actions">
          <button className="btn" onClick={resetShortcuts}>
            Reset All
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
