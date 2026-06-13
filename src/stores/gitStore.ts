import { create } from "zustand";
import type { GitStatus } from "../types/ipc";
import { ipc } from "../lib/ipc";

interface GitState {
  status: GitStatus | null;
  loading: boolean;
  error: string | null;

  refreshStatus: (repoPath: string) => Promise<void>;
  clearStatus: () => void;
}

export const useGitStore = create<GitState>((set) => ({
  status: null,
  loading: false,
  error: null,

  refreshStatus: async (repoPath: string) => {
    set({ loading: true, error: null });
    try {
      const status = await ipc.gitStatus(repoPath);
      set({ status, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false, status: null });
    }
  },

  clearStatus: () => {
    set({ status: null, loading: false, error: null });
  },
}));
