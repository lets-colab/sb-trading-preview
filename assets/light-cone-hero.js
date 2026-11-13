// SB Trading · hero specimen in a light cone for the opening.
// Renders as an SVG with radial gradients creating the cone effect,
// then a specimen silhouette in the center with depth layering.

export function createLightConeHero(width, height, specimen = 'bamboo') {
  const cx = width / 2, cy = height * 0.4;
  const coneRadius = Math.max(width, height) * 0.35;
  const coneStops = [
    { offset: '0%', color: 'rgba(255, 220, 180, 0.3)' },
    { offset: '30%', color: 'rgba(200, 180, 160, 0.15)' },
    { offset: '100%', color: 'rgba(100, 120, 150, 0)' },
  ];

  const specimenShapes = {
    bamboo: () => `
      <g transform="translate(${cx}, ${cy})">
        <!-- Bamboo pole silhouette -->
        <ellipse cx="0" cy="-40" rx="8" ry="60" fill="rgba(40, 60, 40, 0.4)" filter="url(#glow)"/>
        <rect x="-6" y="-30" width="12" height="20" fill="rgba(50, 70, 50, 0.5)"/>
        <rect x="-6" y="-5" width="12" height="20" fill="rgba(45, 65, 45, 0.45)"/>
        <rect x="-6" y="20" width="12" height="20" fill="rgba(40, 60, 40, 0.4)"/>
      </g>
    `,
    fibre: () => `
      <g transform="translate(${cx}, ${cy})">
        <!-- Banana fibre bundle silhouette -->
        <ellipse cx="0" cy="0" rx="12" ry="45" fill="rgba(80, 70, 50, 0.4)" filter="url(#glow)"/>
        <path d="M -8 -35 Q -12 -20 -10 0 Q -8 20 -5 40" stroke="rgba(100, 90, 60, 0.3)" stroke-width="3" fill="none"/>
        <path d="M 0 -40 Q 2 -20 3 5 Q 2 25 0 40" stroke="rgba(110, 100, 70, 0.35)" stroke-width="3" fill="none"/>
        <path d="M 8 -35 Q 12 -18 10 5 Q 8 22 5 40" stroke="rgba(100, 90, 60, 0.3)" stroke-width="3" fill="none"/>
      </g>
    `,
    leaf: () => `
      <g transform="translate(${cx}, ${cy})">
        <!-- Banana leaf silhouette -->
        <path d="M 0 -50 Q 20 -30 25 0 Q 20 30 0 50 Q -20 30 -25 0 Q -20 -30 0 -50"
              fill="rgba(60, 80, 40, 0.4)" filter="url(#glow)"/>
        <path d="M 0 -40 L 0 40" stroke="rgba(50, 70, 30, 0.3)" stroke-width="2" opacity="0.6"/>
      </g>
    `,
  };

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="lightCone" cx="50%" cy="40%" r="60%">
          ${coneStops.map((s, i) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('')}
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="haze" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
        </filter>
      </defs>

      <!-- Light cone background -->
      <circle cx="${cx}" cy="${cy}" r="${coneRadius}" fill="url(#lightCone)"/>

      <!-- Atmospheric haze layers -->
      <ellipse cx="${cx}" cy="${cy + 20}" rx="${coneRadius * 0.7}" ry="${coneRadius * 0.5}"
               fill="rgba(200, 180, 160, 0.08)" filter="url(#haze)"/>

      <!-- Specimen -->
      ${specimenShapes[specimen]?.() || specimenShapes.bamboo?.()}

      <!-- Depth haze -->
      <radialGradient id="depthHaze" cx="50%" cy="40%">
        <stop offset="0%" stop-color="rgba(40, 60, 100, 0)"/>
        <stop offset="100%" stop-color="rgba(40, 60, 100, 0.15)"/>
      </radialGradient>
      <circle cx="${cx}" cy="${cy}" r="${coneRadius}" fill="url(#depthHaze)"/>
    </svg>
  `;

  return svg;
}
