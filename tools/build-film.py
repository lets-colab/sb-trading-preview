"""Build the scroll film: the owner's reference clips (generated footage) cut into one continuous journey.

Usage: python3 -I tools/build-film.py <97f87dc2.mp4> <6daa857f.mp4> <43a4edb4.mp4> <fa9b5fd6.mp4>
Writes assets/film/d/NNN.webp (1280x720), assets/film/m/NNN.webp (405x720 centre crop), assets/film/film.json
(frame count, where each shot starts, the frames each join spans, and each frame's time in the soundtrack) and the
sound: assets/film/sound.mp3 (the clips' own audio, cut exactly as the picture, so every frame has its sound at a
known time) and assets/film/bed.mp3 (a seamless loop of the clips' steady shimmer, all in C). Then run
tools/trace-film.py and node tools/stamp.mjs.

The journey, in order (clip times in seconds):
  1. grove     97f87dc2 0.25-1.95  the bamboo grove in the first light, opening onto the pavilion
  2. showroom  97f87dc2 6.10-8.10  three glass cases: bamboo, banana fibre yarn, banana bark; the camera drifts in
  3. hall      6daa857f 0.40-4.30  the specimen in the cold beam, opening; its fibres swirl into a ball of yarn
  4. close     43a4edb4 13.0-15.6  the yarn and a sheet of banana bark in cyan and gold light (12 fps)
  5. dome      fa9b5fd6 10.35-13.2 pulling back: the same yarn among the whole range, in a glass dome in daylight
Left out on purpose: the clips' drawn-in spec drawers and quote forms (invented minimum orders, "100% organic",
"verified export manifest", a "Request a Quote" form in the showroom after 8.2 s; the site's real drawer and form take
their place), the pavilion's misspelled drawn labels (after 1.95 s), the fibre macro shot between the pavilion and the
showroom (fibres over bamboo culms: the yarn is banana fibre, and bamboo is never shown becoming yarn) and the clips'
AI-generated presenter. In the hall the drawn specimen card misspells its labels ("Banglies", "Dadoin"): it is
blurred out frame by frame, as is the small "Macro" label; so are the dome's drawn labels ("01 Sambo", "Bamnoa"),
readouts and edge panel; so are the hall's "05mm" and ring prompt, and the studio shot's readout bar and ghost panel.

No join is a cross-fade. Each is a camera move that carries the eye from one shot into the next:
  grove > showroom  a bamboo culm passes close in front of the lens (a defocused occluder) and the showroom is behind it
  showroom > hall   the camera pushes into the third glass case; a glint sweeps across the glass and the hall is behind it
  hall > close      match cut on the ball of yarn: the new shot's yarn grows out of the old one as the camera moves in
  close > dome      the camera pulls back from that yarn: the dark space around it opens onto the dome first, then the
                    yarn settles onto the same yarn among the whole range
"""
import glob
import json
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

GROVE, HALL, STUDIO, DOME = sys.argv[1:5]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1280, 720

# the drawn specimen card in the hall shot: clip time (s) -> box (fractions of the frame: x0, y0, x1, y1)
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


# the dome shot's drawn labels drift with the camera: box at clip time 11.18 s -> box at 13.2 s (blurred, not darkened:
# the dome is bright, and a dark patch would show)
DOME_LABELS = [((0.235, 0.265, 0.355, 0.315), (0.105, 0.20, 0.30, 0.265)),   # "02 / Banana fibre yarn"
               ((0.63, 0.30, 0.785, 0.365), (0.615, 0.255, 0.77, 0.335)),    # "01 Sambo / Banana fibre yarn"
               ((0.665, 0.725, 0.785, 0.795), (0.645, 0.78, 0.79, 0.87)),    # "03 / Bamnoa / Banana bark"
               ((0.1, 0.71, 0.33, 0.96), (0.0, 0.84, 0.22, 1.0)),            # the chart and its readouts, bottom left
               ((0.74, 0.85, 0.93, 0.96), (0.8, 0.88, 1.0, 1.0)),            # small readouts, bottom right
               ((0.94, 0.1, 1.0, 0.34), (0.93, 0.1, 1.0, 0.34))]             # the panel at the right edge


