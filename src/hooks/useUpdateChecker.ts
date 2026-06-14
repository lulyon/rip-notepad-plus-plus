import { useEffect, useRef } from "react";
import { useSettingsStore } from "../stores/settingsStore";

/**
 * Checks for app updates on startup and periodically.
 * Uses Tauri's built-in updater plugin.
 */
export function useUpdateChecker() {
  const autoCheck = useSettingsStore((s) => s.autoCheckUpdate);
  const checkedRef = useRef(false);

  // Check on startup (once)
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    if (autoCheck) {
      checkForUpdate(true); // silent check
    }
  }, [autoCheck]);

  // Listen for manual check request
  useEffect(() => {
    function handleCheck() {
      checkForUpdate(false); // notify even if no update
    }
    window.addEventListener("check-for-updates", handleCheck);
    return () => window.removeEventListener("check-for-updates", handleCheck);
  }, []);
}

async function checkForUpdate(silent: boolean) {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update?.available) {
      window.dispatchEvent(new CustomEvent("update-available", {
        detail: { version: update.version, body: update.body },
      }));
    } else if (!silent) {
      window.dispatchEvent(new CustomEvent("update-not-available"));
    }
  } catch (e) {
    console.warn("Update check failed:", e);
    if (!silent) {
      window.dispatchEvent(new CustomEvent("update-error", { detail: String(e) }));
    }
  }
}
