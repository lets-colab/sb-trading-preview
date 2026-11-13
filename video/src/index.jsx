// SB Trading film (Remotion), built from the site's own design system so it cannot drift from it:
//   colours  -> tokens.json, synced from DESIGN.md by sync-design.mjs (tests/film-sync.mjs checks it)
//   words    -> copy.json, every line the site's own copy (checked against index.html)
//   type     -> Gloock (names and statements) and Schibsted Grotesk (everything read or operated), the site's two voices
//   pictures -> the site's photographs drawn by the site's depth renderer (assets/photodepth.js), inside its arch window
//   sound    -> the site's generated score (assets/sound.js, seeded) rendered offline by render-score.mjs; each mallet
//               note leaves a ripple of light where it sounds, exactly as on the site
// Cue sheet at 30 fps, 480 frames (16 s): open 0-96, bamboo 96-204, banana fibre yarn 204-312, bark and leaves
// 312-408, end 408-480. Every scene settles into a readable composition and holds at least 2 s.
import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import {
  AbsoluteFill, Audio, Composition, Easing, Img, Sequence, continueRender, delayRender, interpolate, registerRoot,
  staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { createPhotoDepth } from '../../assets/photodepth.js';
import { createDustParticles, updateDustParticles } from '../../assets/dust-particles.js';
import { createLightConeHero } from '../../assets/light-cone-hero.js';
import { createFibreThread } from '../../assets/fibre-thread.js';
import tokens from './tokens.json';
import copy from './copy.json';
import notes from './score-notes.json';

const c = tokens.colors;
const FPS = 30;
const display = '"Gloock", Georgia, serif', text = '"Schibsted Grotesk", system-ui, sans-serif';
const out = Easing.bezier(0.16, 1, 0.3, 1), io = Easing.bezier(0.65, 0, 0.35, 1);
const ramp = (f, a, b, e = out) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });
const line = (s) => { if (!copy.lines.includes(s)) throw new Error(`not site copy: ${s}`); return s; };
const fonts = `
@font-face{font-family:"Gloock";src:url(${staticFile('fonts/gloock-latin-400-normal.woff2')}) format("woff2")}
@font-face{font-family:"Schibsted Grotesk";src:url(${staticFile('fonts/schibsted-grotesk-latin-wght-normal.woff2')}) format("woff2");font-weight:400 900}`;
const BASE = staticFile('img/bamboo-sections.webp').replace('bamboo-sections.webp', '');
const useWide = () => { const { width, height } = useVideoConfig(); return width > height; };

/** Holds the render until both of the site's typefaces have loaded. */
const Fonts = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => { Promise.all([document.fonts.load(`400 40px ${display}`), document.fonts.load(`500 30px ${text}`)]).then(() => continueRender(h)); }, [h]);
  return <style>{fonts}</style>;
};

/** One family's photographs drawn in depth by the site's renderer, deterministically per frame. */
const Depth = ({ fam, w, h, dur }) => {
  const f = useCurrentFrame(), ref = useRef(null), pd = useRef(null);
  const [handle] = useState(() => delayRender(`depth ${fam}`));
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    pd.current = createPhotoDepth(ref.current, { base: BASE, preserve: true });
    pd.current.setSize(w, h);
    pd.current.whenReady(fam).then(() => { setReady(true); continueRender(handle); });
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    const t = Math.min(1, f / dur);
    pd.current.render({ fam, t, pointer: [Math.sin(f / 38) * 0.22, Math.cos(f / 52) * 0.14], settle: true });
  }, [f, ready]);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
};

/** The site's arch window: rounded top, opens from the bottom, then leaves upward with a turn (as site.js does). */
const Arch = ({ fam, dur, w, h, style }) => {
  const f = useCurrentFrame();
  const open = ramp(f, 0, 33, io), leave = ramp(f, dur - 14, dur, io);
  const turn = (1 - open) * 16 - leave * 16;
  return (
    <div style={{ position: 'absolute', width: w, height: h, perspective: 1600, ...style }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: `999px 999px 28px 28px`, overflow: 'hidden',
        clipPath: `inset(${(1 - open) * 100}% 0 ${leave * 100}% 0 round 999px 999px 28px 28px)`,
        transform: `rotateY(${turn}deg) translateZ(${-(1 - open + leave) * 140}px)`,
        boxShadow: `0 40px 120px ${c['ink-0']}aa, 0 0 0 1px ${c.fibre}26`, background: c['ink-2'],
      }}>
        <Depth fam={fam} w={w} h={h} dur={dur} />
      </div>
    </div>
  );
};