def dome_boxes(t):
    u = max(0.0, min(1.0, (t - 11.18) / (13.2 - 11.18)))
    return [tuple(a + (b - a) * u for a, b in zip(s, e)) for s, e in DOME_LABELS]


# the hall's painted readouts: "05mm" drifting right as the camera pushes in, and the ring's prompt "[hold or scroll to
# split fibers]" (a gesture the page does not use): clip time -> box
MM = [(0.4, (0.69, 0.27, 0.79, 0.36)), (1.2, (0.725, 0.245, 0.82, 0.33)), (2.0, (0.80, 0.18, 0.91, 0.28)),
      (2.6, (0.86, 0.12, 0.99, 0.24))]
PROMPT = (0.85, 1.55, (0.36, 0.455, 0.64, 0.525))  # once the specimen splits, its pieces hide what is left of it


def along(keys, t):
    if t < keys[0][0] or t > keys[-1][0]:
        return None
    for (ta, a), (tb, b) in zip(keys, keys[1:]):
        if ta <= t <= tb:
            u = (t - ta) / (tb - ta)
            return tuple(x + (y - x) * u for x, y in zip(a, b))
    return keys[-1][1]


def hall_boxes(t):
    boxes = []
    c = card_at(t)
    if c: boxes.append(c)
    if MACRO[0] <= t <= MACRO[1]: boxes.append(MACRO[2])
    m = along(MM, t)
    if m: boxes.append(m)
    if PROMPT[0] <= t <= PROMPT[1]: boxes.append(PROMPT[2])
    return boxes


# the showroom's plinth fronts carry painted labels ("01 Bamboo", "02 / Banana fibre yarn", "03 / Banana bark" on a case
# that holds bamboo, a yarn cone and bark) and arrow panels that copy the site's own: blurred (plain grey faces, so a
# blur reads as nothing), not darkened
PLINTHS = [(6.1, (0.14, 0.57, 0.88, 0.95)), (6.8, (0.09, 0.59, 0.92, 1.0)), (7.5, (0.0, 0.62, 0.98, 1.0)), (8.1, (0.07, 0.69, 1.0, 1.0))]


def showroom_boxes(t):
    b = along(PLINTHS, max(PLINTHS[0][0], min(PLINTHS[-1][0], t)))
    return [b] if b else []


def close_boxes(t):
    """The studio shot opens with a painted readout bar ("RANJ-NOOSE", "OIF-01122") and a ghost spec panel: blurred."""
    boxes = []
    if t <= 14.3: boxes.append((0.0, 0.80, 0.74, 0.97))  # below the leaf's lower edge
    if t <= 13.7: boxes.append((0.81, 0.10, 1.0, 0.84))
    return boxes


SHOTS = [  # name, clip, start, end (clip seconds), fps, boxes(clip time)
    ('grove', GROVE, 0.25, 1.95, 24, None),
    ('showroom', GROVE, 6.10, 8.10, 24, showroom_boxes),
    ('hall', HALL, 0.40, 4.30, 24, hall_boxes),
    ('close', STUDIO, 13.0, 15.6, 12, close_boxes),
    ('dome', DOME, 10.35, 13.2, 12, dome_boxes),
]


def blur_out(im, boxes, darken=0.62):
    """Blur (and darken) drawn text inside the boxes, with a feathered edge."""
    if not boxes: return im
    soft = ImageEnhance.Brightness(im.filter(ImageFilter.GaussianBlur(22))).enhance(darken)
    mask = Image.new('L', im.size, 0)
    d = ImageDraw.Draw(mask)
    for x0, y0, x1, y1 in boxes:
        d.rounded_rectangle((x0 * W - 10, y0 * H - 10, x1 * W + 10, y1 * H + 10), radius=18, fill=255)
    return Image.composite(soft, im, mask.filter(ImageFilter.GaussianBlur(12)))


def extract(clip, a, b, fps, out):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', clip, '-vf', f'fps={fps},scale={W}:{H}',
                    os.path.join(out, '%04d.png')], check=True)
    return [Image.open(f).convert('RGB') for f in sorted(glob.glob(os.path.join(out, '*.png')))]


