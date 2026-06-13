import { describe, it, expect, beforeEach, vi } from "vitest";
import { useEncodingStore } from "../src/stores/encodingStore";

// Mock IPC for encoding store
vi.mock("../src/lib/ipc", () => ({
  ipc: {
    listEncodings: vi.fn().mockResolvedValue([
      { name: "UTF-8", label: "UTF-8", group: "Unicode", has_bom: false },
      { name: "UTF-16", label: "UTF-16", group: "Unicode", has_bom: true },
      { name: "ASCII", label: "ASCII", group: "Western", has_bom: false },
      { name: "ISO-8859-1", label: "ISO-8859-1", group: "Western", has_bom: false },
    ]),
    encodeWithEncoding: vi.fn().mockResolvedValue(new Uint8Array([104, 101, 108, 108, 111])),
    decodeWithEncoding: vi.fn().mockResolvedValue("hello"),
  },
}));

beforeEach(() => {
  useEncodingStore.setState({
    supportedEncodings: [],
    encodingGroups: {},
    encodingDialogOpen: false,
    convertTargetEncoding: null,
  });
  vi.clearAllMocks();
});

describe("encodingStore", () => {
  describe("initial state", () => {
    it("starts with empty encodings and closed dialog", () => {
      const s = useEncodingStore.getState();
      expect(s.supportedEncodings).toEqual([]);
      expect(s.encodingGroups).toEqual({});
      expect(s.encodingDialogOpen).toBe(false);
      expect(s.convertTargetEncoding).toBeNull();
    });
  });

  describe("loadEncodings", () => {
    it("loads encodings from IPC and groups them", async () => {
      await useEncodingStore.getState().loadEncodings();

      const s = useEncodingStore.getState();
      expect(s.supportedEncodings).toHaveLength(4);
      expect(Object.keys(s.encodingGroups)).toEqual(["Unicode", "Western"]);
      expect(s.encodingGroups["Unicode"]).toHaveLength(2);
      expect(s.encodingGroups["Western"]).toHaveLength(2);
    });

    it("calls ipc.listEncodings", async () => {
      const { ipc } = await import("../src/lib/ipc");
      await useEncodingStore.getState().loadEncodings();
      expect(ipc.listEncodings).toHaveBeenCalledOnce();
    });
  });

  describe("openEncodingDialog", () => {
    it("opens the encoding dialog", () => {
      useEncodingStore.getState().openEncodingDialog();
      expect(useEncodingStore.getState().encodingDialogOpen).toBe(true);
    });
  });

  describe("closeEncodingDialog", () => {
    it("closes the encoding dialog", () => {
      useEncodingStore.setState({ encodingDialogOpen: true });
      useEncodingStore.getState().closeEncodingDialog();
      expect(useEncodingStore.getState().encodingDialogOpen).toBe(false);
    });
  });

  describe("setConvertTargetEncoding", () => {
    it("sets the target encoding", () => {
      useEncodingStore.getState().setConvertTargetEncoding("UTF-16");
      expect(useEncodingStore.getState().convertTargetEncoding).toBe("UTF-16");
    });

    it("clears the target encoding with null", () => {
      useEncodingStore.getState().setConvertTargetEncoding("UTF-16");
      useEncodingStore.getState().setConvertTargetEncoding(null);
      expect(useEncodingStore.getState().convertTargetEncoding).toBeNull();
    });
  });

  describe("convertTabEncoding", () => {
    it("converts content from one encoding to another via IPC", async () => {
      const { ipc } = await import("../src/lib/ipc");

      const result = await useEncodingStore
        .getState()
        .convertTabEncoding("hello", "UTF-8", "UTF-16");

      expect(ipc.encodeWithEncoding).toHaveBeenCalledWith("hello", "UTF-8");
      expect(ipc.decodeWithEncoding).toHaveBeenCalledWith(
        new Uint8Array([104, 101, 108, 108, 111]),
        "UTF-16",
      );
      expect(result).toBe("hello");
    });
  });
});
