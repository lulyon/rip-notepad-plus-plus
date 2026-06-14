import MarkdownIt from "markdown-it";

/**
 * Generic preview engine with pluggable renderers.
 * Each renderer maps a file pattern to a render function.
 */

export interface PreviewRenderer {
  /** Unique id, e.g. "markdown", "html" */
  id: string;
  /** Display name for the UI */
  name: string;
  /** File extensions this renderer handles (without dot) */
  extensions: string[];
  /** Languages this renderer handles (Monaco language ids) */
  languages: string[];
  /** Render content to HTML string */
  render: (opts: { content: string; filePath: string | null; assetUrl: string | null }) => string;
  /** Whether to render in a sandboxed iframe (true for HTML, false for Markdown) */
  useIframe: boolean;
}

const renderers: Map<string, PreviewRenderer> = new Map();

/** Register a preview renderer */
export function registerPreviewRenderer(renderer: PreviewRenderer) {
  renderers.set(renderer.id, renderer);
}

/** Find the matching renderer for a file */
export function findRenderer(
  fileName: string,
  language: string,
): PreviewRenderer | null {
  for (const r of renderers.values()) {
    if (r.languages.includes(language)) return r;
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext && r.extensions.includes(ext)) return r;
  }
  return null;
}

/** Check if a file has a preview renderer available */
export function hasPreview(fileName: string, language: string): boolean {
  return findRenderer(fileName, language) !== null;
}

/** Get all registered renderers */
export function getPreviewRenderers(): PreviewRenderer[] {
  return [...renderers.values()];
}

// ── Built-in renderers ──

