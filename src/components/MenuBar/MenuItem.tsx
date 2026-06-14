import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { MenuItemDef } from "./menuDefinitions";

interface Props {
  item: MenuItemDef;
  depth: number;
  onAction: (id: string) => void;
}

export function MenuItem({ item, depth, onAction }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasChildren = item.children && item.children.length > 0;

  const close = useCallback(() => setOpen(false), []);

  // Close submenu when mouse leaves
  useEffect(() => {
    if (!open || !hasChildren) return;
    function handleMouseMove(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Check if the mouse is over a child submenu that's still attached
        const children = ref.current.querySelectorAll(".menu-submenu");
        for (const child of children) {
          if (child.contains(e.target as Node)) return;
        }
        close();
      }
    }
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [open, hasChildren, close]);

  if (item.type === "separator") {
    return <div className="menu-separator" />;
  }

  return (
    <div
      ref={ref}
      className={`menu-item ${item.disabled ? "disabled" : ""} ${open && hasChildren ? "open" : ""}`}
      onMouseEnter={() => hasChildren && !item.disabled && setOpen(true)}
      onMouseLeave={() => hasChildren && setOpen(false)}
      onClick={() => {
        if (!item.disabled && !hasChildren) {
          onAction(item.id);
        }
      }}
    >
      <span className="menu-item-label">
        {item.label || t(item.labelKey)}
      </span>
      {item.shortcut && !hasChildren && (
        <span className="menu-item-shortcut">{item.shortcut}</span>
      )}
      {hasChildren && <span className="menu-item-arrow">▶</span>}

      {open && hasChildren && (
        <div
          className={`menu-submenu ${depth > 2 ? "menu-submenu-left" : ""}`}
        >
          {item.children!.map((child) => (
            <MenuItem
              key={child.id}
              item={child}
              depth={depth + 1}
              onAction={(id) => {
                onAction(id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
