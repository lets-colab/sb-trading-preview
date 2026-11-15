"""Cut each family's product out of SB Trading's own photograph, for the 3D specimens in Explore.

Usage: python3 -I tools/build-cutouts.py   (needs rembg with the isnet-general-use model, and OpenCV)
Writes assets/img/cutout/<family>.webp (RGBA). The depth maps in assets/img/depth/ are reused for the geometry.
Bamboo: the split-bamboo pile; yarn: the loose hanging hanks; bark and leaves: the leaf packs, cut by their green
(the model alone loses them in their clear bags). Where a product runs off the photo's edge, that edge is faded so
the object reads as an object, not a sliced photo. Nothing is painted or invented: every pixel kept is the photo's.
"""
import os
import numpy as np
import cv2
from PIL import Image
from rembg import remove, new_session

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = {'bamboo': 'bamboo-sections', 'fibre': 'banana-fibre-loose', 'leaves': 'banana-leaves'}
os.makedirs(os.path.join(ROOT, 'assets/img/cutout'), exist_ok=True)
sess = new_session('isnet-general-use')

def edge_fade(a, frac=0.07):
    h, w = a.shape
    fy = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / (h * frac), 0, 1)
    fx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w * frac), 0, 1)
    return a * np.outer(fy, fx) ** 0.8

for fam, name in SRC.items():
    rgb = Image.open(os.path.join(ROOT, 'assets/img', name + '.webp')).convert('RGB')
    alpha = np.asarray(remove(rgb, session=sess, only_mask=True), dtype=np.float32) / 255
    if fam == 'leaves':
        hsv = cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2HSV)
        green = cv2.inRange(hsv, (35, 60, 40), (90, 255, 255))
        green = cv2.morphologyEx(green, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
        green = cv2.morphologyEx(green, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
        n, lab, stats, _ = cv2.connectedComponentsWithStats(green)
        keep = np.zeros_like(green)
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] > green.size * 0.01: keep[lab == i] = 255
        green = cv2.GaussianBlur(keep, (0, 0), 2).astype(np.float32) / 255
        alpha = np.maximum(alpha, green)
    alpha = edge_fade(alpha)
    out = np.dstack([np.asarray(rgb), (alpha * 255).astype(np.uint8)])
    Image.fromarray(out, 'RGBA').save(os.path.join(ROOT, 'assets/img/cutout', fam + '.webp'), quality=86, method=6)
    print(fam, f'{(alpha > 0.5).mean():.0%} kept')
