import MarkdownIt from "markdown-it";

// ── Bundled library URLs (Vite ?url imports = offline, no CDN) ──
import mammothUrl from "mammoth/mammoth.browser.min.js?url";
import leafletJsUrl from "leaflet/dist/leaflet.js?url";
import leafletCssUrl from "leaflet/dist/leaflet.css?url";
import katexJsUrl from "katex/dist/katex.min.js?url";
import katexCssUrl from "katex/dist/katex.min.css?url";
import katexAutoRenderUrl from "katex/dist/contrib/auto-render.min.js?url";
import xlsxUrl from "xlsx/dist/xlsx.full.min.js?url";
import mermaidUrl from "mermaid/dist/mermaid.min.js?url";
import sqlWasmUrl from "sql.js/dist/sql-wasm.js?url";

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
  <script src="${mermaidUrl}"></script>
  <script>
    mermaid.initialize({startOnLoad:false,theme:'default'});
    try {
      mermaid.render('diagram', decodeURIComponent('${encoded}')).then(function(result){
        document.getElementById('diagram').innerHTML = result.svg;
      }).catch(function(e){
        document.getElementById('error').style.display='block'; console.error(e);
      });
    } catch(e) { document.getElementById('error').style.display='block'; console.error(e); }
  </script>
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
  <link rel="stylesheet" href="${katexCssUrl}">
  <script src="${katexJsUrl}"></script>
  <script src="${katexAutoRenderUrl}"></script>
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

// PlantUML preview removed — requires Java server, no browser-side renderer

