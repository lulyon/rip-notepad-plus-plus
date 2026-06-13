import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePluginStore } from "../src/stores/pluginStore";

const mockPlugins = vi.hoisted(() => [
  {
    name: "hello-plugin",
    version: "1.0.0",
    description: "A test plugin",
    author: "Test",
    enabled: true,
    running: false,
  },
  {
    name: "sample-plugin",
    version: "2.0.0",
    description: "Another plugin",
    author: "Dev",
    enabled: true,
    running: true,
  },
]);

// Mock IPC for plugin store
vi.mock("../src/lib/ipc", () => ({
  ipc: {
    listPlugins: vi.fn().mockResolvedValue(mockPlugins),
    startPlugin: vi.fn().mockResolvedValue(undefined),
    stopPlugin: vi.fn().mockResolvedValue(undefined),
    sendPluginCommand: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

beforeEach(() => {
  usePluginStore.setState({
    plugins: [],
    loading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe("pluginStore", () => {
  describe("initial state", () => {
    it("starts with empty plugins, not loading, no error", () => {
      const s = usePluginStore.getState();
      expect(s.plugins).toEqual([]);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });
  });

  describe("loadPlugins", () => {
    it("loads plugins from IPC", async () => {
      await usePluginStore.getState().loadPlugins();

      const s = usePluginStore.getState();
      expect(s.plugins).toEqual(mockPlugins);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });

    it("sets loading state before and after", async () => {
      const promise = usePluginStore.getState().loadPlugins();
      expect(usePluginStore.getState().loading).toBe(true);

      await promise;
      expect(usePluginStore.getState().loading).toBe(false);
    });

    it("handles errors gracefully", async () => {
      const { ipc } = await import("../src/lib/ipc");
      (ipc.listPlugins as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("IPC failed"),
      );

      await usePluginStore.getState().loadPlugins();

      const s = usePluginStore.getState();
      expect(s.plugins).toEqual([]);
      expect(s.loading).toBe(false);
      expect(s.error).toBe("Error: IPC failed");
    });
  });

  describe("startPlugin", () => {
    it("starts a plugin and reloads the list", async () => {
      await usePluginStore.getState().startPlugin("hello-plugin");

      const { ipc } = await import("../src/lib/ipc");
      expect(ipc.startPlugin).toHaveBeenCalledWith("hello-plugin");
      expect(ipc.listPlugins).toHaveBeenCalled(); // reload
      expect(usePluginStore.getState().error).toBeNull();
    });

    it("handles start errors", async () => {
      const { ipc } = await import("../src/lib/ipc");
      (ipc.startPlugin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Start failed"),
      );

      await usePluginStore.getState().startPlugin("hello-plugin");

      expect(usePluginStore.getState().error).toBe("Error: Start failed");
    });
  });

  describe("stopPlugin", () => {
    it("stops a plugin and reloads the list", async () => {
      await usePluginStore.getState().stopPlugin("hello-plugin");

      const { ipc } = await import("../src/lib/ipc");
      expect(ipc.stopPlugin).toHaveBeenCalledWith("hello-plugin");
      expect(ipc.listPlugins).toHaveBeenCalled(); // reload
      expect(usePluginStore.getState().error).toBeNull();
    });

    it("handles stop errors", async () => {
      const { ipc } = await import("../src/lib/ipc");
      (ipc.stopPlugin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Stop failed"),
      );

      await usePluginStore.getState().stopPlugin("hello-plugin");

      expect(usePluginStore.getState().error).toBe("Error: Stop failed");
    });
  });

  describe("sendCommand", () => {
    it("sends a command to a plugin and returns the result", async () => {
      const result = await usePluginStore
        .getState()
        .sendCommand("hello-plugin", "ping", {});

      const { ipc } = await import("../src/lib/ipc");
      expect(ipc.sendPluginCommand).toHaveBeenCalledWith(
        "hello-plugin",
        "ping",
        {},
      );
      expect(result).toEqual({ ok: true });
    });

    it("sends command without params", async () => {
      await usePluginStore
        .getState()
        .sendCommand("hello-plugin", "getStatus");

      const { ipc } = await import("../src/lib/ipc");
      expect(ipc.sendPluginCommand).toHaveBeenCalledWith(
        "hello-plugin",
        "getStatus",
        undefined,
      );
    });

    it("handles command errors and re-throws", async () => {
      const { ipc } = await import("../src/lib/ipc");
      (ipc.sendPluginCommand as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Command failed"),
      );

      await expect(
        usePluginStore.getState().sendCommand("hello-plugin", "ping"),
      ).rejects.toThrow("Command failed");

      expect(usePluginStore.getState().error).toBe("Error: Command failed");
    });
  });
});
