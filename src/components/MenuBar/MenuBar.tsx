import { useState, useEffect, useRef, useCallback } from "react";
import { MENU_STRUCTURE, dispatchMenuAction } from "./menuDefinitions";
import { MenuItem } from "./MenuItem";
import "./MenuBar.css";

export function MenuBar() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close the active menu when clicking outside
  const closeAllMenus = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuBarRef.current &&
        !menuBarRef.current.contains(e.target as Node)
      ) {
        closeAllMenus();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [closeAllMenus]);

  // Keyboard navigation for menu bar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;

      // Alt+letter to open a specific menu
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const menu = MENU_STRUCTURE.find(
          (m) => m.altKey.toLowerCase() === e.key.toLowerCase(),
        );
        if (menu) {
          e.preventDefault();
          setOpenMenuId((prev) => (prev === menu.id ? null : menu.id));
        }
        return;
      }

      if (!openMenuId) return;

      if (e.key === "Escape") {
        closeAllMenus();
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const idx = MENU_STRUCTURE.findIndex((m) => m.id === openMenuId);
        const prevIdx = (idx - 1 + MENU_STRUCTURE.length) % MENU_STRUCTURE.length;
        setOpenMenuId(MENU_STRUCTURE[prevIdx].id);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const idx = MENU_STRUCTURE.findIndex((m) => m.id === openMenuId);
        const nextIdx = (idx + 1) % MENU_STRUCTURE.length;
        setOpenMenuId(MENU_STRUCTURE[nextIdx].id);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openMenuId, closeAllMenus]);

  // Dispatch menu action via custom event
  const handleMenuAction = useCallback(
    (actionId: string) => {
      dispatchMenuAction(actionId);
      closeAllMenus();
    },
    [closeAllMenus],
  );

  return (
    <div ref={menuBarRef} className="menu-bar">
      {MENU_STRUCTURE.map((menu) => (
        <div
          key={menu.id}
          className={`menu-bar-item ${openMenuId === menu.id ? "active" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setOpenMenuId((prev) => (prev === menu.id ? null : menu.id));
          }}
          onMouseEnter={() => {
            if (openMenuId !== null) {
              setOpenMenuId(menu.id);
            }
          }}
        >
          <span className="menu-bar-label">{menu.label}</span>

          {openMenuId === menu.id && (
            <div className="menu-dropdown">
              {menu.children.map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  depth={1}
                  onAction={handleMenuAction}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
