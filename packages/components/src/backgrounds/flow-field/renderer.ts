// Faithful canvas port of the "Flow Field with Particle Trails" sketch
// (radiant-shaders.com / github.com/pbakaus/radiant, `static/flow-field.html`),
// repainted as a Motion Canvas canvas-draw background.
//
// Painting model: the original accumulated trails by fading an overlay rect
// (rgba(10,10,10,0.03)) over a persistent canvas. A single repaint can't
// accumulate, so this renderer instead draws, every frame, each particle trail
// as the last `trailFrames` positions of a determined integration, alpha-decayed
// with the reference's exp(0.03·age) fade. Both playback and any seek rebuild
// the exact same trails for a given virtual time.
import type { Background } from "@moliniani/core";

export interface FlowFieldValues {
  color0: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  brightness: number;
  noiseScale: number;
  particleCount: number;
  speed: number;
  trailFrames: number;
}

const TAU = Math.PI * 2;

// Frames a particle lives after spawning before it respawns elsewhere.
// Mirrors the original: particles are never killed, they just respawn at a
// random spot once they drift off screen — a fixed lifetime is the same idea
// but deterministic, so seeking reproduces it exactly.
const LIFE = 120;

// Per-frame trail fade, matching the original's rgba(10,10,10,0.03) overlay.
const FADE = 0.03;

// The original's 7 warm palette stops (amber/gold/coral family).
const DEFAULT_PALETTE: readonly [number, number, number][] = [
  [200, 149, 108], // amber
  [212, 165, 116], // gold
  [224, 120, 80], // coral
  [190, 130, 90], // dark amber
  [230, 180, 140], // light gold
  [210, 100, 70], // deep coral
  [180, 160, 120], // muted gold
];

// ── Value noise (hash-based), the cheap stand-in for the reference's simplex
// noise. Same 3D-in/time design; the flow field looks equivalent here.
function fract(value: number): number {
  return value - Math.floor(value);
}

function hash3(x: number, y: number, z: number): number {
  const px = fract(x * 443.897);
  const py = fract(y * 441.423);
  const pz = fract(z * 437.195);
  const d = px * (py + 19.19) + py * (pz + 19.19) + pz * (px + 19.19);
  const ux = px + d;
  const uy = py + d;
  const uz = pz + d;
  return fract((ux + uy) * uz);
}

function valueNoise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const a = mix(
    mix(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), ux),
    mix(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), ux),
    uy,
  );
  const b = mix(
    mix(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), ux),
    mix(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), ux),
    uy,
  );
  return mix(a, b, uz) * 2 - 1; // 0..1 -> -1..1
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Deterministic randoms ────────────────────────────────
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function spawnSeed(i: number, epoch: number): number {
  return (Math.imul(i + 1, 2654435761) ^ Math.imul(epoch + 1, 40503)) >>> 0;
}

// The reference draws particles in CSS-pixel space (0..W, 0..H) and samples
// noise at p*NOISE_SCALE. The painter translates into that same panel space, so
// spawns, sizes and noiseScale all keep the reference's literal meaning.
function spawnPoint(i: number, epoch: number, w: number, h: number): [number, number] {
  const rnd = mulberry32(spawnSeed(i, epoch));
  return [rnd() * w, rnd() * h];
}

function particleTraits(i: number): {
  vMin: number;
  alpha: number;
  size: number;
  offset: number;
} {
  const rnd = mulberry32(Math.imul(i + 1, 2654435761) >>> 1);
  return {
    vMin: 0.4 + rnd() * 1.0, // per-particle speed 0.4..1.4
    alpha: 0.15 + rnd() * 0.55, // 0.15..0.7
    size: 0.5 + rnd() * 1.5, // 0.5..2 px
    offset: Math.floor(rnd() * LIFE),
  };
}

// ── Palette lookup (same interpolation as the original's getColor) ──
function paletteStop(values: FlowFieldValues, i: number): [number, number, number] {
  if (i < 1 || i > 7)
    return DEFAULT_PALETTE[(i - 1 + DEFAULT_PALETTE.length) % DEFAULT_PALETTE.length];
  return parseCssColor((values as unknown as Record<string, string>)[`color${i}`] as string);
}

