import { create } from "zustand";
import type { PluginInfo } from "../types/ipc";
import { ipc } from "../lib/ipc";

interface PluginState {
  plugins: PluginInfo[];
  loading: boolean;
  error: string | null;

  loadPlugins: () => Promise<void>;
  startPlugin: (name: string) => Promise<void>;
  stopPlugin: (name: string) => Promise<void>;
  sendCommand: (name: string, method: string, params?: unknown) => Promise<unknown>;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  loading: false,
  error: null,

  loadPlugins: async () => {
    set({ loading: true, error: null });
    try {
      const plugins = await ipc.listPlugins();
      set({ plugins, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  startPlugin: async (name: string) => {
    set({ error: null });
    try {
      await ipc.startPlugin(name);
      // Reload to get updated running state
      await get().loadPlugins();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  stopPlugin: async (name: string) => {
    set({ error: null });
    try {
      await ipc.stopPlugin(name);
      await get().loadPlugins();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  sendCommand: async (name: string, method: string, params?: unknown) => {
    set({ error: null });
    try {
      const result = await ipc.sendPluginCommand(name, method, params);
      return result;
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  },
}));
