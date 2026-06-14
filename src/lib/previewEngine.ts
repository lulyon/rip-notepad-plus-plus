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
  extensions: ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"],
  languages: [],
  render: renderImage,
  useIframe: true,
});
