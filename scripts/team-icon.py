#!/usr/bin/env python3
"""La Chona's portrait badge: her face on the app's plum ground inside a gold ring, cut to a
true circle (transparent outside). Used on the La Chona tab of /team/.

Writes images/optimized/la-chona-badge.webp (256px — what the app loads; it renders at 116px,
84px on phones) and la-chona-badge.png (512px, for La Chona's GroupMe bot avatar, which wants
a PNG). The home-screen icon itself is scripts/team-icon.html → scripts/team-icon.sh.
Run: python3 scripts/team-icon.py
"""
from PIL import Image, ImageDraw, ImageFilter
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'images', 'la-chona.png')
OUT = os.path.join(ROOT, 'images', 'optimized')
os.makedirs(OUT, exist_ok=True)

S = 1024  # work large, downsample at the end

# 1. Cut La Chona off her near-black ground so she can sit on the gradient.
src = Image.open(SRC).convert('RGBA')
px = src.load()
w, h = src.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        # background is ~(10,0,16); fade anything that dark to transparent
        d = max(r - 10, 0) + g + max(b - 16, 0)
        if d < 30:
            px[x, y] = (r, g, b, 0)
        elif d < 70:
            px[x, y] = (r, g, b, int(255 * (d - 30) / 40))

# Head and shoulders. Fractions, not pixels, so a re-exported source still frames the same way.
crop = src.crop((round(w * 0.1875), 0, round(w * 0.9375), round(h * 0.6445)))


def ground(size, pad):
    """Radial plum gradient like the app's body background, with a thin gold ring inset."""
    im = Image.new('RGBA', (size, size), (12, 5, 20, 255))
    grad = Image.new('RGBA', (size, size))
    gp = grad.load()
    cx, cy = size * 0.5, size * 0.22
    rmax = size * 0.95
    for y in range(size):
        for x in range(size):
            t = min(((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / rmax, 1.0)
            # #2a1540 → #0c0514
            gp[x, y] = (int(42 + (12 - 42) * t), int(21 + (5 - 21) * t), int(64 + (20 - 64) * t), 255)
    im.alpha_composite(grad)
    d = ImageDraw.Draw(im)
    inset = int(size * (0.06 + pad))
    d.ellipse((inset, inset, size - inset, size - inset), outline=(201, 168, 76, 255), width=max(3, size // 96))
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((inset, inset, size - inset, size - inset), outline=(201, 168, 76, 110), width=max(6, size // 40))
    glow = glow.filter(ImageFilter.GaussianBlur(size // 60))
    im.alpha_composite(glow)
    return im


def icon(size, pad=0.0):
    im = ground(S, pad)
    # Scale the face so it fills the ring, leaving room for the headdress to breathe.
    target_w = int(S * (0.88 - pad * 1.6))
    scale = target_w / crop.width
    face = crop.resize((target_w, int(crop.height * scale)), Image.LANCZOS)
    # soft shadow under her so she reads against the plum
    shadow = Image.new('RGBA', face.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 170), (0, 0), face.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(S // 50))
    x = (S - face.width) // 2
    y = int(S * (0.15 + pad * 1.2))
    im.alpha_composite(shadow, (x, y + S // 60))
    im.alpha_composite(face, (x, y))
    # Clip everything below the ring so shoulders end cleanly (the ring is the frame).
    inset = int(S * (0.06 + pad))
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).ellipse((inset, inset, S - inset, S - inset), fill=255)
    bg = ground(S, pad)
    out = Image.composite(im, bg, mask)
    # Everything outside the ring goes transparent so the badge is a circle wherever it lands.
    outer = Image.new('L', (S, S), 0)
    ImageDraw.Draw(outer).ellipse((inset - S // 40, inset - S // 40, S - inset + S // 40, S - inset + S // 40), fill=255)
    out.putalpha(outer)
    return out.resize((size, size), Image.LANCZOS)


icon(256).save(os.path.join(OUT, 'la-chona-badge.webp'), format='WEBP', quality=82, method=6)
icon(512).save(os.path.join(OUT, 'la-chona-badge.png'), optimize=True)
print('wrote la-chona-badge.webp and la-chona-badge.png')