/** A product chip, as on the site: pill, hairline, fibre "+". */
const Chip = ({ label, at }) => {
  const f = useCurrentFrame(), k = ramp(f, at, at + 14);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 22px', height: 52, borderRadius: 999,
      border: `1px solid ${c.line}`, background: `${c['ink-0']}66`, color: c.cloud, font: `500 22px/1 ${text}`,
      opacity: k, transform: `translateY(${(1 - k) * 14}px)` }}>
      {label}<span style={{ color: c.fibre }}>+</span>
    </div>
  );
};

/** Dust particles for the opening. */
const Dust = ({ frame, width, height }) => {
  const particles = createDustParticles(frame * 0.7, 60);
  const updated = updateDustParticles(particles, frame, FPS);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {updated.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `rgba(200, 180, 130, ${p.opacity * 0.3})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(200, 180, 130, ${p.opacity * 0.2})`,
            transform: `translate(-50%, -50%) scale(${0.5 + p.z * 0.5})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Light cone with hero specimen. */
const HeroObject = ({ frame, width, height }) => {
  const entry = ramp(frame, 0, 40);
  const heroCone = createLightConeHero(width, height, 'bamboo');
  return (
    <AbsoluteFill style={{ opacity: entry * 0.7, pointerEvents: 'none' }}>
      <div dangerouslySetInnerHTML={{ __html: heroCone }} />
    </AbsoluteFill>
  );
};

const Open = () => {
  const f = useCurrentFrame(), wide = useWide(), { width, height } = useVideoConfig();
  const mark = ramp(f, 0, 24), rule = ramp(f, 10, 44), head = ramp(f, 22, 50), lede = ramp(f, 38, 62), exit = ramp(f, 84, 96, io);
  const [a, b] = ['Materials', 'in Motion.'];
  if (`${a} ${b}` !== line('Materials in Motion.')) throw new Error('headline');
  return (
    <AbsoluteFill>
      {/* Background layers */}
      <HeroObject frame={f} width={width} height={height} />
      <Dust frame={f} width={width} height={height} />

      {/* Content */}
      <div style={{ padding: wide ? '0 150px' : '0 90px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', opacity: 1 - exit, transform: `translateY(${-exit * 30}px)` }}>
        <Img src={staticFile('img/sb-mark-light.webp')} style={{ width: 92, height: 'auto', opacity: mark, marginBottom: 46 }} />
        <div style={{ width: (wide ? 520 : width - 180) * rule, height: 2, background: c.fibre, opacity: 0.7, marginBottom: 46 }} />
        <div style={{ font: `400 ${wide ? 170 : 150}px/0.92 ${display}`, letterSpacing: '-0.015em', color: c.cloud, opacity: head, transform: `translateY(${(1 - head) * 40}px)` }}>
          {a} <span style={{ color: c.fibre }}>{b}</span>
        </div>
        <div style={{ maxWidth: 900, marginTop: 40, font: `400 ${wide ? 34 : 38}px/1.45 ${text}`, color: c.mist, opacity: lede, transform: `translateY(${(1 - lede) * 20}px)` }}>
          {line('Bamboo, banana fibre yarn, and banana bark and leaves, supplied to business buyers.')}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Family = ({ fam, title, lede, chips, dur }) => {
  const f = useCurrentFrame(), wide = useWide(), { width, height } = useVideoConfig();
  const t = ramp(f, 14, 40), exit = ramp(f, dur - 14, dur, io);
  const ah = wide ? 860 : 1000, aw = Math.round((ah * 73) / 120);
  return (
    <AbsoluteFill>
      <Arch fam={fam} dur={dur} w={aw} h={ah} style={wide ? { right: 190, top: (height - ah) / 2 } : { left: (width - aw) / 2, top: 150 }} />
      <div style={{ position: 'absolute', left: wide ? 150 : 90, right: wide ? aw + 330 : 90, top: wide ? undefined : ah + 230, bottom: wide ? 250 : undefined,
        opacity: t * (1 - exit), transform: `translateY(${(1 - t) * 34 - exit * 20}px)` }}>
        <div style={{ font: `400 ${wide ? 120 : 110}px/0.96 ${display}`, letterSpacing: '-0.015em', color: c.cloud }}>{line(title)}</div>
        <div style={{ marginTop: 28, maxWidth: 760, font: `400 ${wide ? 32 : 34}px/1.45 ${text}`, color: c.mist }}>{line(lede)}</div>
        <div style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: 12, maxWidth: 820 }}>
          {chips.map((ch, i) => <Chip key={ch} label={line(ch)} at={30 + i * 6} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const End = () => {
  const f = useCurrentFrame(), wide = useWide();
  const head = ramp(f, 0, 24), pill = ramp(f, 12, 34), mark = ramp(f, 20, 40);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 90 }}>
      <div style={{ font: `400 ${wide ? 150 : 130}px/0.95 ${display}`, letterSpacing: '-0.015em', color: c.cloud, opacity: head, transform: `translateY(${(1 - head) * 30}px)` }}>
        {line('Receive a quotation.')}
      </div>
      <div style={{ marginTop: 54, display: 'inline-flex', alignItems: 'center', height: 84, padding: '0 46px', borderRadius: 999, background: c.fibre, color: c['ink-0'],
        font: `600 34px/1 ${text}`, opacity: pill, transform: `translateY(${(1 - pill) * 20}px)` }}>
        {line('WhatsApp: +880 1878-707910')}
      </div>
      <Img src={staticFile('img/sb-mark-light.webp')} style={{ width: 70, height: 'auto', marginTop: 60, opacity: mark }} />
    </AbsoluteFill>
  );
};

/** Each score note leaves a ripple of light where it sounds (the site's .score-fx, frame-exact). */
const Ripples = () => {
  const f = useCurrentFrame(), { width, height } = useVideoConfig(), size = Math.min(width, height) * 0.26;
  return notes.map((n, i) => {
    const s = Math.round(n.at * FPS), k = (f - s) / 84;
    if (k < 0 || k > 1) return null;
    const op = (k < 0.14 ? k / 0.14 : 1 - (k - 0.14) / 0.86) * (0.35 + n.v * 0.55), sc = 0.18 + (1.5 - 0.18) * Easing.bezier(0.2, 0.7, 0.2, 1)(k);
    return <div key={i} style={{ position: 'absolute', left: n.x * width - size / 2, top: n.y * height - size / 2, width: size, height: size, borderRadius: '50%',
      opacity: op, transform: `scale(${sc})`, mixBlendMode: 'screen',
      background: `radial-gradient(circle, ${c['fibre-2']}59 0%, ${c.fibre}26 34%, transparent 62%)`, boxShadow: `inset 0 0 0 1px ${c['fibre-2']}33` }} />;
  });
};

/** Fibre thread that runs through the entire film. */
const FibreThread = ({ frame, width, height }) => {
  const svg = createFibreThread(width, height, frame, FPS);
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: svg }} />;
};

const Film = () => {
  const { durationInFrames, width, height } = useVideoConfig(), f = useCurrentFrame();
  const fadeIn = ramp(f, 0, 12), fadeOut = 1 - ramp(f, durationInFrames - 10, durationInFrames);
  const label = copy.labelled[0].text;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(90% 70% at 72% -10%, ${c['ink-2']}, ${c['ink-0']} 72%)` }}>
      <Fonts />
      <Audio src={staticFile('score.wav')} />
      <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
        <Ripples />
        <Sequence durationInFrames={96}><Open /></Sequence>
        <Sequence from={96} durationInFrames={108}><Family fam={0} dur={108} title="Bamboo" lede="Poles, splits, ski poles and woven mats." chips={['Bamboo poles', 'Bamboo splits', 'Ski poles', 'Woven mats']} /></Sequence>
        <Sequence from={204} durationInFrames={108}><Family fam={1} dur={108} title="Banana fibre yarn" lede="Banana fibre yarn in three grades, from fine banana silk to industrial yarn." chips={['Grade A: banana silk', 'Grade B: standard banana fibre yarn', 'Grade C: industrial banana fibre yarn']} /></Sequence>
        <Sequence from={312} durationInFrames={96}><Family fam={2} dur={96} title="Banana bark and leaves" lede="Banana bark and banana leaves, the third family of the range." chips={['Banana bark', 'Banana leaves']} /></Sequence>
        <Sequence from={408}><End /></Sequence>
        {/* Fibre thread overlay */}
        <FibreThread frame={f} width={width} height={height} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', right: 40, bottom: 36, padding: '10px 18px', borderRadius: 999, background: c.glass, border: `1px solid ${c['line-2']}`, color: c.dim, font: `400 20px/1.2 ${text}` }}>{label}</div>
    </AbsoluteFill>
  );
};

const Root = () => (
  <>
    <Composition id="SBFilm16x9" component={Film} durationInFrames={480} fps={FPS} width={1920} height={1080} />
    <Composition id="SBFilm9x16" component={Film} durationInFrames={480} fps={FPS} width={1080} height={1920} />
  </>
);
registerRoot(Root);