function getColor(value: number, values: FlowFieldValues): [number, number, number] {
  const t = (value + 1) * 0.5; // map [-1,1] to 0..1
  const idx = t * 6;
  const lower = Math.min(Math.floor(idx), 6);
  const frac = idx - lower;
  const a = paletteStop(values, lower + 1);
  const b = paletteStop(values, Math.min(lower + 2, 7));
  return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, a[2] + (b[2] - a[2]) * frac];
}

function parseCssColor(input: string): [number, number, number] {
  const s = input.trim();
  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    const n = parseInt(hex.slice(0, 6), 16);
    if (Number.isFinite(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return [255, 255, 255];
}

// ── Per-particle trail state ─────────────────────────────
interface Particle {
  vMin: number;
  alpha: number;
  size: number;
  offset: number;
  // Number of ring entries (the last `trailFrames + 1` positions).
  cap: number;
  // Ring buffer of the last positions (interleaved x,y) and the palette color
  // carried with each position.
  path: Float64Array;
  red: Float32Array;
  green: Float32Array;
  blue: Float32Array;
  next: number;
  count: number;
}

interface RunnerState {
  frame: number | null;
  key: string;
  capacity: number;
  particles: Particle[];
}

const stateByNode = new WeakMap<Background, RunnerState>();

function makeParticle(capacity: number, index: number): Particle {
  const traits = particleTraits(index);
  return {
    vMin: traits.vMin,
    alpha: traits.alpha,
    size: traits.size,
    offset: traits.offset,
    cap: capacity,
    path: new Float64Array(capacity * 2),
    red: new Float32Array(capacity),
    green: new Float32Array(capacity),
    blue: new Float32Array(capacity),
    next: 0,
    count: 0,
  };
}

interface SimOptions {
  noiseScale: number;
  speed: number;
  brightness: number;
  w: number;
  h: number;
}

// Walks a particle forward from its spawn over `age` frame-steps and fills its
// trail ring with the last (trail+1) positions. Returns the current position.
function simulateParticle(
  p: Particle,
  index: number,
  epoch: number,
  age: number,
  capacity: number,
  spawnFrame: number,
  opts: SimOptions,
  values: FlowFieldValues,
): void {
  const [sx, sy] = spawnPoint(index, epoch, opts.w, opts.h);
  let x = sx;
  let y = sy;
  const vel = p.vMin * opts.speed;
  const scale = opts.noiseScale;
  const keepFrom = Math.max(0, age - (capacity - 1));
  p.next = 0;
  p.count = 0;

  for (let s = 0; s < age; s++) {
    const frameIndex = spawnFrame + s;
    const z = 0.0008 * frameIndex;
    const angle = valueNoise3(x * scale, y * scale, z) * TAU;
    if (s >= keepFrom) {
      const col = getColor(
        valueNoise3(x * scale * 1.5 + 100, y * scale * 1.5 + 100, z * 0.5),
        values,
      );
      pushPos(p, x, y, col);
    }
    const dx = Math.cos(angle) * vel;
    const dy = Math.sin(angle) * vel;
    x += dx;
    y += dy;
  }
  if (age > 0) {
    const z = 0.0008 * (spawnFrame + age);
    const col = getColor(
      valueNoise3(x * scale * 1.5 + 100, y * scale * 1.5 + 100, z * 0.5),
      values,
    );
    pushPos(p, x, y, col);
  } else {
    pushPos(p, x, y, [0, 0, 0]);
  }
}

function advanceParticle(
  p: Particle,
  frameIndex: number,
  opts: SimOptions,
  values: FlowFieldValues,
): void {
  const lastIdx = (p.next - 1 + p.cap) % p.cap;
  let x = p.path[lastIdx * 2];
  let y = p.path[lastIdx * 2 + 1];
  const z = 0.0008 * frameIndex;
  const scale = opts.noiseScale;
  const angle = valueNoise3(x * scale, y * scale, z) * TAU;
  const vel = p.vMin * opts.speed;
  const col = getColor(valueNoise3(x * scale * 1.5 + 100, y * scale * 1.5 + 100, z * 0.5), values);
  x += Math.cos(angle) * vel;
  y += Math.sin(angle) * vel;
  pushPos(p, x, y, col);
}

function pushPos(p: Particle, x: number, y: number, col: [number, number, number]): void {
  p.path[p.next * 2] = x;
  p.path[p.next * 2 + 1] = y;
  p.red[p.next] = col[0];
  p.green[p.next] = col[1];
  p.blue[p.next] = col[2];
  p.next = (p.next + 1) % p.cap;
  p.count = Math.min(p.count + 1, p.cap);
}

// ── Public entry ─────────────────────────────────────────
export function renderFlowTrails(
  context: CanvasRenderingContext2D,
  time: number,
  fps: number,
  values: FlowFieldValues,
  node: Background,
): void {
  let state = stateByNode.get(node);

  const w = node.width();
  const h = node.height();
  if (w <= 0 || h <= 0) return;

  const frame = Math.max(0, Math.round(time * fps));
  const count = Math.max(1, Math.floor(values.particleCount));
  const capacity = Math.max(2, Math.floor(values.trailFrames) + 1);
  const key = JSON.stringify([
    values.noiseScale,
    values.speed,
    values.trailFrames,
    values.particleCount,
    values.brightness,
  ]);

  if (!state) {
    state = { frame: null, key: "", capacity, particles: [] };
    stateByNode.set(node, state);
  }

  const opts: SimOptions = {
    noiseScale: values.noiseScale,
    speed: values.speed,
    brightness: values.brightness,
    w,
    h,
  };

  // Grow / resize the particle pool deterministically (index-based traits).
  if (state.particles.length < count || state.capacity !== capacity) {
    const nextParticles: Particle[] = Array.from({ length: count });
    for (let i = 0; i < count; i++) {
      const existing = state.particles[i];
      nextParticles[i] =
        existing && existing.path.length === capacity * 2 ? existing : makeParticle(capacity, i);
    }
    state.particles = nextParticles;
    state.capacity = capacity;
    state.key = "";
  }

  const propChanged = state.key !== key;
  const contiguous = !propChanged && state.frame !== null && frame === state.frame + 1;
  const sameFrame = !propChanged && state.frame === frame;

  if (!sameFrame) {
    for (let i = 0; i < count; i++) {
      const p = state.particles[i]!;
      const total = frame + p.offset;
      const epoch = Math.floor(total / LIFE);
      const age = ((total % LIFE) + LIFE) % LIFE;
      if (contiguous) {
        const prevTotal = state.frame! + p.offset;
        const prevAge = ((prevTotal % LIFE) + LIFE) % LIFE;
        if (age === prevAge + 1 && Math.floor(prevTotal / LIFE) === epoch) {
          advanceParticle(p, frame, opts, values);
          continue;
        }
      }
      const spawnFrame = epoch * LIFE - p.offset;
      simulateParticle(p, i, epoch, age, capacity, spawnFrame, opts, values);
    }
    state.key = key;
    state.frame = frame;
  }

  // Paint: base backdrop, then each trail as decaying segments.
  context.fillStyle = values.color0;
  context.fillRect(-w / 2, -h / 2, w, h);
  context.translate(-w / 2, -h / 2);

  context.lineCap = "round";
  context.lineJoin = "round";

  for (let i = 0; i < count; i++) {
    const p = state.particles[i]!;
    const total = p.count;
    if (total < 2) continue;
    const start = p.count >= p.cap ? p.next : 0;
    for (let k = 0; k < total - 1; k++) {
      const i0 = (start + k) % p.cap;
      const i1 = (start + k + 1) % p.cap;
      const segAge = total - 2 - k;
      const alpha = p.alpha * opts.brightness * Math.exp(-FADE * segAge);
      if (alpha < 0.015) continue;
      const x0 = p.path[i0 * 2];
      const y0 = p.path[i0 * 2 + 1];
      const x1 = p.path[i1 * 2];
      const y1 = p.path[i1 * 2 + 1];
      context.globalAlpha = alpha;
      context.strokeStyle = `rgba(${p.red[i1]!}, ${p.green[i1]!}, ${p.blue[i1]!}, 1)`;
      context.lineWidth = p.size;
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.stroke();
    }
  }
  context.globalAlpha = 1;
}
