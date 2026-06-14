/**
 * TextMate .tmLanguage.json → Monarch tokenizer converter.
 *
 * Parses the JSON variant of TextMate grammars (as used by VS Code/Sublime)
 * and converts them to Monaco's Monarch format.
 *
 * Supports:
 * - match rules (including captures)
 * - begin/end rules with nested patterns
 * - repository references via $self / #refName
 * - scope name → Monarch token mapping
 * - include: "$base" → minimal keyword extraction
 */

// ── TextMate JSON types ──

interface TmCapture {
  name?: string;
  patterns?: TmRule[];
}

interface TmRule {
  name?: string;
  match?: string;
  begin?: string;
  end?: string;
  patterns?: TmRule[];
  captures?: Record<string, TmCapture>;
  beginCaptures?: Record<string, TmCapture>;
  endCaptures?: Record<string, TmCapture>;
  include?: string;
  comment?: string;
}

interface TmPattern extends TmRule {
  contentName?: string;
  applyEndPatternLast?: number;
}

interface TmRepo {
  $self?: TmRule;
  $base?: TmRule;
  [key: string]: TmRule | undefined;
}

export interface TmLanguage {
  name: string;
  scopeName: string;
  fileTypes?: string[];
  foldingStartMarker?: string;
  foldingStopMarker?: string;
  patterns: TmRule[];
  repository?: TmRepo;
}

// ── Monarch types (subset) ──

interface MonarchRule {
  regex?: RegExp | string;
  token?: string | string[] | MonarchTokenAction;
  action?: MonarchTokenAction;
  next?: string;
  cases?: Record<string, MonarchRule[]>;
  include?: string;
}

interface MonarchTokenAction {
  token?: string;
  next?: string;
}

interface MonarchLanguage {
  defaultToken: string;
  tokenizer: Record<string, MonarchRule[]>;
}

// ── Scope → Token mapping ──

const SCOPE_MAP: Record<string, string> = {
  "comment.line": "comment",
  "comment.block": "comment",
  "comment": "comment",
  "string.quoted.single": "string",
  "string.quoted.double": "string",
  "string.quoted.triple": "string",
  "string.quoted": "string",
  "string.regexp": "string.regexp",
  "string": "string",
  "constant.numeric": "number",
  "constant.language": "keyword",
  "constant.character.escape": "string.escape",
  "constant": "identifier",
  "keyword.control": "keyword",
  "keyword.operator": "operator",
  "keyword.other": "keyword",
  "keyword": "keyword",
  "storage.type": "type",
  "storage.modifier": "keyword",
  "storage": "keyword",
  "entity.name.function": "type.identifier",
  "entity.name.type": "type",
  "entity.name.class": "type",
  "entity.name.tag": "tag",
  "entity.name": "identifier",
  "entity.other.attribute-name": "attribute.name",
  "entity.other": "identifier",
  "support.function": "predefined",
  "support.class": "type",
  "support.type": "type",
  "support.constant": "keyword",
  "support.variable": "variable",
  "support": "identifier",
  "variable.language": "keyword",
  "variable.parameter": "parameter",
  "variable.other": "variable",
  "variable": "variable",
  "markup.heading": "keyword",
  "markup.bold": "keyword",
  "markup.italic": "keyword",
  "markup.underline": "keyword",
  "markup.raw": "string",
  "markup": "identifier",
  "punctuation": "delimiter",
  "invalid": "invalid",
  "meta": "identifier",
};

function scopeToToken(scope: string): string {
  // Try exact match first, then strip last segment, repeat
  let s = scope;
  while (s) {
    if (SCOPE_MAP[s]) return SCOPE_MAP[s];
    const dot = s.lastIndexOf(".");
    if (dot < 0) break;
    s = s.slice(0, dot);
  }
  return "identifier";
}

// ── Regex converter: TextMate → JavaScript ──

function tmRegexToJs(tm: string): string {
  // TextMate uses Oniguruma regex. Most common patterns work in JS.
  // Handle \x{HHHH} → \uHHHH
  let js = tm.replace(/\\x\{([0-9A-Fa-f]+)\}/g, (_, h) =>
    String.fromCodePoint(parseInt(h, 16))
  );
  // Handle \p{...} (Unicode properties) — keep as-is (ES2018+)
  // Handle look-behind — keep as-is (ES2018+)
  // Remove (?i) / (?m) inline flags (not supported in JS) — we ignore them
  js = js.replace(/\(\?[imsx]-\)?\)/g, "");
  js = js.replace(/\(\?[imsx]-\)?/g, "(?:");
  return js;
}

function tmRegexToRegExp(tm: string): RegExp | null {
  try {
    const js = tmRegexToJs(tm);
    return new RegExp(js, "");
  } catch {
    console.warn(`Failed to parse TextMate regex: ${tm}`);
    return null;
  }
}

// ── Pattern converter ──

function convertMatchRule(rule: TmRule): MonarchRule | null {
  if (!rule.match) return null;
  const regex = tmRegexToRegExp(rule.match);
  if (!regex) return null;

  if (rule.captures) {
    // Generate token array with capture groups
    const maxCapture = Math.max(
      ...Object.keys(rule.captures).map(Number).filter((n) => !isNaN(n))
    );
    const tokens: string[] = [];
    for (let i = 0; i <= maxCapture; i++) {
      const cap = rule.captures[String(i)];
      tokens.push(cap?.name ? scopeToToken(cap.name) : "");
    }
    return { regex, token: tokens };
  }

  const token = rule.name ? scopeToToken(rule.name) : undefined;
  return token ? { regex, token } : { regex, token: "identifier" };
}

