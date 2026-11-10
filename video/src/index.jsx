// SB Trading — brand film (Remotion). Real logo and product photographs only; copy from the site's own catalogue.
// Compositions: SBFilm16x9 (1920×1080) and SBFilm9x16 (1080×1920), 15 s at 30 fps.
import React from 'react';
import {
  AbsoluteFill, Composition, Img, Sequence, interpolate, registerRoot, spring, staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';

const C = { ink: '#102a43', blue: '#004a98', cloud: '#f3f8fc', mist: '#dbeaf6', fibre: '#d7be93' };
const out = Easing.bezier(0.16, 1, 0.3, 1);
const fonts = `
@font-face{font-family:"Instrument Serif";src:url(${staticFile('instrument-serif-latin-400-normal.woff2')}) format("woff2")}
@font-face{font-family:"Instrument Serif";font-style:italic;src:url(${staticFile('instrument-serif-latin-400-italic.woff2')}) format("woff2")}
@font-face{font-family:"Plus Jakarta Sans";src:url(${staticFile('plus-jakarta-sans-latin-wght-normal.woff2')}) format("woff2");font-weight:200 800}`;
const serif = '"Instrument Serif", Georgia, serif', sans = '"Plus Jakarta Sans", system-ui, sans-serif';

/** The golden fibre thread: an SVG path drawn by progress p (0–1), optionally converging to the centre. */
const Thread = ({ p, opacity = 1, wave = 0, at = 0.5 }) => {
  const { width, height } = useVideoConfig();
  const y = height * at, a = height * 0.18 * (1 - wave);
  const d = `M ${-40} ${y + a} C ${width * 0.25} ${y - a * 2}, ${width * 0.4} ${y + a * 2}, ${width * 0.5} ${y} S ${width * 0.75} ${y - a * 2}, ${width + 40} ${y - a}`;
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity }}>
      {[0, 1, 2].map((k) => (
        <path key={k} d={d} fill="none" stroke={C.fibre} strokeWidth={k === 0 ? 2.4 : 1} strokeOpacity={k === 0 ? 0.95 : 0.4}
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} transform={`translate(0 ${(k - 1) * 14 * (1 - wave)})`} />
      ))}
    </svg>
  );
};

const Kicker = ({ children, color = C.fibre }) => (
  <div style={{ font: `600 ${26}px/1.2 ${sans}`, letterSpacing: '0.22em', textTransform: 'uppercase', color, marginBottom: 22 }}>{children}</div>
);

// ---------------------------------------------------------------- scene 1: thread and logo
const Arrive = () => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig();
  const draw = interpolate(f, [0, 55], [0, 1], { extrapolateRight: 'clamp', easing: out });
  const logo = spring({ frame: f - 28, fps, config: { damping: 18, mass: 0.9 } });
  const text = interpolate(f, [48, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: out });
  const exit = interpolate(f, [78, 90], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const size = Math.min(width, height) * 0.26;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(70% 60% at 50% 45%, #173a5c, ${C.ink})`, opacity: exit }}>
      <Thread p={draw} opacity={0.9} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ width: size, height: size, borderRadius: '50%', background: C.cloud, display: 'grid', placeItems: 'center', transform: `scale(${logo})`, boxShadow: `0 0 0 2px ${C.fibre}66, 0 40px 120px #000a` }}>
          <Img src={staticFile('sb-trading-logo.png')} style={{ width: size * 0.82, height: size * 0.82, objectFit: 'contain' }} />
        </div>
        <div style={{ marginTop: 44, opacity: text, transform: `translateY(${(1 - text) * 20}px)`, textAlign: 'center' }}>
          <Kicker>Forestry &amp; agricultural products</Kicker>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scenes 2–4: materials
const Material = ({ img, kicker, title, accent, detail, from = 'left' }) => {
  const f = useCurrentFrame(), { width, height } = useVideoConfig(), dur = 80;
  const wipe = interpolate(f, [0, 16], [0, 100], { extrapolateRight: 'clamp', easing: out });
  const zoom = interpolate(f, [0, dur], [1.12, 1.0]);
  const pan = interpolate(f, [0, dur], from === 'left' ? [-2, 2] : [2, -2]);
  const t = interpolate(f, [10, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: out });
  const portrait = height > width;
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)`, background: C.ink }}>
      <Img src={staticFile(img)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom}) translateX(${pan}%)` }} />
      <AbsoluteFill style={{ background: `linear-gradient(${portrait ? '0deg' : '90deg'}, ${C.ink}f2 0%, ${C.ink}b3 38%, ${C.ink}00 72%)` }} />
      <div style={{ position: 'absolute', left: portrait ? 70 : 120, right: 70, bottom: portrait ? 260 : 140, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
        <Kicker>{kicker}</Kicker>
        <div style={{ font: `400 ${portrait ? 130 : 150}px/0.95 ${serif}`, color: C.cloud }}>
          {title} <span style={{ fontStyle: 'italic', color: C.fibre }}>{accent}</span>
        </div>
        <div style={{ font: `400 34px/1.4 ${sans}`, color: C.mist, marginTop: 26 }}>{detail}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: C.fibre, transform: `translateX(${(wipe / 100) * width}px)`, opacity: wipe < 100 ? 1 : 0 }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 5: end card
const Enquire = () => {
  const f = useCurrentFrame();
  const thread = interpolate(f, [0, 40], [0, 1], { extrapolateRight: 'clamp', easing: out });
  const t = interpolate(f, [14, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: out });
  const fade = interpolate(f, [100, 120], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: C.ink, opacity: fade }}>
      <Thread p={1} wave={thread} opacity={0.5} at={0.86} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 80, opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>
        <Kicker>SB Trading</Kicker>
        <div style={{ font: `400 140px/0.95 ${serif}`, color: C.cloud }}>Materials in <span style={{ fontStyle: 'italic', color: C.fibre }}>motion.</span></div>
        <div style={{ marginTop: 46, display: 'inline-block', padding: '22px 44px', borderRadius: 999, background: C.fibre, color: C.ink, font: `600 34px/1 ${sans}` }}>Request a quotation</div>
        <div style={{ marginTop: 30, font: `500 30px/1 ${sans}`, color: C.mist, letterSpacing: '0.04em' }}>sb-trading.lastbenchbd.com</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Film = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <style>{fonts}</style>
    <Sequence durationInFrames={90}><Arrive /></Sequence>
    <Sequence from={90} durationInFrames={80}><Material img="bamboo-poles.webp" kicker="Bamboo · four product types" title="Bamboo," accent="cut to length." detail="Poles, splits, ski poles and woven mats." /></Sequence>
    <Sequence from={170} durationInFrames={80}><Material img="banana-fibre.webp" kicker="Banana fibre yarn · three grades" title="Fibre with a" accent="twist." detail="From fine banana silk to industrial yarn." from="right" /></Sequence>
    <Sequence from={250} durationInFrames={80}><Material img="banana-leaves.webp" kicker="Banana bark & leaves" title="Leaves and" accent="bark." detail="From the banana plant, packed for buyers." /></Sequence>
    <Sequence from={330} durationInFrames={120}><Enquire /></Sequence>
  </AbsoluteFill>
);

const Root = () => (
  <>
    <Composition id="SBFilm16x9" component={Film} durationInFrames={450} fps={30} width={1920} height={1080} />
    <Composition id="SBFilm9x16" component={Film} durationInFrames={450} fps={30} width={1080} height={1920} />
  </>
);
registerRoot(Root);
