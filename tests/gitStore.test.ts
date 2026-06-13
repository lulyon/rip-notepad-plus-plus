import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGitStore } from "../src/stores/gitStore";

const mockGitStatus = vi.hoisted(() => ({
  branch: "feature",
  changed: [
    { path: "src/main.ts", status: "M", display_path: "src/main.ts" },
    { path: "src/lib/util.ts", status: "A", display_path: "src/lib/util.ts" },
  ],
  ahead: 2,
  behind: 0,
}));

// Mock IPC for git store
vi.mock("../src/lib/ipc", () => ({
  ipc: {
    gitStatus: vi.fn().mockResolvedValue(mockGitStatus),
  },
}));

beforeEach(() => {
  useGitStore.setState({
    status: null,
    loading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe("gitStore", () => {
  describe("initial state", () => {
    it("starts with null status, not loading, no error", () => {
      const s = useGitStore.getState();
      expect(s.status).toBeNull();
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });
  });

  describe("refreshStatus", () => {
    it("fetches git status from IPC", async () => {
      await useGitStore.getState().refreshStatus("/repo/path");

      const s = useGitStore.getState();
      expect(s.status).toEqual(mockGitStatus);
      expect(s.status?.branch).toBe("feature");
      expect(s.status?.changed).toHaveLength(2);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });

    it("calls ipc.gitStatus with the correct path", async () => {
      const { ipc } = await import("../src/lib/ipc");

      await useGitStore.getState().refreshStatus("/my/project");

      expect(ipc.gitStatus).toHaveBeenCalledWith("/my/project");
    });

    it("sets loading state during fetch", async () => {
      const promise = useGitStore.getState().refreshStatus("/repo");
      expect(useGitStore.getState().loading).toBe(true);

      await promise;
      expect(useGitStore.getState().loading).toBe(false);
    });

    it("handles errors and sets error state", async () => {
      const { ipc } = await import("../src/lib/ipc");
      (ipc.gitStatus as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Git error"),
      );

      await useGitStore.getState().refreshStatus("/repo");

      const s = useGitStore.getState();
      expect(s.error).toBe("Error: Git error");
      expect(s.status).toBeNull();
      expect(s.loading).toBe(false);
    });

    it("handles string errors", async () => {
      const { ipc } = await import("../src/lib/ipc");
      (ipc.gitStatus as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        "Not a git repository",
      );

      await useGitStore.getState().refreshStatus("/repo");

      expect(useGitStore.getState().error).toBe("Not a git repository");
    });
  });

  describe("clearStatus", () => {
    it("resets status, loading, and error to defaults", () => {
      useGitStore.setState({
        status: mockGitStatus,
        loading: true,
        error: "some error",
      });

      useGitStore.getState().clearStatus();

      const s = useGitStore.getState();
      expect(s.status).toBeNull();
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });
  });
});
