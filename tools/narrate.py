# Records every line the site's narrator speaks in one voice, then checks each recording against its script.
# Voice: Kokoro-82M (Apache-2.0), run locally with kokoro-onnx: no account, no API key, nothing leaves the machine.
#   python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile faster-whisper
#   curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
#   curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
#   .venv/bin/python tools/narrate.py <dir with the two model files> . <scratch dir for .wav> hm_psi
# The site's narrator is hm_psi (an Indian English male voice, en-gb phonemes, speed 0.9: every word heard back). The three
# family stories are not recorded here: they are the ElevenLabs storyteller "Moksh" (story-*.wav is written for comparison only).
# Reads the lines from the page itself (index.html: each chapter's .say; site.js: DETAILS and STORIES), writes
# <scratch>/<name>.wav, prints for each how many of its words Whisper (base.en) heard back, then encode to
# assets/voice/<name>.mp3 (48 kHz mono 64 kbps, mean -20 dB; stories as bamboo/fibre/bark.mp3) and run tools/stamp.mjs.
import re, sys, json, subprocess, pathlib
from kokoro_onnx import Kokoro
import soundfile as sf
import numpy as np
from faster_whisper import WhisperModel
model_dir, repo, out, voice = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]), sys.argv[4]
html, js = (repo / 'index.html').read_text(), (repo / 'site.js').read_text()
lines = {}
for key, text in re.findall(r'data-ch="([a-z]+)"[^>]*>.*?<p class="say">(.*?)</p>', html, re.S): lines[f'ch-{key}'] = text
for key, text in re.findall(r"^\s+(bamboo|fibre|bark): \{ (?:src: '[^']*', )?say: '(.*?)' \}", js, re.M): lines[f'detail-{key}'] = text
for key, text in re.findall(r"^\s+(bamboo|fibre|bark): \{ src: '[^']*', text: '(.*?)' \}", js, re.M): lines[f'story-{key}'] = text
k = Kokoro(f'{model_dir}/kokoro-v1.0.onnx', f'{model_dir}/voices-v1.0.bin')
asr = WhisperModel('base.en', device='cpu', compute_type='int8')
norm = lambda s: re.sub(r'[^a-z ]', ' ', s.lower().replace('sb', 'sb ')).split()
report = {}
for name, text in lines.items():
    s, sr = k.create(text.replace('SB Trading', 'S B Trading'), voice=voice, speed=0.9 if voice.startswith('h') else 0.92, lang='en-gb' if voice[0] in 'bh' else 'en-us')
    wav = out / f'{name}.wav'; sf.write(wav, s, sr)
    a16 = np.interp(np.linspace(0, len(s) - 1, int(len(s) * 16000 / sr)), np.arange(len(s)), s).astype(np.float32)
    heard = ' '.join(seg.text for seg in asr.transcribe(a16, beam_size=1)[0])
    want, got = norm(text), set(norm(heard.replace('S.B.', 'sb').replace('SB', 'sb')))
    miss = [w for w in want if w not in got and len(w) > 2]
    report[name] = {'secs': round(len(s) / sr, 1), 'match': round(1 - len(miss) / max(1, len(want)), 2), 'missing': miss[:6]}
print(json.dumps(report, indent=0))