/** Markdown renderer — uses markdown-it */
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str: string, lang: string) {
    const escaped = str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="hljs"><code class="language-${lang || "plaintext"}">${escaped}</code></pre>`;
  },
});

function renderMarkdown({ content }: { content: string }): string {
  let lineIndex = 0;
  const html = md.render(content);
  // Inject data-line attributes for scroll sync
  return html.replace(/<(h[1-6]|p|li|blockquote|pre|table|hr)([\s>])/gi, (match) => {
    lineIndex++;
    return match.replace(/^<(\w+)/, `<$1 data-line="${lineIndex}"`);
  });
}

registerPreviewRenderer({
  id: "markdown",
  name: "Markdown",
  extensions: ["md", "mdx", "markdown", "mdown"],
  languages: ["markdown"],
  render: renderMarkdown,
  useIframe: false,
});

/** HTML renderer — renders raw HTML in a sandboxed iframe */
function renderHtml({ content }: { content: string }): string {
  return content;
}

registerPreviewRenderer({
  id: "html",
  name: "HTML",
  extensions: ["html", "htm"],
  languages: ["html"],
  render: renderHtml,
  useIframe: true,
});

/** Image renderer — renders image files via Tauri convertFileSrc */
function renderImage({ assetUrl }: { assetUrl: string | null }): string {
  if (!assetUrl) return "<p style='color:#999;text-align:center;padding:40px'>Save the file first to preview</p>";

  return `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  body { background: #1e1e1e; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: -apple-system, sans-serif; }
  img { max-width: 95%; max-height: 95vh; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
  .error { color: #999; text-align: center; padding: 40px; }
</style></head><body>
  <img src="${assetUrl}" alt="Preview"
    onerror="this.style.display='none';document.getElementById('err').style.display='block'"
  />
  <p id="err" class="error" style="display:none">Failed to load image</p>
</body></html>`;
}

registerPreviewRenderer({
  id: "image",
  name: "Image",
  extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "tiff", "avif"],
  languages: [],
  render: renderImage,
  useIframe: true,
});

// ── SVG source renderer (renders raw SVG markup) ──
function renderSvgSource({ content }: { content: string }): string {
  return content;
}
registerPreviewRenderer({
  id: "svg-source",
  name: "SVG",
  extensions: ["svg"],
  languages: ["xml", "svg"],
  render: renderSvgSource,
  useIframe: true,
});

// ── CSV/TSV table renderer ──
function parseCsv(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const cols: string[] = [];
    let col = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"') { if (line[i + 1] === '"') { col += '"'; i++; } else inQuote = false; }
        else col += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === delimiter) { cols.push(col.trim()); col = ""; }
        else col += ch;
      }
    }
    cols.push(col.trim());
    rows.push(cols);
  }
  return rows;
}
function renderCsv({ content }: { content: string }): string {
  const delim = content.includes("\t") ? "\t" : ",";
  const rows = parseCsv(content, delim);
  if (rows.length === 0) return "<p>Empty CSV</p>";
  const headers = rows[0];
  const body = rows.slice(1);
  const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#ccc;font:13px -apple-system,sans-serif;padding:16px}
    table{border-collapse:collapse;width:100%}th{background:#333;position:sticky;top:0;z-index:1}
    th,td{border:1px solid #444;padding:6px 10px;text-align:left;white-space:nowrap;max-width:400px;overflow:hidden;text-overflow:ellipsis}
    tr:hover td{background:#2a2a2a}tbody tr:nth-child(even) td{background:#252525}
  </style></head><body><table>${thead}${tbody}</table></body></html>`;
}
registerPreviewRenderer({
  id: "csv",
  name: "CSV Table",
  extensions: ["csv", "tsv"],
  languages: [],
  render: renderCsv,
  useIframe: true,
});

// ── JSON tree renderer ──
function renderJson({ content }: { content: string }): string {
  try {
    JSON.parse(content); // validate
    const encoded = encodeURIComponent(content);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0}body{background:#1e1e1e;color:#ccc;font:13px/1.6 'Cascadia Code',monospace;padding:16px;white-space:pre-wrap;word-break:break-all}
      .key{color:#9cdcfe}.string{color:#ce9178}.number{color:#b5cea8}.boolean{color:#569cd6}.null{color:#808080}
      .bracket{color:#da70d6}
    </style></head><body><pre id="out"></pre><script>
    try {
      var obj = JSON.parse(decodeURIComponent('${encoded}'));
      document.getElementById('out').innerHTML = syntaxHighlight(JSON.stringify(obj,null,2));
    } catch(e) { document.getElementById('out').textContent = 'Invalid JSON'; }
    function syntaxHighlight(json) {
      return json.replace(/(&|<|>)/g,'') .replace(/("(\\\\u[a-fA-F0-9]{4}|\\\\[^u]|[^"\\\\])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)/g,
      function(m){var cls='number';if(/^"/.test(m)){cls=/:$/.test(m)?'key':'string'}else if(/true|false/.test(m)){cls='boolean'}else if(/null/.test(m)){cls='null'}
      return'<span class='+cls+'>'+m+'</span>'});
    }
    </script></body></html>`;
  } catch { return "<p style='color:#999;padding:40px;text-align:center'>Invalid JSON</p>"; }
}
registerPreviewRenderer({
  id: "json",
  name: "JSON Tree",
  extensions: ["json", "jsonc", "json5"],
  languages: ["json", "jsonc"],
  render: renderJson,
  useIframe: true,
});

// ── PDF embed ──
function renderPdf({ assetUrl }: { assetUrl: string | null }): string {
  if (!assetUrl) return "<p style='color:#999;padding:40px;text-align:center'>Save the file first</p>";
  return `<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0}body{background:#525659}embed{width:100%;height:100vh;border:none}
  </style></head><body><embed src="${assetUrl}" type="application/pdf"></body></html>`;
}
registerPreviewRenderer({
  id: "pdf",
  name: "PDF",
  extensions: ["pdf"],
  languages: [],
  render: renderPdf,
  useIframe: true,
});

// ── XML formatted ──
function renderXml({ content }: { content: string }): string {
  const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const colored = escaped
    .replace(/(&lt;\/?)([\w:.]+)/g, '$1<span style="color:#569cd6">$2</span>')
    .replace(/(\s)([\w-]+)(=)/g, '$1<span style="color:#9cdcfe">$2</span>$3')
    .replace(/(=)(&quot;)([^&]*)(&quot;)/g, '$1$2<span style="color:#ce9178">$3</span>$4');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 'Cascadia Code',monospace;padding:16px;white-space:pre-wrap}
    .tag{color:#569cd6}.attr{color:#9cdcfe}.val{color:#ce9178}.comment{color:#6a9955}
  </style></head><body><pre>${colored}</pre></body></html>`;
}
registerPreviewRenderer({
  id: "xml",
  name: "XML",
  extensions: ["xml", "xsl", "xsd", "rss", "atom"],
  languages: ["xml"],
  render: renderXml,
  useIframe: true,
});

// ── YAML formatted ──
function renderYaml({ content }: { content: string }): string {
  const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const colored = escaped
    .replace(/^(\s*)([\w-]+)(\s*:)/gm, '$1<span style="color:#9cdcfe">$2</span>$3')
    .replace(/(:\s+)(true|false|null|yes|no)(\s*$)/gm, '$1<span style="color:#569cd6">$2</span>$3')
    .replace(/(:\s+)(\d+\.?\d*)(\s*$)/gm, '$1<span style="color:#b5cea8">$2</span>$3')
    .replace(/(:\s+)(".*?"|'.*?')(\s*$)/gm, '$1<span style="color:#ce9178">$2</span>$3')
    .replace(/^(\s*#.*$)/gm, '<span style="color:#6a9955">$1</span>');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 'Cascadia Code',monospace;padding:16px;white-space:pre-wrap}
  </style></head><body><pre>${colored}</pre></body></html>`;
}
registerPreviewRenderer({
  id: "yaml",
  name: "YAML",
  extensions: ["yml", "yaml"],
  languages: ["yaml"],
  render: renderYaml,
  useIframe: true,
});

// ── Mermaid diagram renderer ──
function renderMermaid({ content }: { content: string }): string {
  const encoded = encodeURIComponent(content);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,sans-serif}
    .err{color:#999;text-align:center;padding:40px}
  </style></head><body>
  <div class="mermaid" id="diagram"></div>
  <div id="error" class="err" style="display:none">Failed to render diagram</div>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({startOnLoad:false,theme:'default'});
    (async function(){
      try {
        const {svg} = await mermaid.render('diagram', decodeURIComponent('${encoded}'));
        document.getElementById('diagram').innerHTML = svg;
      } catch(e) { document.getElementById('error').style.display='block'; }
    })();
  </script></body></html>`;
}
registerPreviewRenderer({
  id: "mermaid",
  name: "Mermaid",
  extensions: ["mmd", "mermaid"],
  languages: ["mermaid"],
  render: renderMermaid,
  useIframe: true,
});

// ── LaTeX/KaTeX math renderer ──
function renderLatex({ content }: { content: string }): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#fff;color:#333;font:16px/1.6 serif;padding:24px;max-width:800px;margin:0 auto}
    .err{color:#999;font-family:-apple-system,sans-serif}
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js"></script>
  </head><body><div id="math">${content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  <p id="err" class="err" style="display:none">Math rendering may be limited in preview</p>
  <script>
    try { renderMathInElement(document.getElementById('math'),{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]}); }
    catch(e) { document.getElementById('err').style.display='block'; }
  </script></body></html>`;
}
registerPreviewRenderer({
  id: "latex",
  name: "LaTeX",
  extensions: ["tex", "latex"],
  languages: ["latex", "tex"],
  render: renderLatex,
  useIframe: true,
});

// ── PlantUML renderer ──
function renderPlantUml({ content }: { content: string }): string {
  const encoded = btoa(content);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
    img{max-width:95%;max-height:95vh} .err{color:#999;text-align:center;padding:40px;font-family:-apple-system,sans-serif}
  </style></head><body>
  <img src="https://www.plantuml.com/plantuml/svg/~1${encoded}" alt="PlantUML"
    onerror="this.style.display='none';document.getElementById('err').style.display='block'">
  <div id="err" class="err" style="display:none">Failed to render PlantUML</div>
  </body></html>`;
}
registerPreviewRenderer({
  id: "plantuml",
  name: "PlantUML",
  extensions: ["puml", "plantuml"],
  languages: [],
  render: renderPlantUml,
  useIframe: true,
});

// ── Graphviz/DOT renderer ──
function renderDot({ content }: { content: string }): string {
  const encoded = encodeURIComponent(content);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,sans-serif}
    .err{color:#999;text-align:center;padding:40px}
  </style></head><body><div id="graph"></div><div id="err" class="err" style="display:none">Failed to render Graphviz</div>
  <script src="https://cdn.jsdelivr.net/npm/@hpcc-js/wasm@2/dist/graphviz.umd.js"></script>
  <script>
    (async function(){
      try{
        const g = await (window["@hpcc-js/wasm"] || window["@hpcc-js/wasm/dist/graphviz.umd"]).graphviz;
        if(!g){var gv=await import("https://cdn.jsdelivr.net/npm/@hpcc-js/wasm@2/dist/graphviz.umd.js");g=gv.graphviz;}
        if(!g)throw new Error('no graphviz');
        const svg = g.layout(decodeURIComponent('${encoded}'),'svg','dot');
        document.getElementById('graph').innerHTML=svg;
      }catch(e){document.getElementById('err').style.display='block'};
    })();
  </script></body></html>`;
}
registerPreviewRenderer({
  id: "dot",
  name: "Graphviz",
  extensions: ["dot", "gv"],
  languages: [],
  render: renderDot,
  useIframe: true,
});

// ── Font preview ──
function renderFont({ assetUrl }: { assetUrl: string | null }): string {
  if (!assetUrl) return "<p style='color:#999;padding:40px;text-align:center'>Save the file first</p>";
  const sample = "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 .,;:!?@#$%^&*()\nThe quick brown fox jumps over the lazy dog.";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @font-face { font-family:'PreviewFont'; src:url('${assetUrl}') format('truetype'); }
    body{background:#1e1e1e;color:#ccc;font-family:-apple-system,sans-serif;padding:24px}
    .sample{font-family:'PreviewFont',sans-serif;font-size:24px;line-height:1.8;white-space:pre-wrap;margin:12px 0}
    .label{color:#888;font-size:12px;margin-top:20px}
    .size{font-family:'PreviewFont',sans-serif}
    .s12{font-size:12px}.s16{font-size:16px}.s24{font-size:24px}.s36{font-size:36px}.s48{font-size:48px}
  </style></head><body>
    <div class="label">12px</div><div class="sample s12">${sample}</div>
    <div class="label">16px</div><div class="sample s16">${sample}</div>
    <div class="label">24px</div><div class="sample s24">${sample}</div>
    <div class="label">36px</div><div class="sample s36">${sample}</div>
    <div class="label">48px</div><div class="sample s48">${sample}</div>
  </body></html>`;
}
registerPreviewRenderer({
  id: "font",
  name: "Font",
  extensions: ["ttf", "otf", "woff", "woff2"],
  languages: [],
  render: renderFont,
  useIframe: true,
});

// ── Audio player ──
function renderAudio({ assetUrl }: { assetUrl: string | null }): string {
  if (!assetUrl) return "<p style='color:#999;padding:40px;text-align:center'>Save the file first</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;display:flex;align-items:center;justify-content:center;min-height:100vh}
    audio{outline:none;width:400px}
  </style></head><body><audio controls autoplay src="${assetUrl}"></audio></body></html>`;
}
registerPreviewRenderer({
  id: "audio",
  name: "Audio",
  extensions: ["mp3", "wav", "ogg", "flac", "aac", "m4a"],
  languages: [],
  render: renderAudio,
  useIframe: true,
});

// ── Video player ──
function renderVideo({ assetUrl }: { assetUrl: string | null }): string {
  if (!assetUrl) return "<p style='color:#999;padding:40px;text-align:center'>Save the file first</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}
    video{max-width:100%;max-height:100vh;outline:none}
  </style></head><body><video controls autoplay src="${assetUrl}"></video></body></html>`;
}
registerPreviewRenderer({
  id: "video",
  name: "Video",
  extensions: ["mp4", "webm", "ogg", "mov"],
  languages: [],
  render: renderVideo,
  useIframe: true,
});
