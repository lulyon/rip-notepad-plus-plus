import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEditorRefStore } from "../../stores/editorRefStore";
import { ipc } from "../../lib/ipc";
import "./HashDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
  initialAlgorithm?: string;
}

type Algorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-512";

const ALGORITHMS: Algorithm[] = ["MD5", "SHA-1", "SHA-256", "SHA-512"];

async function computeHash(
  text: string,
  algorithm: Algorithm,
): Promise<string> {
  // MD5: implement manually via Web Crypto's SubtleCrypto
  if (algorithm === "MD5") {
    // Use Web Crypto SHA-1 as base, then apply MD5 specific padding
    // Actually, Web Crypto doesn't support MD5 directly.
    // We'll use a pure JS MD5 implementation.
    return md5(text);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Pure JS MD5 implementation
function md5(input: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xffffffff;
  }

  // Convert string to UTF-8 bytes
  const utf8Bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i);
    if (c < 0x80) {
      utf8Bytes.push(c);
    } else if (c < 0x800) {
      utf8Bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      utf8Bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      i++;
      c = 0x10000 + (((c & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
      utf8Bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }

  const n = utf8Bytes.length;
  let bitLen = n * 8;
  // Pad with 0x80, zeros, then 64-bit length
  const padded = [...utf8Bytes, 0x80];
  while ((padded.length * 8) % 512 !== 448) {
    padded.push(0);
  }
  // Append length as 64-bit (little-endian)
  for (let i = 0; i < 8; i++) {
    padded.push((bitLen >>> (i * 8)) & 0xff);
    if (i === 3) bitLen = 0; // upper 32 bits
  }

  // Process 512-bit blocks
  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let offset = 0; offset < padded.length; offset += 64) {
    const block = padded.slice(offset, offset + 64);
    const k: number[] = [];
    for (let i = 0; i < 16; i++) {
      k[i] = block[i * 4] | (block[i * 4 + 1] << 8) | (block[i * 4 + 2] << 16) | (block[i * 4 + 3] << 24);
    }
    const s = [...state];
    md5cycle(s, k);
    state[0] = add32(state[0], s[0]);
    state[1] = add32(state[1], s[1]);
    state[2] = add32(state[2], s[2]);
    state[3] = add32(state[3], s[3]);
  }

  // Convert to hex
  const hex = state.map((v) =>
    (v & 0xff).toString(16).padStart(2, "0") +
    ((v >>> 8) & 0xff).toString(16).padStart(2, "0") +
    ((v >>> 16) & 0xff).toString(16).padStart(2, "0") +
    ((v >>> 24) & 0xff).toString(16).padStart(2, "0"),
  ).join("");

  return hex;
}

export function HashDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState<Record<Algorithm, string>>({
    MD5: "",
    "SHA-1": "",
    "SHA-256": "",
    "SHA-512": "",
  });
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleCompute = useCallback(async () => {
    if (!inputText) return;
    setComputing(true);
    try {
      const [md5Hash, sha1Hash, sha256Hash, sha512Hash] = await Promise.all([
        computeHash(inputText, "MD5"),
        computeHash(inputText, "SHA-1"),
        computeHash(inputText, "SHA-256"),
        computeHash(inputText, "SHA-512"),
      ]);
      setResults({
        MD5: md5Hash,
        "SHA-1": sha1Hash,
        "SHA-256": sha256Hash,
        "SHA-512": sha512Hash,
      });
    } catch (err) {
      console.error("Hash computation failed:", err);
    } finally {
      setComputing(false);
    }
  }, [inputText]);

  const handleFromFile = useCallback(async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const result = await openDialog({ title: "Select File for Hashing", multiple: false });
      if (result && typeof result === "string") {
        const fileData = await ipc.readFile(result);
        setInputText(fileData.content);
      }
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, []);

  const handleFromSelection = useCallback(() => {
    const editor = useEditorRefStore.getState().editorRef;
    if (editor) {
      const selection = editor.getSelection();
      if (selection) {
        const text = editor.getModel()?.getValueInRange(selection) || "";
        setInputText(text);
      }
    }
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog hash-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("dialog.hash")}</h2>

        <textarea
          className="hash-textarea"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("dialog.hashPlaceholder")}
        />

        <div className="hash-actions">
          <button className="btn" onClick={handleFromFile}>
            {t("dialog.hashFromFile")}
          </button>
          <button className="btn" onClick={handleFromSelection}>
            {t("dialog.hashFromSelection")}
          </button>
        </div>

        <div className="hash-compute-row">
          <button
            className="btn btn-primary"
            onClick={handleCompute}
            disabled={!inputText || computing}
          >
            {computing ? t("dialog.computing") : t("dialog.compute")}
          </button>
        </div>

        <div className="hash-results">
          {ALGORITHMS.map((algo) => (
            <div className="hash-result-row" key={algo}>
              <span className="hash-algorithm">{algo}</span>
              <span className="hash-value">
                {results[algo] || " "}
              </span>
              {results[algo] && (
                <button
                  className="hash-copy-btn"
                  onClick={() => handleCopy(results[algo])}
                  title={t("dialog.copyToClipboard")}
                >
                  {t("dialog.copy")}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="dialog-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onClose}>
            {t("dialog.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