function convertBeginEndRule(
  rule: TmPattern,
  repo: TmRepo | undefined,
  stateName: string
): { monarchRule: MonarchRule; subStates: Record<string, MonarchRule[]> } | null {
  if (!rule.begin || !rule.end) return null;

  const beginRegex = tmRegexToRegExp(rule.begin);
  const endRegex = tmRegexToRegExp(rule.end);
  if (!beginRegex || !endRegex) return null;

  const subStates: Record<string, MonarchRule[]> = {};
  nestedRuleCounter = 0;

  // Create inner state for body
  const bodyState = `${stateName}_body`;
  const bodyRules: MonarchRule[] = [];

  // Convert nested patterns
  if (rule.patterns) {
    for (const p of rule.patterns) {
      const converted = convertRule(p, repo, `${stateName}_n${nestedRuleCounter++}`);
      if (converted) {
        if (Array.isArray(converted)) {
          bodyRules.push(...converted);
        } else {
          bodyRules.push(converted.monarchRule);
          Object.assign(subStates, converted.subStates);
        }
      }
    }
  }

  // Add end rule (pop back)
  bodyRules.push({ regex: endRegex, token: rule.endCaptures ? scopeToToken(Object.values(rule.endCaptures)[0]?.name || "") : "", next: "@pop" });

  subStates[bodyState] = bodyRules;

  const beginToken = rule.beginCaptures
    ? scopeToToken(Object.values(rule.beginCaptures)[0]?.name || "")
    : rule.name
      ? scopeToToken(rule.name)
      : "identifier";

  return {
    monarchRule: { regex: beginRegex, token: beginToken, next: bodyState },
    subStates,
  };
}

let nestedRuleCounter = 0;

// ── Main converter ──

function convertInclude(name: string, _repo: TmRepo | undefined): MonarchRule {
  // $self → include root
  if (name === "$self") return { include: "@root" };
  // #refName → include @refName
  if (name.startsWith("#")) return { include: `@${name.slice(1)}` };
  // $base — try to merge base patterns into root (skip for now)
  return { regex: /(?:)/, token: "" }; // no-op
}

function convertRule(
  rule: TmRule,
  repo: TmRepo | undefined,
  stateName: string
): MonarchRule[] | { monarchRule: MonarchRule; subStates: Record<string, MonarchRule[]> } | null {
  if (rule.include) {
    return [convertInclude(rule.include, repo)];
  }

  if (rule.match) {
    const mr = convertMatchRule(rule);
    return mr ? [mr] : null;
  }

  if (rule.begin && rule.end) {
    return convertBeginEndRule(rule as TmPattern, repo, stateName);
  }

  return null;
}

function flattenRules(
  rules: (MonarchRule[] | { monarchRule: MonarchRule; subStates: Record<string, MonarchRule[]> } | null)[],
  subStates: Record<string, MonarchRule[]>
): MonarchRule[] {
  const result: MonarchRule[] = [];
  for (const r of rules) {
    if (!r) continue;
    if (Array.isArray(r)) {
      result.push(...r);
    } else {
      result.push(r.monarchRule);
      Object.assign(subStates, r.subStates);
    }
  }
  return result;
}

// ── Public API ──

/**
 * Import a TextMate .tmLanguage.json and return a Monarch-compatible
 * language definition.
 */
export function importTmLanguage(tmLanguage: TmLanguage): {
  id: string;
  language: MonarchLanguage;
  name: string;
  fileTypes: string[];
} {
  nestedRuleCounter = 0;
  const subStates: Record<string, MonarchRule[]> = {};

  // Convert repository entries into named states
  const repo = tmLanguage.repository;
  if (repo) {
    for (const [key, entry] of Object.entries(repo)) {
      if (!entry || key.startsWith("$")) continue;
      if (entry.match) {
        const mr = convertMatchRule(entry);
        if (mr) subStates[key] = [mr];
      } else if (entry.begin && entry.end) {
        const converted = convertBeginEndRule(entry as TmPattern, repo, key);
        if (converted) {
          subStates[key] = [converted.monarchRule];
          Object.assign(subStates, converted.subStates);
        }
      } else if (entry.patterns) {
        const rules = flattenRules(
          entry.patterns.map((p) => convertRule(p, repo, `repo_${key}`)),
          subStates
        );
        if (rules.length > 0) subStates[key] = rules;
      }
    }
  }

  // Convert top-level patterns
  const rootRules = flattenRules(
    tmLanguage.patterns.map((p, i) => convertRule(p, repo, `root_p${i}`)),
    subStates
  );

  // Add whitespace rule at start
  rootRules.unshift({ regex: /\s+/, token: "" });

  const id = `tm.${sanitizeId(tmLanguage.scopeName || tmLanguage.name)}`;

  return {
    id,
    language: {
      defaultToken: "",
      tokenizer: { root: rootRules, ...subStates },
    },
    name: tmLanguage.name,
    fileTypes: tmLanguage.fileTypes || [],
  };
}

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

/**
 * Validate if a JSON object looks like a valid TextMate grammar.
 */
export function isTmLanguage(json: unknown): json is TmLanguage {
  if (!json || typeof json !== "object") return false;
  const obj = json as Record<string, unknown>;
  return (
    typeof obj.name === "string" &&
    Array.isArray(obj.patterns) &&
    typeof obj.scopeName === "string"
  );
}
