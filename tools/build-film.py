"""Build the scroll film's frames from the owner's reference clip (gemini_generated_video_97f87dc2, generated footage).

Usage: python3 -I tools/build-film.py <path to the 97f87dc2 .mp4>
Writes assets/film/d/NNN.webp (1280x720) and assets/film/m/NNN.webp (405x720 centre crop), replacing what is there.

The journey follows the clip's own camera: the dark bamboo grove and the light at its end (0-1.95 s), the fibre
close-ups (3.0-5.95 s, zoomed 1.25x so the drifting glass cards with invented text at the frame edges are cropped
out, then their outer edges softened like a lens falloff), and the gallery of three labelled cases (6.0-7.4 s). Left out on purpose: 2.0-2.95 s (plinth cards misspell
the company name) and 8.3 s on (a fake quote form is drawn into the picture; the site's real form takes its place).
Five frames are blended across each cut so scrolling never jumps.
"""
import os, subprocess, sys, tempfile, glob
from PIL import Image, ImageFilter

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEGMENTS = [(0.0, 1.95, None), (3.0, 5.95, 'crop=1024:576:128:72,scale=1280:720'), (6.0, 7.4, None)]
BLEND = 5

def soften_edges(im, band=170):
    # a lens-like falloff at the left and right edges: blurs what is left of the drifting cards there
    blur = im.filter(ImageFilter.GaussianBlur(14))
    mask = Image.new('L', im.size, 0)
    for x in range(band):
        v = int(255 * (1 - x / band) ** 1.4)
        for xx in (x, im.width - 1 - x):
            mask.paste(v, (xx, 0, xx + 1, im.height))
    return Image.composite(blur, im, mask)

def extract(a, b, vf, out):
    filt = f"fps=24{',' + vf if vf else ''}"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', SRC, '-vf', filt, os.path.join(out, '%04d.png')], check=True)
    return [Image.open(f).convert('RGB') for f in sorted(glob.glob(os.path.join(out, '*.png')))]

frames = []
with tempfile.TemporaryDirectory() as tmp:
    for k, (a, b, vf) in enumerate(SEGMENTS):
        d = os.path.join(tmp, str(k)); os.mkdir(d)
        seg = extract(a, b, vf, d)
        if vf: seg = [soften_edges(im) for im in seg]
        if frames:  # blend the last BLEND frames of the previous segment into the first BLEND of this one
            for j in range(BLEND):
                t = (j + 1) / (BLEND + 1)
                frames[-BLEND + j] = Image.blend(frames[-BLEND + j], seg[j], t)
            seg = seg[BLEND:]
        frames += seg

for sub in ('d', 'm'):
    out = os.path.join(ROOT, 'assets', 'film', sub)
    for f in glob.glob(os.path.join(out, '*.webp')): os.remove(f)
for i, im in enumerate(frames, 1):
    im.save(os.path.join(ROOT, 'assets/film/d', f'{i:03d}.webp'), quality=74, method=6)
    x = (im.width - 405) // 2
    im.crop((x, 0, x + 405, 720)).save(os.path.join(ROOT, 'assets/film/m', f'{i:03d}.webp'), quality=74, method=6)
print(f'{len(frames)} frames')
