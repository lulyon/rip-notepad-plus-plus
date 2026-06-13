#!/usr/bin/env python3
"""Generate ripNotepad++ app icons in all required sizes."""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = {
    "32x32.png": 32,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "icon.png": 512,
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "icons")

# VS Code-inspired dark theme colors
BG_COLOR = (30, 30, 30)          # #1e1e1e
ACCENT = (0, 122, 204)           # #007acc (blue)
ACCENT_LIGHT = (78, 201, 176)    # #4ec9b0 (teal)
TEXT_COLOR = (212, 212, 212)     # #d4d4d4

def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded background
    margin = size // 16
    r = size // 8  # corner radius
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=r,
        fill=BG_COLOR,
    )

    # Inner gradient-like panel (slightly lighter)
    inner_margin = size // 5
    draw.rounded_rectangle(
        [inner_margin, inner_margin, size - inner_margin, size - inner_margin],
        radius=r // 2,
        fill=(45, 45, 45),
    )

    # Stylized `</>` in the center
    # Draw angle brackets and slash
    cx, cy = size // 2, size // 2

    # Use a bigger font or manually draw shapes
    fh = size // 3  # figure height
    lw = max(2, size // 32)  # line width

    # Left bracket `<`
    lx = cx - size // 5
    draw.line(
        [(lx + fh // 3, cy + fh // 2), (lx, cy), (lx + fh // 3, cy - fh // 2)],
        fill=ACCENT,
        width=lw,
    )

    # Slash `/`
    draw.line(
        [(cx - lw, cy + fh // 2), (cx + lw, cy - fh // 2)],
        fill=ACCENT_LIGHT,
        width=lw,
    )

    # Right bracket `>`
    rx = cx + size // 5
    draw.line(
        [(rx - fh // 3, cy - fh // 2), (rx, cy), (rx - fh // 3, cy + fh // 2)],
        fill=ACCENT,
        width=lw,
    )

    return img


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for filename, size in SIZES.items():
        img = draw_icon(size)
        path = os.path.join(OUTPUT_DIR, filename)
        img.save(path)
        print(f"  ✓ {filename} ({size}x{size})")

    # Also generate macOS .icns (requires png2icns) — skip, just use icon.png
    print(f"\nIcons saved to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
