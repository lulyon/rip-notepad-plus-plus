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

export function TabContextMenu({ tabId, x, y, onClose }: Props) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const tab = useEditorStore((s) => s.tabs.find((t) => t.id === tabId));
  const closeTab = useEditorStore((s) => s.closeTab);
  const closeOtherTabs = useEditorStore((s) => s.closeOtherTabs);
  const closeAllTabs = useEditorStore((s) => s.closeAllTabs);

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

  const items = [
    { labelKey: "tab.close", action: () => { closeTab(tabId); onClose(); } },
    { labelKey: "tab.closeOthers", action: () => { closeOtherTabs(tabId); onClose(); }, disabled: useEditorStore.getState().tabs.length <= 1 },
    { labelKey: "tab.closeAll", action: () => { closeAllTabs(); onClose(); }, disabled: useEditorStore.getState().tabs.length === 0 },
    { type: "separator" as const },
    { labelKey: "tab.copyPath", action: () => { if (tab.path) navigator.clipboard.writeText(tab.path); onClose(); }, disabled: !tab.path },
  ];

  return (
    <div ref={menuRef} className="tab-context-menu" style={{ left: x, top: y }}>
      {items.map((item, i) => {
        if ("type" in item) {
          return <div key={i} className="context-menu-separator" />;
        }
        return (
          <button
            key={i}
            className="context-menu-item"
            onClick={item.action}
            disabled={item.disabled}
          >
            {t(item.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
