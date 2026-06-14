import { useEffect, useRef } from "react";
import { useContextMenuStore } from "../../stores/contextMenuStore";
import "./EditorContextMenu.css";

interface Props {
  x: number;
  y: number;
  onClose: () => void;
}

export function EditorContextMenu({ x, y, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const items = useContextMenuStore((s) => s.items);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleAction = (action: string) => {
    window.dispatchEvent(new CustomEvent("menu-action", { detail: action }));
    onClose();
  };

  return (
    <div ref={menuRef} className="editor-context-menu" style={{ left: x, top: y }}>
      {items.map((item) => {
        if (item.separator) {
          return <div key={item.id} className="editor-context-separator" />;
        }
        return (
          <button
            key={item.id}
            className="editor-context-item"
            onClick={() => handleAction(item.action)}
          >
            {item.label.replace(/&/g, "")}
          </button>
        );
      })}
    </div>
  );
}
