/** Extract the file name from a full path. */
export function fileName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

/** Extract the file extension (lowercase, no dot). */
export function fileExtension(path: string): string {
  return (path.split(".").pop() || "").toLowerCase();
}

/** Format file size in human-readable form. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Check if a file is likely binary based on extension. */
export function isBinaryExtension(path: string): boolean {
  const ext = fileExtension(path);
  const binaryExts = new Set([
    "exe", "dll", "so", "dylib", "bin", "obj", "o", "a", "lib",
    "zip", "tar", "gz", "bz2", "xz", "7z", "rar",
    "png", "jpg", "jpeg", "gif", "bmp", "ico", "icns", "webp",
    "mp3", "wav", "flac", "aac", "ogg", "mp4", "avi", "mkv", "mov",
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "ttf", "otf", "woff", "woff2", "eot",
    "wasm", "class", "pyc",
  ]);
  return binaryExts.has(ext);
}