// ── Graphviz/DOT renderer ──
function renderDot({ content }: { content: string }): string {
  const encoded = encodeURIComponent(content);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,sans-serif}
    .err{color:#f88;text-align:center;padding:40px;font-size:14px}
  </style></head><body><div id="graph"></div><div id="err" class="err" style="display:none"></div>
  <script src="https://cdn.jsdelivr.net/npm/viz.js@2.1.2/viz.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/viz.js@2.1.2/lite.render.js"></script>
  <script>
    (function() {
      if (typeof Viz === 'undefined') {
        document.getElementById('err').textContent = 'viz.js failed to load';
        document.getElementById('err').style.display = 'block';
        return;
      }
      try {
        var v = new Viz();
        v.renderSVGElement(decodeURIComponent('${encoded}')).then(function(el) {
          document.getElementById('graph').appendChild(el);
        }).catch(function(e) {
          document.getElementById('err').textContent = 'Render error: ' + e.message;
          document.getElementById('err').style.display = 'block';
        });
      } catch(e) {
        document.getElementById('err').textContent = 'Init error: ' + e.message;
        document.getElementById('err').style.display = 'block';
      }
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

// ── 1. Diff/Patch ──
function renderDiff({ content }: { content: string }): string {
  const lines = content.split(/\r?\n/).map((line) => {
    let cls = "";
    if (line.startsWith("+") && !line.startsWith("+++")) cls = "add";
    else if (line.startsWith("-") && !line.startsWith("---")) cls = "del";
    else if (line.startsWith("@@")) cls = "hunk";
    else if (line.startsWith("diff ") || line.startsWith("--- ") || line.startsWith("+++ ")) cls = "meta";
    return `<span class="${cls}">${line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>`;
  }).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.5 'Cascadia Code',monospace;padding:12px;white-space:pre-wrap}
    .add{background:rgba(75,180,75,0.15);color:#8f8;display:block}.del{background:rgba(220,80,80,0.15);color:#f88;display:block}
    .hunk{color:#569cd6;font-weight:bold;display:block}.meta{color:#888;font-weight:bold;display:block}
  </style></head><body><pre>${lines}</pre></body></html>`;
}
registerPreviewRenderer({
  id: "diff", name: "Diff", extensions: ["diff", "patch"], languages: ["diff"], render: renderDiff, useIframe: true,
});

// ── 2. .env table ──
function renderEnv({ content }: { content: string }): string {
  const rows = content.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).map((l) => {
    const eq = l.indexOf("=");
    if (eq < 0) return `<tr><td colspan="2">${l.replace(/&/g,"&amp;")}</td></tr>`;
    const key = l.slice(0, eq).trim();
    const val = l.slice(eq + 1).trim();
    const masked = val.length > 20 ? val.slice(0, 6) + "•••••" + val.slice(-4) : "•••••";
    return `<tr><td class="k">${key}</td><td class="v"><span class="masked">${masked}</span><span class="raw" style="display:none">${val.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</span></td></tr>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 -apple-system,sans-serif;padding:16px}
    table{border-collapse:collapse;width:100%}td{padding:6px 12px;border-bottom:1px solid #333}
    .k{color:#9cdcfe;font-weight:600;width:40%}.v{color:#ce9178;word-break:break-all}
    button{background:#333;border:1px solid #555;color:#ccc;padding:2px 8px;border-radius:3px;cursor:pointer;font-size:11px;margin-left:8px}
    button:hover{background:#555}
  </style></head><body>
  <p style="color:#888;margin-bottom:8px;font-size:12px">🔒 Values masked — hover to reveal</p>
  <table>${rows}</table>
  <script>
    document.querySelectorAll('td').forEach(td=>{td.onclick=function(e){if(e.target.tagName==='BUTTON')return;
      const m=this.querySelector('.masked'),r=this.querySelector('.raw');
      if(m.style.display!=='none'){m.style.display='none';r.style.display='inline'}else{m.style.display='inline';r.style.display='none'}}});
  </script></body></html>`;
}
registerPreviewRenderer({
  id: "env", name: ".env", extensions: ["env"], languages: [], render: renderEnv, useIframe: true,
});

// ── 3. Excel (.xlsx) ──
function renderXlsx({ assetUrl }: { assetUrl: string | null }): string {
  if (!assetUrl) return "<p style='color:#999;padding:40px;text-align:center'>Save the file first</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px -apple-system,sans-serif;padding:16px}
    table{border-collapse:collapse}th,td{border:1px solid #444;padding:4px 8px;text-align:left;white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis}
    th{background:#333;position:sticky;top:0}.err{color:#999;text-align:center;padding:40px}
    .sheet-tabs{display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap}
    .sheet-tab{padding:4px 12px;background:#333;border:1px solid #555;border-radius:4px 4px 0 0;cursor:pointer;color:#ccc}
    .sheet-tab.active{background:#555;font-weight:600}
  </style></head><body>
  <div id="sheets" class="sheet-tabs"></div>
  <div id="table"></div>
  <div id="err" class="err" style="display:none">Failed to load spreadsheet</div>
  <script src="${xlsxUrl}"></script>
  <script>
    (async function(){
      try{
        const resp=await fetch('${assetUrl}');
        const buf=await resp.arrayBuffer();
        const wb=XLSX.read(new Uint8Array(buf),{type:'array'});
        const sheets=wb.SheetNames;
        let sheetIdx=0;
        function show(i){
          sheetIdx=i;
          const ws=wb.Sheets[sheets[i]];
          const html=XLSX.utils.sheet_to_html(ws,{editable:false});
          document.getElementById('table').innerHTML=html;
          document.querySelectorAll('.sheet-tab').forEach((t,j)=>t.className='sheet-tab'+(j===i?' active':''));
        }
        if(sheets.length>1){
          const tabs=document.getElementById('sheets');
          sheets.forEach((s,i)=>{const b=document.createElement('button');b.className='sheet-tab'+(i===0?' active':'');b.textContent=s;b.onclick=()=>show(i);tabs.appendChild(b)});
        }
        show(0);
      }catch(e){document.getElementById('err').style.display='block'}
    })();
  </script></body></html>`;
}
registerPreviewRenderer({
  id: "xlsx", name: "Excel", extensions: ["xlsx", "xls"], languages: [], render: renderXlsx, useIframe: true,
});

// ── 4. Jupyter Notebook (.ipynb) ──
function renderIpynb({ content }: { content: string }): string {
  try {
    const nb = JSON.parse(content);
    const cells = (nb.cells || []).map((c: any, i: number) => {
      const src = Array.isArray(c.source) ? c.source.join("") : c.source || "";
      if (c.cell_type === "markdown") {
        return `<div class="cell md"><div class="cell-label">[${i + 1}] Markdown</div><div class="cell-content">${src.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div></div>`;
      }
      return `<div class="cell code"><div class="cell-label">[${i + 1}] Code</div><pre>${src.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>${c.outputs?.length ? '<div class="output">' + c.outputs.map((o: any) => Array.isArray(o.text) ? o.text.join("") : o["text/plain"] || "").join("") + '</div>' : ""}</div>`;
    }).join("");
    const title = nb.metadata?.kernelspec?.display_name || "Notebook";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 -apple-system,sans-serif;padding:16px}
      h2{color:#9cdcfe;margin-bottom:12px}.cell{margin-bottom:12px;border:1px solid #333;border-radius:6px;overflow:hidden}
      .cell-label{background:#333;padding:4px 10px;font-size:11px;color:#888}
      .cell-content{padding:10px}pre{background:#252526;padding:10px;font:13px 'Cascadia Code',monospace;overflow-x:auto}
      .output{background:#0a2a0a;color:#8f8;padding:8px 10px;border-top:1px solid #333;font:12px 'Cascadia Code',monospace;white-space:pre-wrap}
    </style></head><body><h2>${title}</h2>${cells}</body></html>`;
  } catch { return "<p style='color:#999;padding:40px;text-align:center'>Invalid notebook</p>"; }
}
registerPreviewRenderer({
  id: "ipynb", name: "Jupyter", extensions: ["ipynb"], languages: [], render: renderIpynb, useIframe: true,
});

// ── 5. Office (.docx) ──
function renderDocx({ assetUrl }: { assetUrl: string | null }): string {
  if (!assetUrl) return "<p style='color:#999;padding:40px;text-align:center'>Save the file first</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#fff;color:#333;font:14px/1.7 -apple-system,sans-serif;padding:24px;max-width:800px;margin:0 auto}
    .err{color:#999;text-align:center;padding:40px}
  </style></head><body><div id="content"></div><div id="err" class="err" style="display:none">Failed to load document</div>
  <script src="${mammothUrl}"></script>
  <script>
    (async function(){
      try{
        const resp=await fetch('${assetUrl}');
        const blob=await resp.blob();
        const buf=await blob.arrayBuffer();
        const result=await mammoth.convertToHtml({arrayBuffer:buf});
        document.getElementById('content').innerHTML=result.value;
        if(result.messages.length) console.warn(result.messages);
      }catch(e){document.getElementById('err').style.display='block';console.error(e)}
    })();
  </script></body></html>`;
}
registerPreviewRenderer({
  id: "docx", name: "Word", extensions: ["docx"], languages: [], render: renderDocx, useIframe: true,
});

// ── 6. GeoJSON Map ──
function renderGeoJson({ content }: { content: string }): string {
  const encoded = encodeURIComponent(content);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e}#map{width:100%;height:100vh}
    .err{color:#999;text-align:center;padding:40px;font-family:-apple-system,sans-serif}
  </style>
  <link rel="stylesheet" href="${leafletCssUrl}">
  <script src="${leafletJsUrl}"></script>
  </head><body><div id="map"></div><div id="err" class="err" style="display:none">Failed to load GeoJSON</div>
  <script>
    try{
      var map=L.map('map').setView([0,0],2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OSM'}).addTo(map);
      var data=JSON.parse(decodeURIComponent('${encoded}'));
      var layer=L.geoJSON(data).addTo(map);
      map.fitBounds(layer.getBounds());
    }catch(e){document.getElementById('err').style.display='block'}
  </script></body></html>`;
}
registerPreviewRenderer({
  id: "geojson", name: "GeoJSON", extensions: ["geojson"], languages: ["json"], render: renderGeoJson, useIframe: true,
});

// ── 7. SQLite Browser ──
function renderSqlite({ assetUrl }: { assetUrl: string | null }): string {
  if (!assetUrl) return "<p style='color:#999;text-align:center;padding:40px'>Save the file first</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px -apple-system,sans-serif;padding:16px}
    select{background:#333;color:#ccc;border:1px solid #555;padding:4px 8px;border-radius:3px;margin-bottom:8px}
    table{border-collapse:collapse;width:100%}th,td{border:1px solid #444;padding:4px 8px;text-align:left;white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis}
    th{background:#333;position:sticky;top:0}.err{color:#999;text-align:center;padding:40px}
  </style></head><body>
  <select id="tables" onchange="showTable(this.value)"></select>
  <div id="data"></div>
  <div id="err" class="err" style="display:none">Failed to open database</div>
  <script src="${sqlWasmUrl}"></script>
  <script>
    (async function(){
      try{
        const SQL=await initSqlJs({locateFile:f=>'${sqlWasmUrl.replace(/\.js$/, '.wasm')}'});
        const resp=await fetch('${assetUrl}');
        const buf=await resp.arrayBuffer();
        const db=new SQL.Database(new Uint8Array(buf));
        const tables=db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        const sel=document.getElementById('tables');
        (tables[0]?.values||[]).forEach(([name])=>{
          const o=document.createElement('option');o.value=name;o.textContent=name;sel.appendChild(o);
        });
        window.showTable=function(name){
          const r=db.exec('SELECT * FROM ['+name+'] LIMIT 500');
          if(!r[0]){document.getElementById('data').innerHTML='<p>Empty table</p>';return}
          const cols=r[0].columns,h='<tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>';
          const rows=r[0].values.map(row=>'<tr>'+row.map(v=>'<td>'+(v===null?'<i>NULL</i>':String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')))+'</td>').join('')+'</tr>';
          document.getElementById('data').innerHTML='<table>'+h+rows+'</table>';
        };
        if(tables[0]?.values?.length) showTable(tables[0].values[0][0]);
      }catch(e){document.getElementById('err').style.display='block'}
    })();
  </script></body></html>`;
}
registerPreviewRenderer({
  id: "sqlite", name: "SQLite", extensions: ["sqlite", "sqlite3", "db"], languages: [], render: renderSqlite, useIframe: true,
});

// ── 8. ZIP Archive listing ──
function renderZip(_opts: { content: string; filePath: string | null }): string {
  // The actual listing is done via Rust IPC — this is a placeholder
  // GenericPreview handles the async loading for this type
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 'Cascadia Code',monospace;padding:16px}
    .entry{padding:4px 0;border-bottom:1px solid #2a2a2a;display:flex}.name{flex:1}.size{color:#888;text-align:right;min-width:100px}
    .dir{color:#569cd6}.file{color:#d4d4d4}.err{color:#999;text-align:center;padding:40px;font-family:-apple-system,sans-serif}
    .loading{color:#888;text-align:center;padding:40px}
  </style></head><body><div id="list" class="loading">Loading archive...</div></body></html>`;
}
registerPreviewRenderer({
  id: "zip", name: "ZIP", extensions: ["zip", "jar", "war", "apk"], languages: [], render: renderZip, useIframe: true,
});

// ── 9. Subtitle (.srt/.vtt) ──
function renderSrt({ content }: { content: string }): string {
  const blocks = content.split(/\r?\n\r?\n/).filter((b) => b.trim());
  const items = blocks.map((b) => {
    const lines = b.split(/\r?\n/);
    const idx = lines[0]?.trim() || "";
    const time = lines[1]?.trim() || "";
    const text = lines.slice(2).join("<br>").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<div class="item"><span class="idx">${idx}</span><span class="time">${time}</span><span class="text">${text}</span></div>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 -apple-system,sans-serif;padding:12px}
    .item{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #2a2a2a}.idx{color:#888;min-width:40px;text-align:right}
    .time{color:#569cd6;min-width:100px;font-family:'Cascadia Code',monospace}.text{flex:1}
  </style></head><body>${items}</body></html>`;
}
registerPreviewRenderer({
  id: "srt", name: "Subtitle", extensions: ["srt", "vtt"], languages: [], render: renderSrt, useIframe: true,
});

// ── 10. HAR HTTP Archive ──
function renderHar({ content }: { content: string }): string {
  try {
    const har = JSON.parse(content);
    const entries = har.log?.entries || [];
    const rows = entries.map((e: any) => {
      const req = e.request || {};
      const res = e.response || {};
      const status = res.status || 0;
      const cls = status >= 400 ? "err" : status >= 300 ? "redir" : "ok";
      const method = req.method || "GET";
      const url = (req.url || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const time = e.time ? `${Math.round(e.time)}ms` : "-";
      const size = res.content?.size ? `${(res.content.size / 1024).toFixed(1)}KB` : "-";
      return `<tr class="${cls}"><td>${method}</td><td class="url">${url}</td><td>${status}</td><td>${time}</td><td>${size}</td></tr>`;
    }).join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:12px -apple-system,sans-serif;padding:12px}
      h2{color:#9cdcfe;margin-bottom:8px}table{border-collapse:collapse;width:100%}
      th{background:#333;padding:6px 8px;text-align:left;position:sticky;top:0}
      td{padding:4px 8px;border-bottom:1px solid #2a2a2a}.url{max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ok{color:#8f8}.redir{color:#ff0}.err{color:#f88}
    </style></head><body><h2>HAR: ${entries.length} requests</h2><table><thead><tr><th>Method</th><th>URL</th><th>Status</th><th>Time</th><th>Size</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  } catch { return "<p style='color:#999;padding:40px;text-align:center;font-family:-apple-system,sans-serif'>Invalid HAR file</p>"; }
}
registerPreviewRenderer({
  id: "har", name: "HAR", extensions: ["har"], languages: [], render: renderHar, useIframe: true,
});

// ── 11. 3D Model (.stl/.glb/.obj) ──
function render3d({ assetUrl }: { assetUrl: string | null }): string {
  if (!assetUrl) return "<p style='color:#999;padding:40px;text-align:center;font-family:-apple-system,sans-serif'>Save the file first</p>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1a1a2e;overflow:hidden}.err{color:#999;text-align:center;padding:40px;font-family:-apple-system,sans-serif}
  </style></head><body>
  <div id="err" class="err" style="display:none">3D preview not available offline</div>
  <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160/examples/jsm/"}}</script>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { STLLoader } from 'three/addons/loaders/STLLoader.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    try{
      const scene=new THREE.Scene();scene.background=new THREE.Color(0x1a1a2e);
      const camera=new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,0.1,1000);camera.position.set(5,5,5);
      const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(window.innerWidth,window.innerHeight);
      document.body.appendChild(renderer.domElement);
      new OrbitControls(camera,renderer.domElement);
      scene.add(new THREE.AmbientLight(0xffffff,0.6));scene.add(new THREE.DirectionalLight(0xffffff,0.8));
      const ext='${assetUrl}'.split('.').pop().toLowerCase();
      if(ext==='stl'){
        new STLLoader().load('${assetUrl}',g=>{scene.add(new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:0x4fc1ff})))});
      }else{
        new GLTFLoader().load('${assetUrl}',g=>{scene.add(g.scene)},undefined,()=>{
          new STLLoader().load('${assetUrl}',g=>{scene.add(new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:0x4fc1ff})))});
        });
      }
      function animate(){requestAnimationFrame(animate);renderer.render(scene,camera)}animate();
    }catch(e){document.getElementById('err').style.display='block'}
  </script></body></html>`;
}
registerPreviewRenderer({
  id: "3d", name: "3D Model", extensions: ["stl", "glb", "gltf", "obj"], languages: [], render: render3d, useIframe: false,
});

// Draw.io preview removed — requires complex pako compression + diagrams.net CDN

// ── Simple colored renderers for dev file types ──

function coloredIframe(content: string, keywords: string[], className: string): string {
  const escaped = content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  let colored = escaped;
  for (const kw of keywords) {
    const re = new RegExp(`\\b(${kw})\\b`, "gi");
    colored = colored.replace(re, `<span class="${className}">$1</span>`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 'Cascadia Code',monospace;padding:16px;white-space:pre-wrap}
    .kw{color:#569cd6}.str{color:#ce9178}.num{color:#b5cea8}.cmt{color:#6a9955}
  </style></head><body><pre>${colored}</pre></body></html>`;
}

registerPreviewRenderer({
  id: "sql", name: "SQL", extensions: ["sql"], languages: ["sql"],
  render: ({ content }) => coloredIframe(content, ["SELECT","FROM","WHERE","JOIN","LEFT","RIGHT","INNER","ON","AND","OR","NOT","IN","AS","ORDER","BY","GROUP","HAVING","LIMIT","OFFSET","INSERT","INTO","VALUES","UPDATE","SET","DELETE","CREATE","TABLE","INDEX","DROP","ALTER","ADD","COLUMN","PRIMARY","KEY","FOREIGN","REFERENCES","INTEGER","VARCHAR","TEXT","BOOLEAN","NULL","DEFAULT","CASCADE","UNIQUE","EXISTS","COUNT","SUM","AVG","MAX","MIN","UNION","ALL","DISTINCT","BEGIN","COMMIT","ROLLBACK"], "kw"),
  useIframe: true,
});

registerPreviewRenderer({
  id: "toml", name: "TOML", extensions: ["toml"], languages: [],
  render: ({ content }) => {
    const colored = content.replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/^(\s*\[.*?\])\s*$/gm,'<span style="color:#569cd6">$1</span>')
      .replace(/^(\s*)(\w+)(\s*=)/gm,'$1<span style="color:#9cdcfe">$2</span>$3')
      .replace(/(=\s*)(\d+\.?\d*)/gm,'$1<span style="color:#b5cea8">$2</span>')
      .replace(/(=\s*)(".*?"|'.*?')/gm,'$1<span style="color:#ce9178">$2</span>');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 'Cascadia Code',monospace;padding:16px;white-space:pre-wrap}
    </style></head><body><pre>${colored}</pre></body></html>`;
  },
  useIframe: true,
});

registerPreviewRenderer({
  id: "ini", name: "INI", extensions: ["ini", "cfg", "conf"], languages: ["ini"],
  render: ({ content }) => {
    const colored = content.replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/^(\s*\[.*?\])\s*$/gm,'<span style="color:#569cd6;font-weight:bold">$1</span>')
      .replace(/^(\s*)(\w+)(\s*=)/gm,'$1<span style="color:#9cdcfe">$2</span>$3')
      .replace(/(=\s*)(.*?)$/gm,'$1<span style="color:#ce9178">$2</span>')
      .replace(/^(;|#)(.*)$/gm,'<span style="color:#6a9955">$1$2</span>');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0}body{background:#1e1e1e;color:#d4d4d4;font:13px/1.6 'Cascadia Code',monospace;padding:16px;white-space:pre-wrap}
    </style></head><body><pre>${colored}</pre></body></html>`;
  },
  useIframe: true,
});

registerPreviewRenderer({
  id: "graphql", name: "GraphQL", extensions: ["graphql", "gql"], languages: ["graphql"],
  render: ({ content }) => coloredIframe(content, ["type","interface","union","enum","input","extend","schema","scalar","directive","implements","fragment","query","mutation","subscription","on","true","false","null","String","Int","Float","Boolean","ID"], "kw"),
  useIframe: true,
});

registerPreviewRenderer({
  id: "proto", name: "Protobuf", extensions: ["proto"], languages: ["proto"],
  render: ({ content }) => coloredIframe(content, ["syntax","package","import","option","message","service","rpc","returns","stream","enum","oneof","map","reserved","extend","extensions","required","optional","repeated","string","int32","int64","uint32","uint64","float","double","bool","bytes","true","false"], "kw"),
  useIframe: true,
});
