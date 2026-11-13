// SB Trading · ambient dust particles for the opening scene.
// Uses seeded randomness so the particles are deterministic across renders.
export function createDustParticles(seed, count = 60) {
  const rng = (s) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const particles = [];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 0.1;
    particles.push({
      x: rng(s * 1.1) * 100,
      y: rng(s * 1.3) * 100,
      z: rng(s * 1.5),
      vx: (rng(s * 1.7) - 0.5) * 0.2,
      vy: (rng(s * 1.9) - 0.5) * 0.15,
      size: rng(s * 2.1) * 2 + 0.5,
      life: 0.3 + rng(s * 2.3) * 0.7,
    });
  }
  return particles;
}

export function updateDustParticles(particles, frame, fps = 30) {
  const t = frame / fps;
  return particles.map((p) => {
    const age = (t % (p.life * 2)) / (p.life * 2);
    const x = (p.x + p.vx * t * 30) % 100;
    const y = (p.y + p.vy * t * 30 + age * 20) % 100;
    const opacity = age < 0.5 ? age * 2 : (1 - age) * 2;
    return { ...p, x, y, opacity };
  });
}
