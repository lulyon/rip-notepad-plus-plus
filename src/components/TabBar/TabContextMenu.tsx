import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import "./TabContextMenu.css";

interface Props {
  tabId: string;
  x: number;
  y: number;
  onClose: () => void;
}

interface ContextMenuItemDef {
  type?: "item" | "separator" | "submenu-header";
  labelKey?: string;
  action?: () => void;
  disabled?: boolean;
  colorClass?: string;
}

export function TabContextMenu({ tabId, x, y, onClose }: Props) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const tab = useEditorStore((s) => s.tabs.find((t) => t.id === tabId));
  const closeTab = useEditorStore((s) => s.closeTab);
  const closeOtherTabs = useEditorStore((s) => s.closeOtherTabs);
  const closeAllTabs = useEditorStore((s) => s.closeAllTabs);
  const togglePinTab = useEditorStore((s) => s.togglePinTab);
  const setTabColor = useEditorStore((s) => s.setTabColor);

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

  if (!tab) return null;

  const items: ContextMenuItemDef[] = [
    { labelKey: "tab.close", action: () => { closeTab(tabId); onClose(); }, disabled: tab.pinned },
    { type: "separator" },
    { labelKey: tab.pinned ? "tab.unpin" : "tab.pin", action: () => { togglePinTab(tabId); onClose(); } },
    { labelKey: "tab.closeAllButPinned", action: () => { closeAllUnpinned(); onClose(); } },
    { labelKey: "tab.closeOthers", action: () => { closeOtherTabs(tabId); onClose(); }, disabled: useEditorStore.getState().tabs.length <= 1 },
    { labelKey: "tab.closeAll", action: () => { closeAllTabs(); onClose(); }, disabled: useEditorStore.getState().tabs.length === 0 },
    { type: "separator" },
    { labelKey: "tab.copyPath", action: () => { if (tab.path) navigator.clipboard.writeText(tab.path); onClose(); }, disabled: !tab.path },
    { type: "separator" },
    { type: "submenu-header", labelKey: "tab.color" },
    { labelKey: "tab.colorNone", action: () => { setTabColor(tabId, null); onClose(); }, disabled: tab.color === null },
    { labelKey: "tab.colorRed", action: () => { setTabColor(tabId, 1); onClose(); }, colorClass: "tab-color-1" },
    { labelKey: "tab.colorOrange", action: () => { setTabColor(tabId, 2); onClose(); }, colorClass: "tab-color-2" },
    { labelKey: "tab.colorYellow", action: () => { setTabColor(tabId, 3); onClose(); }, colorClass: "tab-color-3" },
    { labelKey: "tab.colorGreen", action: () => { setTabColor(tabId, 4); onClose(); }, colorClass: "tab-color-4" },
    { labelKey: "tab.colorBlue", action: () => { setTabColor(tabId, 5); onClose(); }, colorClass: "tab-color-5" },
  ];

  function closeAllUnpinned() {
    const store = useEditorStore.getState();
    if (store.tabs.filter(t => !t.pinned).length === 0) return;
    store.closeAllTabs(); // closeAllTabs already skips pinned and handles unsaved
    onClose();
  }

  return (
    <div ref={menuRef} className="tab-context-menu" style={{ left: x, top: y }}>
      {items.map((item, i) => {
        if (item.type === "separator") {
          return <div key={i} className="context-menu-separator" />;
        }
        if (item.type === "submenu-header") {
          return <div key={i} className="context-menu-submenu-header">{t(item.labelKey!)}</div>;
        }
        return (
          <button
            key={i}
            className="context-menu-item"
            onClick={item.action}
            disabled={item.disabled}
          >
            {item.colorClass && <span className={`context-menu-color-dot ${item.colorClass}`} />}
            {t(item.labelKey!)}
          </button>
        );
      })}
    </div>
  );
}
