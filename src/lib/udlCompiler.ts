import type { UdlConfig } from "../stores/udlStore";
import type { languages } from "monaco-editor";

type MonacoLanguages = typeof languages;

/**
 * Global Monaco instance reference, set by Editor.tsx on mount.
 * Used to register/re-register UDL languages dynamically.
 */
let _monaco: { languages: MonacoLanguages } | null = null;

/**
 * Store a reference to the global Monaco object so UDL languages
 * can be registered at any time (not just during editor mount).
 */
export function setMonaco(monaco: { languages: MonacoLanguages }): void {
  _monaco = monaco;
}

/** Get the global Monaco reference, or null if not yet set. */
export function getMonaco(): { languages: MonacoLanguages } | null {
  return _monaco;
}

/**
 * Load all UDLs from the store and register them with Monaco.
 * Safe to call multiple times — already-registered languages are skipped
 * (Monarch provider is updated every time to pick up edits).
 */
export function registerAllUdls(udls: UdlConfig[]): void {
  if (!_monaco) return;
  for (const udl of udls) {
    try {
      const compiled = compileUdl(udl);
      const exists = _monaco.languages
        .getLanguages()
        .some((l) => l.id === compiled.id);
      if (!exists) {
        _monaco.languages.register({ id: compiled.id });
      }
      _monaco.languages.setMonarchTokensProvider(
        compiled.id,
        compiled.language as languages.IMonarchLanguage,
      );
    } catch (err) {
      console.error(`Failed to register UDL '${udl.name}':`, err);
    }
  }
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile a UdlConfig into a Monarch language tokenizer definition
 * that can be registered with Monaco Editor.
 */
export function compileUdl(
  config: UdlConfig,
): { id: string; language: languages.IMonarchLanguage } {
  const langId = `udl.${config.id}`;

  // ── Keyword matching ──
  const keywordRules: [RegExp, string][] = [];

  for (let i = 0; i < config.keywords.length; i++) {
    const group = config.keywords[i];
    if (!group || !group.trim()) continue;
    const words = group
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    if (words.length === 0) continue;
    const tokenType = `keyword${i + 1}`;

    const patterns = words.map((w) => {
      if (config.caseSensitive) {
        return escapeRegex(w);
      } else {
        return caseInsensitivePattern(escapeRegex(w));
      }
    });

    const combinedPattern = patterns.join("|");
    const regex = new RegExp(`\\b(?:${combinedPattern})\\b`);
    keywordRules.push([regex, tokenType]);
  }

  // ── String rules ──
  const extraStates: Record<string, languages.IMonarchLanguageRule[]> = {};
  const stringRules: [RegExp, string, string][] = [];

  if (config.stringChars) {
    const chars = [...new Set(config.stringChars.split(""))];
    for (const ch of chars) {
      const escapedCh = escapeRegex(ch);
      const stateName = `string_${ch.charCodeAt(0)}`;
      extraStates[stateName] = [
        [new RegExp(`[^\\\\${escapedCh}]+`), ""],
        [/\\./, ""],
        [new RegExp(escapedCh), { token: "string", next: "@pop" }],
      ];
      stringRules.push([new RegExp(escapedCh), "", stateName]);
    }
  }

  // ── Delimiter / bracket matching ──
  const delimiterChars: string[] = [];
  if (config.delimiters) {
    const pairs = config.delimiters.split(/\s+/).filter((p) => p.length >= 2);
    for (const pair of pairs) {
      delimiterChars.push(pair[0], pair[pair.length - 1]);
    }
  }
  const delimiterPattern =
    delimiterChars.length > 0
      ? `[${delimiterChars.map((c) => escapeRegex(c)).join("")}]`
      : null;

  // ── Operator characters ──
  const opChars = config.operators
    ? config.operators.replace(/\s/g, "")
    : "";
  const operatorPattern = opChars
    ? `[${escapeRegex(opChars)}]`
    : null;

  // ── Build the root tokenizer array ──
  const root: languages.IMonarchLanguageRule[] = [];

  // Line comment (match to end of line)
  if (config.lineComment && config.lineComment.trim()) {
    const escapedLineComment = escapeRegex(config.lineComment.trim());
    root.push([new RegExp(`${escapedLineComment}.*$`), "comment"]);
  }

  // Block comment
  if (
    config.blockCommentStart &&
    config.blockCommentEnd &&
    config.blockCommentStart.trim() &&
    config.blockCommentEnd.trim()
  ) {
    const escapedStart = escapeRegex(config.blockCommentStart.trim());
    const escapedEnd = escapeRegex(config.blockCommentEnd.trim());

    extraStates["blockComment"] = [
      [new RegExp(escapedEnd), { token: "comment", next: "@pop" }],
      [/./, "comment"],
    ];

    root.push([
      new RegExp(escapedStart),
      { token: "comment", next: "@blockComment" },
    ]);
  }

  // Strings
  for (const rule of stringRules) {
    root.push(rule);
  }

  // Keywords (after strings so quoted strings aren't keyword-matched)
  for (const rule of keywordRules) {
    root.push(rule);
  }

  // Operators
  if (operatorPattern) {
    root.push([new RegExp(operatorPattern), "operator"]);
  }

  // Delimiters
  if (delimiterPattern) {
    root.push([new RegExp(delimiterPattern), "delimiter"]);
  }

  // Numbers
  root.push([/\d+/, "number"]);

  // Whitespace
  root.push([/\s+/, "white"]);

  // Catch-all for identifiers
  root.push([/[a-zA-Z_$][a-zA-Z0-9_$]*/, "identifier"]);

  // Catch-all for everything else (prevent infinite loop)
  root.push([/.+?(?=\s|$)/, "identifier"]);

  return {
    id: langId,
    language: {
      defaultToken: "",
      tokenizer: {
        root,
        ...extraStates,
      },
    },
  };
}

/**
 * Build a case-insensitive regex pattern for a literal word.
 * Each alphabetic character is replaced with a character class `[Aa]`.
 */
function caseInsensitivePattern(escaped: string): string {
  let result = "";
  for (const ch of escaped) {
    const upper = ch.toUpperCase();
    const lower = ch.toLowerCase();
    if (upper !== lower) {
      result += `[${escapeRegex(upper)}${escapeRegex(lower)}]`;
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Find the Monaco language ID for a file extension, checking UDL first.
 */
export function getLanguageForExtension(
  ext: string,
  udls: { id: string; extensions: string[] }[],
): string | null {
  const lower = ext.toLowerCase();
  for (const udl of udls) {
    if (udl.extensions.some((e) => e.toLowerCase() === lower)) {
      return `udl.${udl.id}`;
    }
  }
  return null;
}
