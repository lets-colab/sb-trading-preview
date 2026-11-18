"""Trace the film's opening frames into line drawings, for the handover from the live 3D grove to the footage.

The opening's 3D wireframe (assets/gate3d.js) gives way to these lines, traced from the film's own frames (generated
footage, labelled as such on the page), so the lines sit exactly on the bamboo in the picture; the footage then
brightens under them and they dissolve (assets/filmtrace.js). Desktop frames (assets/film/d, 1280x720) are traced;
the phone set is their centre crop (x from 437.5), so one trace serves both.

Run from the repository root after the film frames change (needs opencv-python and numpy):
    python3 tools/trace-film.py
then `node tools/stamp.mjs` (the trace lives in assets/film/, so it shares the film's version tag).

Output assets/film/trace.bin, little-endian:
    'SBT1', u16 frame count; per frame: u16 frame index (0-based), u16 line count;
    per line: u16 point count, u16 x0, u16 y0, then (count - 1) steps of i8 dx, i8 dy (a longer step is split in two
    by the encoder, so every step fits).
"""
import struct
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FRAMES = range(8, 27, 2)  # 0-based; the handover runs over these frames (film progress 0.04 to 0.13)
CANNY = (40, 110)
MIN_LENGTH = 80  # px of outline: shorter edges are noise, grain and leaf tips
EPSILON = 1.2  # px: how far the simplified line may stray from the traced edge


def trace(index):
    img = cv2.imread(str(ROOT / f'assets/film/d/{index + 1:03d}.webp'))
    if img is None:
        sys.exit(f'missing frame {index + 1:03d}')
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(g)  # the frames are dark: lift the local contrast
    g = cv2.bilateralFilter(g, 7, 40, 7)  # smooth the grain, keep the edges
    edges = cv2.Canny(g, *CANNY)
    contours = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)[0]
    lines = []
    for c in contours:
        if cv2.arcLength(c, False) < MIN_LENGTH:
            continue
        pts = cv2.approxPolyDP(c, EPSILON, False).reshape(-1, 2).astype(int)
        if len(pts) >= 2:
            lines.append(pts)
    lines.sort(key=lambda p: (p[:, 0].mean(), p[:, 1].min()))  # left to right: they draw in across the frame
    return lines


def encode(pts):
    out = [pts[0]]
    for p in pts[1:]:
        prev = out[-1]
        d = p - prev
        n = int(np.ceil(np.abs(d).max() / 127)) or 1  # split a long step so each part fits in a signed byte
        for k in range(1, n + 1):
            out.append(prev + (d * k) // n)
    steps = np.diff(np.array(out), axis=0)
    return struct.pack('<HHH', len(out), *map(int, out[0])) + steps.astype(np.int8).tobytes()


def main():
    blob = bytearray(b'SBT1' + struct.pack('<H', len(FRAMES)))
    total = 0
    for i in FRAMES:
        lines = trace(i)
        blob += struct.pack('<HH', i, len(lines))
        for pts in lines:
            blob += encode(pts)
            total += len(pts)
        print(f'frame {i + 1:03d}: {len(lines)} lines')
    out = ROOT / 'assets/film/trace.bin'
    out.write_bytes(bytes(blob))
    print(f'{out.relative_to(ROOT)}: {len(blob) / 1024:.1f} KB, {total} points')


if __name__ == '__main__':
    main()
