import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MENU_STRUCTURE, dispatchMenuAction } from "./menuDefinitions";
import type { MenuItemDef } from "./menuDefinitions";
import { MenuItem } from "./MenuItem";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUdlStore } from "../../stores/udlStore";
import "./MenuBar.css";

export function MenuBar() {
  const { t } = useTranslation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const udls = useUdlStore((s) => s.udls);
  const columnMode = useSettingsStore((s) => s.columnMode);

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

  // Build menu structure with dynamic UDL items injected into Language menu
  const augmentedStructure = useMemo(() => {
    return MENU_STRUCTURE.map((menu) => {
      if (menu.id !== "language" || udls.length === 0) return menu;

      // Insert UDL items after the separator before language.defineLanguage
      const udlItems: MenuItemDef[] = udls.map((udl) => ({
        id: `lang.udl.${udl.id}`,
        labelKey: udl.name,
        label: udl.name,
      }));

      // We need to inject the UDL items into the children. Let's find the
      // separator before language.defineLanguage and add items before it.
      const defineIdx = menu.children.findIndex(
        (c) => c.id === "language.defineLanguage",
      );

      if (defineIdx < 0) return menu;

      // Add a "Custom Languages" label item and UDL language items before the
      // defineLanguage separator block.
      const customLangHeader: MenuItemDef = {
        id: "_udl_header",
        labelKey: "udl.customLanguages",
        label: "Custom Languages",
        disabled: true,
      };

      const newChildren = [...menu.children];
      // Insert before the separator that precedes language.defineLanguage
      // The pattern is: [...languages, S(), defineLanguage, S(), openUdlFolder]
      // We insert before the first separator that comes before defineLanguage
      newChildren.splice(
        defineIdx,
        0,
        ...([
          { id: "_sep_udl", labelKey: "", type: "separator" as const },
          customLangHeader,
          ...udlItems.map(
            (item) =>
              ({
                id: item.id,
                labelKey: item.labelKey,
              }) as MenuItemDef,
          ),
        ]),
      );

      return { ...menu, children: newChildren };
    }).map((menu) => {
      // Inject checked state for toggleable items
      return {
        ...menu,
        children: menu.children.map((child) => {
          if (child.id === "edit.columnMode") {
            return { ...child, checked: columnMode };
          }
          return child;
        }),
      };
    });
  }, [udls, columnMode]);

  return (
    <div ref={menuBarRef} className="menu-bar">
      {augmentedStructure.map((menu) => (
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
          <span className="menu-bar-label">{t(menu.labelKey)}</span>

          {openMenuId === menu.id && (
            <div
              className="menu-dropdown"
              onMouseDown={(e) => e.stopPropagation()}
            >
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