# ------------------------------------------------------------------ the joins (frames as float32 arrays, 0..1)
arr = lambda im: np.asarray(im, dtype=np.float32) / 255
img = lambda a: Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8))
ease = lambda u: u * u * (3 - 2 * u)
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)


def place(a, scale, src, dst, valid=False):
    """Scale the frame about the point src and move that point to dst (pixels). Edges reflect; with valid=True it
    also returns where the frame has picture (0 where a scaled-down frame leaves the screen empty)."""
    m = np.float32([[scale, 0, dst[0] - scale * src[0]], [0, scale, dst[1] - scale * src[1]]])
    out = cv2.warpAffine(a, m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    if not valid: return out
    ones = cv2.warpAffine(np.ones((H, W), np.float32), m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    return out, cv2.GaussianBlur(ones, (0, 0), 6)[..., None]


def zoom_blur(a, c, amount, taps=6):
    """Radial blur toward the point c: the streaks of a fast push in."""
    if amount <= 0.002: return a
    acc = np.zeros_like(a)
    for k in range(taps):
        acc += place(a, 1 + amount * k / (taps - 1), c, c)
    return acc / taps


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def occluder_wipe(out, inc, n, culm):
    """A bamboo culm passes close in front of the lens, right to left, and the next shot is behind it."""
    band = culm.shape[1]
    frames = []
    for j in range(n):
        u = (j + 1) / (n + 1)
        x = W + band * 0.6 - ease(u) * (W + band * 1.2)  # the culm's centre crosses the frame
        o = place(out[j], 1 + 0.06 * u, (W * 0.45, H * 0.45), (W * 0.45 - 40 * u, H * 0.45))  # still moving in, drifting
        i = place(inc[j], 1.04 - 0.04 * u, (W * 0.5, H * 0.5), (W * 0.5 + 40 * (1 - u), H * 0.5))
        seam = smoothstep(x - band * 0.15, x + band * 0.15, XX)[..., None]  # right of the culm: the new shot
        f = o * (1 - seam) + i * seam
        alpha = np.zeros((H, W, 1), np.float32); rgb = np.zeros((H, W, 3), np.float32)
        x0 = int(round(x - band / 2))
        a0, a1 = max(0, x0), min(W, x0 + band)
        if a1 > a0:
            alpha[:, a0:a1, 0] = culm[:, a0 - x0:a1 - x0, 3]
            rgb[:, a0:a1] = culm[:, a0 - x0:a1 - x0, :3]
        frames.append(f * (1 - alpha) + rgb * alpha)
    return frames


def glint_wipe(out, inc, n, focus):
    """The camera pushes into a glass case; a glint sweeps across the glass and the next shot is behind it."""
    frames = []
    d = (XX * 0.88 + YY * 0.47) / (W * 0.88 + H * 0.47)  # distance along the sweep, 0 top left .. 1 bottom right
    for j in range(n):
        u = (j + 1) / (n + 1)
        s = 1 + 0.9 * ease(u)
        o = zoom_blur(place(out[j], s, focus, (W / 2 + (focus[0] - W / 2) * (1 - u), H / 2 + (focus[1] - H / 2) * (1 - u))), focus, 0.05 * u)
        i = place(inc[j], 1.06 - 0.06 * u, (W / 2, H * 0.42), (W / 2, H * 0.42))
        edge = -0.15 + 1.3 * ease(u)  # where the glint is
        seam = (1 - smoothstep(edge - 0.06, edge + 0.06, d))[..., None]  # behind the glint: the new shot
        f = o * (1 - seam) + i * seam
        glow = np.exp(-((d - edge) / 0.05) ** 2)[..., None]
        tint = np.float32([0.92, 0.98, 1.0])
        f = f + glow * tint * 0.85 * np.sin(np.pi * u) ** 0.6
        frames.append(np.clip(f, 0, 1))
    return frames


def match_cut(out, inc, n, fo, ro, fi, ri, pull_back=False):
    """Match cut on one object (here the ball of yarn): both shots move as one camera, the object kept in register.
    fo, ro / fi, ri: the object's centre and radius in each outgoing / incoming frame (lists, one per frame, as both
    cameras are moving). Moving in: the new shot grows out of the object. Pulling back: the old shot shrinks into it.
    A shot is shown only where it has picture, so a scaled-down frame never shows mirrored edges."""
    frames = []
    for j in range(n):
        u = (j + 1) / (n + 1); e = ease(u)
        (ox, oy), r_o, (ix, iy), r_i = fo[j], ro[j], fi[j], ri[j]
        c = (ox + (ix - ox) * e, oy + (iy - oy) * e)
        r = r_o * (r_i / r_o) ** e  # the object's radius on screen, eased in log space
        o, ov = place(out[j], r / r_o, (ox, oy), c, valid=True)
        i, iv = place(inc[j], r / r_i, (ix, iy), c, valid=True)
        dist = np.hypot(XX - c[0], YY - c[1])
        if pull_back:  # the dark space around the objects opens onto the new shot first; the bright objects go last
            lum = o @ np.float32([0.2126, 0.7152, 0.0722])
            th = 0.05 + 0.95 * e ** 1.3
            keep = smoothstep(th - 0.08, th + 0.08, lum) * (1 - smoothstep(0.75, 1.0, u))
            keep = keep[..., None] * ov
        else:  # the new shot is an opening window out of the object
            win = r * (1.1 + 8 * e ** 1.4)
            keep = smoothstep(win * 0.6, win, dist)[..., None]
            keep = 1 - (1 - keep) * iv  # where the new shot has no picture yet, the old one stays
        frames.append(o * keep + i * (1 - keep))
    return frames


def ball(a, near):
    """The ball of yarn in the close shot, where it stands alone: the largest round golden blob near the point."""
    hsv = cv2.cvtColor(np.clip(a * 255, 0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV)
    m = cv2.inRange(hsv, (8, 60, 70), (35, 255, 255))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    n, _, st, cen = cv2.connectedComponentsWithStats(m)
    k = min(range(1, n), key=lambda k: np.hypot(*(cen[k] - near)) - st[k][4] / 500)
    x, y, w, h, _ = st[k]
    return (float(cen[k][0]), float(cen[k][1])), (w + h) / 4


def culm_from(a):
    """A defocused bamboo culm, cut from the grove's own foreground and widened, for the occluder wipe."""
    strip = a[:, int(W * 0.115):int(W * 0.185)]  # a dark culm in the grove's left foreground
    wide = cv2.resize(strip, (int(W * 0.34), H), interpolation=cv2.INTER_CUBIC)
    wide = cv2.GaussianBlur(wide * np.float32([0.55, 0.62, 0.5]), (0, 0), 14)
    xs = np.linspace(-1, 1, wide.shape[1], dtype=np.float32)
    alpha = np.clip(1.15 - xs ** 6, 0, 1)[None, :].repeat(H, 0)
    return np.dstack([wide, alpha])


# ------------------------------------------------------------------ cut the journey
JOINS = {  # into shot k: how, frames
    1: ('occluder', 8), 2: ('glint', 8), 3: ('match', 8), 4: ('pull', 10),
}
SR = 48000


def audio(clip, a, b):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-to', str(b), '-i', clip, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def crossfade(x, y, n):
    """Join y onto x over n samples, equal power."""
    n = min(n, len(x), len(y))
    u = np.linspace(0, 1, n, dtype=np.float32)[:, None]
    mid = x[-n:] * np.cos(u * np.pi / 2) + y[:n] * np.sin(u * np.pi / 2)
    return np.concatenate([x[:-n], mid, y[n:]])


def mp3(x, path, kbps):
    pcm = np.clip(x, -1, 1).astype(np.float32).tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-b:a', f'{kbps}k', path], input=pcm, check=True)


frames, starts, joins = [], {}, {}
track, times = np.zeros((0, 2), np.float32), []  # the soundtrack, and each frame's start time in it
with tempfile.TemporaryDirectory() as tmp:
    culm = None
    for k, (name, clip, a, b, fps, boxes) in enumerate(SHOTS):
        d = os.path.join(tmp, name); os.mkdir(d)
        seg = extract(clip, a, b, fps, d)
        clip_t = [a + i / fps for i in range(len(seg))]
        if boxes: seg = [blur_out(im, boxes(t), 1.0 if name in ('dome', 'showroom') else 0.62) for im, t in zip(seg, clip_t)]
        seg = [arr(im) for im in seg]
        if name == 'grove': culm = culm_from(seg[-1])
        sound = audio(clip, a, b)
        if frames:  # the new shot's sound starts under the join, reaching its frame n as the join ends
            n = JOINS[k][1]
            lead = int(round(n / fps * SR))
            t_in = len(track) / SR - n / fps
            track = crossfade(track, sound, lead)
            times += [round(t_in + i / fps, 4) for i in range(n, len(seg))]
        else:
            track = sound
            times += [round(i / fps, 4) for i in range(len(seg))]
        if frames:
            how, n = JOINS[k]
            out, inc = frames[-n:], seg[:n]
            if how == 'occluder': mixed = occluder_wipe(out, inc, n, culm)
            elif how == 'glint': mixed = glint_wipe(out, inc, n, focus=(W * 0.75, H * 0.45))
            elif how == 'match':  # the hall's yarn ball (measured); the close shot's, found per frame (it drifts right)
                mixed = match_cut(out, inc, n, fo=[(645 + 20 * k / (n - 1), 335 - 20 * k / (n - 1)) for k in range(n)], ro=[125 + 25 * k / (n - 1) for k in range(n)], fi=[ball(f, (300, 312)) [0] for f in inc], ri=[ball(f, (300, 312))[1] for f in inc])
            else:  # the close shot's yarn (found per frame); the dome's, measured
                mixed = match_cut(out, inc, n, fo=[ball(f, (400, 310))[0] for f in out], ro=[ball(f, (400, 310))[1] for f in out], fi=[(371, 331)] * n, ri=[92] * n, pull_back=True)
            frames[-n:] = mixed
            joins[name] = [len(frames) - n, len(frames) - 1]
            seg = seg[n:]
            starts[name] = len(frames) - n
        else:
            starts[name] = 0
        frames += seg

for sub in ('d', 'm'):
    out = os.path.join(ROOT, 'assets', 'film', sub)
    os.makedirs(out, exist_ok=True)
    for f in glob.glob(os.path.join(out, '*.webp')): os.remove(f)
for i, a in enumerate(frames, 1):
    im = img(a)
    im.save(os.path.join(ROOT, 'assets/film/d', f'{i:03d}.webp'), quality=72, method=6)
    x = (im.width - 405) // 2
    im.crop((x, 0, x + 405, H)).save(os.path.join(ROOT, 'assets/film/m', f'{i:03d}.webp'), quality=72, method=6)
assert len(times) == len(frames), (len(times), len(frames))
for i in range(1, len(times)): times[i] = max(times[i], round(times[i - 1] + 0.001, 4))  # strictly later, frame by frame
mp3(track, os.path.join(ROOT, 'assets/film/sound.mp3'), 128)
# the bed: three steady passages in C (the hall's pad, the dome's opening, the close shot), joined, then made seamless
bed = audio(HALL, 5.9, 9.9)
for clip, a, b in ((DOME, 10.3, 13.2), (STUDIO, 13.1, 15.6)): bed = crossfade(bed, audio(clip, a, b), int(0.6 * SR))
loop = int(0.8 * SR)  # seamless: the bed's end is faded into its start, and the loop restarts just after that blend
u = np.linspace(0, 1, loop, dtype=np.float32)[:, None]
bed = np.concatenate([bed[-loop:] * np.cos(u * np.pi / 2) + bed[:loop] * np.sin(u * np.pi / 2), bed[loop:-loop]])
mp3(bed, os.path.join(ROOT, 'assets/film/bed.mp3'), 96)
with open(os.path.join(ROOT, 'assets/film/film.json'), 'w') as f:
    json.dump({'frames': len(frames), 'shots': starts, 'joins': joins, 'time': times, 'sound': round(len(track) / SR, 3)}, f, separators=(',', ':'))
print(f'{len(frames)} frames; shots {starts}; joins {joins}; soundtrack {len(track) / SR:.2f} s; bed {len(bed) / SR:.2f} s')
print('now run: python3 tools/trace-film.py, then node tools/stamp.mjs (a new film gets a new version tag)')
