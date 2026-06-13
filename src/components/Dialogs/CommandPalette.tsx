import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MENU_STRUCTURE, dispatchMenuAction } from "../MenuBar/menuDefinitions";
import "./CommandPalette.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  menuGroup: string;
}

export function CommandPalette({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build flat command list from MENU_STRUCTURE
  const allCommands = useMemo(() => {
    const items: CommandItem[] = [];
    for (const menu of MENU_STRUCTURE) {
      for (const child of menu.children) {
        if (child.type === "separator") continue;
        const menuLabel = t(menu.labelKey);
        items.push({
          id: child.id,
          label: t(child.labelKey),
          shortcut: child.shortcut,
          menuGroup: menuLabel,
        });
      }
    }
    return items;
  }, [t]);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands.slice(0, 20);
    const q = query.toLowerCase();
    return allCommands
      .filter((c) =>
        c.label.toLowerCase().includes(q) ||
        c.menuGroup.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [allCommands, query]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const executeCommand = useCallback(
    (id: string) => {
      dispatchMenuAction(id);
      onClose();
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        executeCommand(filtered[selectedIndex].id);
      }
    },
    [filtered, selectedIndex, executeCommand],
  );

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmd-palette-input"
          placeholder={t("cmdPalette.placeholder")}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          onKeyDown={handleKeyDown}
        />
        <div className="cmd-palette-list">
          {filtered.length === 0 ? (
            <div className="cmd-palette-empty">{t("cmdPalette.noResults")}</div>
          ) : (
            filtered.map((cmd, i) => (
              <div
                key={cmd.id}
                className={`cmd-palette-item ${i === selectedIndex ? "selected" : ""}`}
                onClick={() => executeCommand(cmd.id)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="cmd-palette-label">{cmd.label}</span>
                <span className="cmd-palette-group">{cmd.menuGroup}</span>
                {cmd.shortcut && (
                  <span className="cmd-palette-shortcut">{cmd.shortcut}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
