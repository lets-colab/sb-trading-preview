// SB Trading · connecting fibre thread that runs through the page.
// A subtle, animated thread of banana fibre colour that visually ties the page together.

export function createFibreThread(width, height, frame, fps = 30) {
  const t = (frame / fps) * 0.5; // slow the animation
  const threadColor = 'rgba(200, 180, 130, 0.4)';
  const glowColor = 'rgba(200, 180, 130, 0.15)';

  // Create a meandering path that flows through the page
  const pathPoints = [];
  for (let y = 0; y <= height; y += height / 10) {
    const x = width * 0.5 + Math.sin((y / height) * Math.PI * 2 + t) * width * 0.15;
    pathPoints.push([x, y]);
  }

  const pathD = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
         xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0; pointer-events: none;">
      <defs>
        <filter id="threadGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="coloredBlur"/>
          <feComponentTransfer in="coloredBlur" result="coloredBlur">
            <feFuncA type="linear" slope="0.5"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="threadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${threadColor}" stop-opacity="0.1"/>
          <stop offset="50%" stop-color="${threadColor}" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="${threadColor}" stop-opacity="0.1"/>
        </linearGradient>
      </defs>

      <!-- Glow halo (thicker, more transparent) -->
      <path d="${pathD}" stroke="${glowColor}" stroke-width="8" fill="none"
            stroke-linecap="round" filter="url(#threadGlow)" opacity="0.4"/>

      <!-- Main thread -->
      <path d="${pathD}" stroke="url(#threadGradient)" stroke-width="2" fill="none"
            stroke-linecap="round" opacity="0.8"/>

      <!-- Sparkle highlights (subtle, timed) -->
      ${pathPoints.map((p, i) => {
        const pulse = Math.sin(t * 2 + i * 0.5) * 0.5 + 0.5;
        return `<circle cx="${p[0]}" cy="${p[1]}" r="${pulse}" fill="${threadColor}" opacity="${pulse * 0.4}"/>`;
      }).join('')}
    </svg>
  `;

  return svg;
}
