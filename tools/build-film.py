"""Build the scroll film: the owner's four reference clips (generated footage) stitched into one journey.

Usage: python3 -I tools/build-film.py <97f87dc2.mp4> <6daa857f.mp4> <43a4edb4.mp4> <fa9b5fd6.mp4>
Writes assets/film/d/NNN.webp (1280x720), assets/film/m/NNN.webp (405x720 centre crop) and assets/film/film.json
(frame count, where each shot starts, and the track of the specimen card the page lays over the footage).

The journey, in order:
  1. grove   97f87dc2 0.0-1.95 s  the dark bamboo grove and the first light (24 fps)
  2. beam    6daa857f 0.0-4.3 s   the specimen in the cold beam, splitting open, fibres swirling into yarn (24 fps)
  3. close   43a4edb4 13.0-15.6 s the yarn and a banana bark sheet in cyan and gold light (12 fps)
  4. dome    fa9b5fd6 10.35-13.2 s the hall opens into a glass dome in daylight, three families labelled (12 fps)
Left out on purpose: the clips' drawn-in spec drawers and quote forms (invented minimum orders, "100% organic",
"verified export manifest"; the site's real drawer and form take their place) and the clips' AI-generated presenter.
In the beam shot the drawn specimen card misspells its labels ("Banglies", "Dadoin"): it is blurred out frame by frame
and the page lays a real, clickable card over the same place (track in film.json). The small "Macro" label is blurred too.
Cuts are blended over several frames; the two cuts between dark and light pass through a soft flash of light.
"""
import glob
import json
import math
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

GROVE, BEAM, STUDIO, END = sys.argv[1:5]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1280, 720

# the drawn specimen card in the beam shot: time (s) -> box (fractions of the frame: x0, y0, x1, y1)
CARD = [(0.0, (0.34, 0.59, 0.67, 0.81)), (1.0, (0.32, 0.62, 0.68, 0.87)), (1.5, (0.29, 0.65, 0.71, 0.94)),
        (2.0, (0.25, 0.67, 0.78, 1.0)), (2.5, (0.17, 0.74, 0.89, 1.0)), (2.75, (0.10, 0.77, 0.95, 1.0)),
        (3.0, (0.0, 0.86, 0.40, 1.0)), (3.25, (0.0, 0.95, 0.2, 1.0))]
MACRO = (2.3, 3.15, (0.0, 0.0, 0.27, 0.19))


def card_at(t):
    if t < CARD[0][0] or t > CARD[-1][0]:
        return None
    for (ta, a), (tb, b) in zip(CARD, CARD[1:]):
        if ta <= t <= tb:
            u = (t - ta) / (tb - ta)
            return tuple(x + (y - x) * u for x, y in zip(a, b))
    return CARD[-1][1]


def beam_boxes(t):
    boxes = []
    c = card_at(t)
    if c: boxes.append(c)
    if MACRO[0] <= t <= MACRO[1]: boxes.append(MACRO[2])
    return boxes


SHOTS = [  # name, clip, start, end, fps, boxes(t)
    ('grove', GROVE, 0.0, 1.95, 24, None),
    ('beam', BEAM, 0.0, 4.3, 24, beam_boxes),
    ('close', STUDIO, 13.0, 15.6, 12, None),
    ('dome', END, 10.35, 13.2, 12, None),
]
BLEND = {1: (6, 0.35), 2: (6, 0.0), 3: (10, 0.8)}  # into shot k: frames blended, flash strength


def blur_out(im, boxes):
    """Blur and darken drawn text inside the boxes, with a feathered edge."""
    if not boxes: return im
    soft = ImageEnhance.Brightness(im.filter(ImageFilter.GaussianBlur(22))).enhance(0.62)
    mask = Image.new('L', im.size, 0)
    d = ImageDraw.Draw(mask)
    for x0, y0, x1, y1 in boxes:
        d.rounded_rectangle((x0 * W - 10, y0 * H - 10, x1 * W + 10, y1 * H + 10), radius=18, fill=255)
    return Image.composite(soft, im, mask.filter(ImageFilter.GaussianBlur(12)))


def extract(clip, a, b, fps, out):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', clip, '-vf', f'fps={fps},scale={W}:{H}',
                    os.path.join(out, '%04d.png')], check=True)
    return [Image.open(f).convert('RGB') for f in sorted(glob.glob(os.path.join(out, '*.png')))]


frames, starts, track = [], {}, []
with tempfile.TemporaryDirectory() as tmp:
    for k, (name, clip, a, b, fps, boxes) in enumerate(SHOTS):
        d = os.path.join(tmp, name); os.mkdir(d)
        seg = extract(clip, a, b, fps, d)
        times = [a + i / fps for i in range(len(seg))]
        if boxes: seg = [blur_out(im, boxes(t - a)) for im, t in zip(seg, times)]
        first = len(frames)
        if frames:
            n, flash = BLEND[k]
            for j in range(n):
                u = (j + 1) / (n + 1)
                im = Image.blend(frames[-n + j], seg[j], u)
                if flash: im = ImageEnhance.Brightness(im).enhance(1 + flash * math.sin(math.pi * u))
                frames[-n + j] = im
            seg, times = seg[n:], times[n:]
            first = len(frames) - n
        starts[name] = first
        if name == 'beam':  # the live card follows the drawn one until it slides off the bottom of the frame
            for i, t in enumerate(times):
                c = card_at(t - a)
                if c and t - a <= 2.6: track.append([len(frames) + i] + [round(v, 4) for v in c])
        frames += seg

for sub in ('d', 'm'):
    out = os.path.join(ROOT, 'assets', 'film', sub)
    os.makedirs(out, exist_ok=True)
    for f in glob.glob(os.path.join(out, '*.webp')): os.remove(f)
for i, im in enumerate(frames, 1):
    im.save(os.path.join(ROOT, 'assets/film/d', f'{i:03d}.webp'), quality=72, method=6)
    x = (im.width - 405) // 2
    im.crop((x, 0, x + 405, H)).save(os.path.join(ROOT, 'assets/film/m', f'{i:03d}.webp'), quality=72, method=6)
with open(os.path.join(ROOT, 'assets/film/film.json'), 'w') as f:
    json.dump({'frames': len(frames), 'shots': starts, 'card': track}, f, separators=(',', ':'))
print(f'{len(frames)} frames; shots {starts}; card track {len(track)} frames')
print('now run: node tools/stamp.mjs  (gives the new film a new version tag, so no cache shows old frames)')
