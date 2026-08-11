// Faithful canvas port of the "Kinetic Grid" sketch
// (radiant-shaders.com / github.com/pbakaus/radiant, `static/kinetic-grid.html`),
// repainted as a Motion Canvas canvas-draw background.
//
// Painting model: the reference keeps a 40x25 node grid on flat position/
// velocity arrays, connects horizontal/vertical neighbors with springs, fires a
// random edge "impulse" every 1.8/impulseRate seconds that ripples through the
// mesh, and accumulates glowing trails on a persistent canvas by fading a dark
// overlay (rgba(10,8,6,0.35)) every frame. A single repaint can't accumulate,
// so this renderer instead keeps a rolling ring of the last `trailFrames` node
// states and, every frame, composites the current neon pass together with K
// ghost passes weighted by the overlay's 0.65-per-frame retention — the same
// accumulated look, reproduced exactly for a given virtual time.
//
// Determinism: the physics steps once per playback frame (the reference never
// scales anything by dt — velocities integrate per frame), impulses are
// scheduled at deterministic frames via a per-impulse-index mulberry32 (edge,
// region, strength, interval jitter), and the impulse flashes / screen-flash /
// wavefront blooms are derived algebraically from that schedule. A seek drops
// the state and replays the simulation from frame 0 exactly; contiguous
// playback advances one step. Colors are render-only, so tweening them never
// invalidates the simulation.
import type { Background } from "@moliniani/core";

export interface KineticGridValues {
  lineColor0: string;
  lineColor1: string;
  lineColor2: string;
  lineColor3: string;
  lineColor4: string;
  nodeColor0: string;
  nodeColor1: string;
  nodeColor2: string;
  flashColor: string;
  backdrop: string;
  impulseRate: number;
  springTension: number;
  impulseForce: number;
  damping: number;
  returnForce: number;
  density: number;
  trailFrames: number;
}

// Grid dimensions the reference starts with (spacing is derived from panel
// size), scaled by the `density` prop.
const BASE_COLS = 40;
const BASE_ROWS = 25;

// Spring stiffness before `springTension` multiplies it (reference SPRING_K_BASE).
const SPRING_K_BASE = 0.12;

// Grid inset as a fraction of the panel, matching the reference's 6% margin.
const GRID_MARGIN = 0.06;

// Per-frame retention of the reference's rgba(10,8,6,0.35) trail overlay.
const GHOST_RETENTION = 0.65;

// Node speed above which the wavefront bloom halo appears (reference).
const WAVE_THRESHOLD = 3.0;

// Below this stroke/fill alpha a ghost pass is skipped (imperceptible).
const MIN_ALPHA = 0.015;

const WHITE: [number, number, number] = [255, 255, 255];

const TAU = 6.2831;

// ── Color helpers ───────────────────────────────────────
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

function rgba(c: [number, number, number], a: number): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// Connection-line ramp: the reference's five warm stops (dark rust -> fire
// orange -> white-hot) exposed as `lineColor0..4` at the same tension knots.
const LINE_KNOTS = [0, 0.3, 0.55, 0.8, 1];

function lineColor(values: KineticGridValues, tension: number): [number, number, number] {
  const stops = [
    parseCssColor(values.lineColor0),
    parseCssColor(values.lineColor1),
    parseCssColor(values.lineColor2),
    parseCssColor(values.lineColor3),
    parseCssColor(values.lineColor4),
  ];
  const t = Math.max(0, Math.min(1, tension));
  for (let i = 0; i < 4; i++) {
    if (t <= LINE_KNOTS[i + 1]) {
      const f = (t - LINE_KNOTS[i]) / (LINE_KNOTS[i + 1] - LINE_KNOTS[i]);
      return lerpColor(stops[i], stops[i + 1], f);
    }
  }
  return stops[4]!;
}

// Node-dot ramp: the reference's cool blue -> cyan -> near-white curve exposed
// as `nodeColor0..2` at the same brightness knots; past the last knot it still
// fades to white as the reference does.
function nodeColor(values: KineticGridValues, brightness: number): [number, number, number] {
  const c0 = parseCssColor(values.nodeColor0);
  const c1 = parseCssColor(values.nodeColor1);
  const c2 = parseCssColor(values.nodeColor2);
  const b = Math.max(0, Math.min(1, brightness));
  if (b < 0.25) return lerpColor(c0, c1, b / 0.25);
  if (b < 0.6) return lerpColor(c1, c2, (b - 0.25) / 0.35);
  return lerpColor(c2, WHITE, (b - 0.6) / 0.4);
}

// ── Deterministic randoms ───────────────────────────────
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Per-impulse RNG stream: every impulse index always draws the exact same
// params, so playback and any seek reproduce the identical wavefronts.
function impulseRng(k: number): () => number {
  return mulberry32(Math.imul(k + 1, 2654435761));
}

interface ImpulseParams {
  edge: number;
  region: number;
  start: number;
  strength: number;
  flashX: number;
  flashY: number;
  jitter: number;
}

interface Impulse extends ImpulseParams {
  k: number;
  frame: number;
}

// The reference's region/edge/strength randomness, in its draw order (edge,
// strength, region, start, then the jitter that shortens the *next* interval).
// Mouse impulses are stripped — only the autonomous edge impulses survive.
function impulseParams(
  k: number,
  force: number,
  cols: number,
  rows: number,
  spacingX: number,
  spacingY: number,
  marginX: number,
  marginY: number,
): ImpulseParams {
  const rnd = impulseRng(k);
  const edge = Math.floor(rnd() * 4);
  const strength = (22 + rnd() * 14) * force;
  const region = 4 + Math.floor(rnd() * 6);
  let start = 0;
  let flashX = 0;
  let flashY = 0;
  if (edge === 0) {
    start = Math.floor(rnd() * Math.max(1, cols - region));
    flashX = marginX + (start + region * 0.5) * spacingX;
    flashY = marginY;
  } else if (edge === 1) {
    start = Math.floor(rnd() * Math.max(1, rows - region));
    flashX = marginX + (cols - 1) * spacingX;
    flashY = marginY + (start + region * 0.5) * spacingY;
  } else if (edge === 2) {
    start = Math.floor(rnd() * Math.max(1, cols - region));
    flashX = marginX + (start + region * 0.5) * spacingX;
    flashY = marginY + (rows - 1) * spacingY;
  } else {
    start = Math.floor(rnd() * Math.max(1, rows - region));
    flashX = marginX;
    flashY = marginY + (start + region * 0.5) * spacingY;
  }
  const jitter = rnd();
  return { edge, region, start, strength, flashX, flashY, jitter };
}

// ── Simulation state ────────────────────────────────────
interface KineticState {
  frame: number | null;
  key: string;
  cols: number;
  rows: number;
  nodeCount: number;
  spacingX: number;
  spacingY: number;
  marginX: number;
  marginY: number;
  tensionScale: number;
  posX: Float32Array;
  posY: Float32Array;
  velX: Float32Array;
  velY: Float32Array;
  restX: Float32Array;
  restY: Float32Array;
  springs: number[];
  ringCap: number;
  ring: Float32Array;
  ringHead: number;
  ringCount: number;
  impulseIdx: number;
  nextImpulseFrame: number;
}

const stateByNode = new WeakMap<Background, KineticState>();

function buildGrid(
  s: KineticState,
  w: number,
  h: number,
  cols: number,
  rows: number,
  K: number,
): void {
  s.cols = cols;
  s.rows = rows;
  s.marginX = w * GRID_MARGIN;
  s.marginY = h * GRID_MARGIN;
  s.spacingX = (w - s.marginX * 2) / (cols - 1);
  s.spacingY = (h - s.marginY * 2) / (rows - 1);
  s.tensionScale = 1 / ((s.spacingX + s.spacingY) * 0.5 * 0.35);

  const n = cols * rows;
  s.nodeCount = n;
  if (!s.posX || s.posX.length < n) {
    s.posX = new Float32Array(n);
    s.posY = new Float32Array(n);
    s.velX = new Float32Array(n);
    s.velY = new Float32Array(n);
    s.restX = new Float32Array(n);
    s.restY = new Float32Array(n);
  }
  const cap = Math.max(2, K);
  s.ringCap = cap;
  if (!s.ring || s.ring.length < n * 4 * cap) s.ring = new Float32Array(n * 4 * cap);

  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = s.marginX + c * s.spacingX;
      const y = s.marginY + r * s.spacingY;
      s.restX[i] = x;
      s.restY[i] = y;
      s.posX[i] = x;
      s.posY[i] = y;
      s.velX[i] = 0;
      s.velY[i] = 0;
      i++;
    }
  }

  const springs: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * cols + c;
      if (c < cols - 1) springs.push(a, a + 1, s.spacingX);
      if (r < rows - 1) springs.push(a, a + cols, s.spacingY);
    }
  }
  s.springs = springs;
  s.ringHead = 0;
  s.ringCount = 0;
  s.impulseIdx = 0;
  s.nextImpulseFrame = 0;
  s.frame = null;
}

function pushSnapshot(s: KineticState): void {
  const cap = s.ringCap;
  s.ringHead = (s.ringHead + 1) % cap;
  s.ringCount = Math.min(s.ringCount + 1, cap);
  const slot = s.ringHead;
  const stride = 4 * cap;
  const n = s.nodeCount;
  for (let i = 0; i < n; i++) {
    const base = i * stride + slot * 4;
    s.ring[base] = s.posX[i];
    s.ring[base + 1] = s.posY[i];
    s.ring[base + 2] = s.velX[i];
    s.ring[base + 3] = s.velY[i];
  }
}

// Node states read as three raw numbers (x or y) to keep the heavy draw loops
// allocation-free: the caller switches on a string index (0=x,1=y,2=vx,3=vy).
function readNode(s: KineticState, slot: number, i: number, member: 0 | 1 | 2 | 3): number {
  return s.ring[i * 4 * s.ringCap + slot * 4 + member];
}

function applyEdgeImpulse(s: KineticState, imp: ImpulseParams): void {
  const strength = imp.strength;
  const half = imp.region * 0.5;
  if (imp.edge === 0) {
    const end = Math.min(s.cols, imp.start + imp.region);
    for (let c = imp.start; c < end; c++) {
      const fall = 1 - Math.abs(c - imp.start - half) / half;
      s.velY[c] += strength * fall * fall;
    }
  } else if (imp.edge === 1) {
    const end = Math.min(s.rows, imp.start + imp.region);
    for (let r = imp.start; r < end; r++) {
      const fall = 1 - Math.abs(r - imp.start - half) / half;
      s.velX[s.cols - 1 + r * s.cols] -= strength * fall * fall;
    }
  } else if (imp.edge === 2) {
    const end = Math.min(s.cols, imp.start + imp.region);
    for (let c = imp.start; c < end; c++) {
      const fall = 1 - Math.abs(c - imp.start - half) / half;
      s.velY[(s.rows - 1) * s.cols + c] -= strength * fall * fall;
    }
  } else {
    const end = Math.min(s.rows, imp.start + imp.region);
    for (let r = imp.start; r < end; r++) {
      const fall = 1 - Math.abs(r - imp.start - half) / half;
      s.velX[r * s.cols] += strength * fall * fall;
    }
  }
}

function intervalFrames(impulseRate: number, fps: number): number {
  return Math.max(1, (1.8 / impulseRate) * fps);
}

// Fires every impulse whose scheduled frame has been reached, advancing the
// schedule with the just-drawn jitter (the frame-0 opening impulse and the
// first scheduled one use the plain interval). Mirrors the reference's
// timeSinceImpulse accumulation exactly.
function fireScheduled(
  s: KineticState,
  frame: number,
  impulseRate: number,
  impulseForce: number,
  fps: number,
): void {
  const nominal = intervalFrames(impulseRate, fps);
  while (frame >= s.nextImpulseFrame) {
    const imp = impulseParams(
      s.impulseIdx,
      impulseForce,
      s.cols,
      s.rows,
      s.spacingX,
      s.spacingY,
      s.marginX,
      s.marginY,
    );
    const jitter = imp.jitter;
    s.nextImpulseFrame += s.impulseIdx === 0 ? nominal : nominal * (1 - 0.3 * jitter);
    s.impulseIdx++;
    applyEdgeImpulse(s, imp);
  }
}

// One animation step — exactly the reference's simulate(): spring forces, the
// return force toward rest, per-frame damping, then position integration. No
// dt scaling anywhere, so the mesh state is a pure function of the frame number.
function stepPhysics(
  s: KineticState,
  springTension: number,
  damping: number,
  returnForce: number,
): void {
  const springK = SPRING_K_BASE * springTension;
  const springs = s.springs;
  const n = s.nodeCount;
  for (let si = 0; si * 3 < springs.length; si++) {
    const s3 = si * 3;
    const a = springs[s3]!;
    const b = springs[s3 + 1]!;
    const restLen = springs[s3 + 2]!;
    const dx = s.posX[b] - s.posX[a];
    const dy = s.posY[b] - s.posY[a];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) continue;
    const force = (springK * (dist - restLen)) / dist;
    s.velX[a] += dx * force;
    s.velY[a] += dy * force;
    s.velX[b] -= dx * force;
    s.velY[b] -= dy * force;
  }
  for (let i = 0; i < n; i++) {
    s.velX[i] += (s.restX[i] - s.posX[i]) * returnForce;
    s.velY[i] += (s.restY[i] - s.posY[i]) * returnForce;
    s.velX[i] *= damping;
    s.velY[i] *= damping;
    s.posX[i] += s.velX[i];
    s.posY[i] += s.velY[i];
  }
}

// Rebuilds the mesh from frame 0 to the target, replaying the deterministic
// impulse schedule — the seek path. Contiguous playback never runs this.
function rebuild(
  s: KineticState,
  frame: number,
  impulseRate: number,
  impulseForce: number,
  fps: number,
  springTension: number,
  damping: number,
  returnForce: number,
): void {
  for (let i = 0; i < s.nodeCount; i++) {
    s.posX[i] = s.restX[i];
    s.posY[i] = s.restY[i];
    s.velX[i] = 0;
    s.velY[i] = 0;
  }
  s.ringHead = 0;
  s.ringCount = 0;
  s.impulseIdx = 0;
  s.nextImpulseFrame = 0;
  for (let f = 0; f <= frame; f++) {
    pushSnapshot(s);
    fireScheduled(s, f, impulseRate, impulseForce, fps);
    stepPhysics(s, springTension, damping, returnForce);
  }
  s.frame = frame;
}

// ── Schedule walk for flash / screen-flash rendering ───
// Read-only: recomputes the impulses that produced the current mesh so their
// flashes can be painted. Never mutates the simulation.
function recentImpulses(
  s: KineticState,
  impulseRate: number,
  impulseForce: number,
  fps: number,
  frame: number,
): Impulse[] {
  const res: Impulse[] = [];
  const nominal = intervalFrames(impulseRate, fps);
  const window = Math.ceil(fps / 2) + 2;
  const base = impulseParams(
    0,
    impulseForce,
    s.cols,
    s.rows,
    s.spacingX,
    s.spacingY,
    s.marginX,
    s.marginY,
  );
  if (frame < window) res.push({ ...base, k: 0, frame: 0 });
  let k = 0;
  let next = nominal;
  while (next <= frame) {
    k++;
    const imp = impulseParams(
      k,
      impulseForce,
      s.cols,
      s.rows,
      s.spacingX,
      s.spacingY,
      s.marginX,
      s.marginY,
    );
    const fireFrame = Math.floor(next);
    if (fireFrame >= frame - window) res.push({ ...imp, k, frame: fireFrame });
    next += nominal * (1 - 0.3 * imp.jitter);
  }
  return res;
}

// ── Draw ────────────────────────────────────────────────
function springSegment(
  ctx: CanvasRenderingContext2D,
  s: KineticState,
  a: number,
  b: number,
  restLen: number,
  slot: number,
  values: KineticGridValues,
  breathe: number,
  weight: number,
): void {
  let ax: number;
  let ay: number;
  let bx: number;
  let by: number;
  if (slot < 0) {
    ax = s.posX[a];
    ay = s.posY[a];
    bx = s.posX[b];
    by = s.posY[b];
  } else {
    ax = readNode(s, slot, a, 0);
    ay = readNode(s, slot, a, 1);
    bx = readNode(s, slot, b, 0);
    by = readNode(s, slot, b, 1);
  }
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const tension = Math.abs(dist - restLen) * s.tensionScale;
  const col = lineColor(values, tension);

  const glowAlpha = (0.04 + tension * 0.18) * breathe * weight;
  if (glowAlpha > MIN_ALPHA) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = rgba(col, glowAlpha);
    ctx.lineWidth = 3.5 + tension * 8;
    ctx.stroke();
  }

  const coreAlpha = Math.min(1, (0.12 + tension * 0.6) * breathe) * weight;
  if (coreAlpha > MIN_ALPHA) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = rgba(col, coreAlpha);
    ctx.lineWidth = 0.6 + tension * 1.6;
    ctx.stroke();
  }
}

function nodeDots(
  ctx: CanvasRenderingContext2D,
  s: KineticState,
  slot: number,
  values: KineticGridValues,
  weight: number,
): void {
  const n = s.nodeCount;
  for (let i = 0; i < n; i++) {
    let vx: number;
    let vy: number;
    let px: number;
    let py: number;
    if (slot < 0) {
      vx = s.velX[i];
      vy = s.velY[i];
      px = s.posX[i];
      py = s.posY[i];
    } else {
      vx = readNode(s, slot, i, 2);
      vy = readNode(s, slot, i, 3);
      px = readNode(s, slot, i, 0);
      py = readNode(s, slot, i, 1);
    }
    const speed = Math.sqrt(vx * vx + vy * vy);
    const brightness = Math.min(1, speed * 0.2);
    if (brightness < 0.02) continue;
    const alpha = (0.12 + brightness * 0.75) * weight;
    if (alpha < MIN_ALPHA) continue;
    const col = nodeColor(values, brightness);

    if (speed > WAVE_THRESHOLD) {
      const bloom = Math.min(1, (speed - WAVE_THRESHOLD) / 15);
      const haloA = bloom * 0.35 * weight;
      if (haloA > MIN_ALPHA) {
        const haloR = Math.round(220 + bloom * 35);
        const haloG = Math.round(80 + bloom * 60);
        const haloB = Math.round(15 + bloom * 40);
        ctx.beginPath();
        ctx.arc(px, py, 4 + bloom * 12, 0, TAU);
        ctx.fillStyle = rgba([haloR, haloG, haloB], haloA);
        ctx.fill();
      }
      const coreA = bloom * 0.6 * weight;
      if (coreA > MIN_ALPHA) {
        ctx.beginPath();
        ctx.arc(px, py, 2 + bloom * 4, 0, TAU);
        ctx.fillStyle = rgba([255, 220, 170], coreA);
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.arc(px, py, 0.8 + brightness * 2, 0, TAU);
    ctx.fillStyle = rgba(col, alpha);
    ctx.fill();
  }
}

function drawFlashes(
  ctx: CanvasRenderingContext2D,
  s: KineticState,
  impulses: Impulse[],
  values: KineticGridValues,
  frame: number,
  fps: number,
): void {
  const flashCol = parseCssColor(values.flashColor);
  for (const imp of impulses) {
    const age = frame - imp.frame;
    const life = 1 - age * (2 / fps);
    if (life <= 0) continue;
    const flashAlpha = life * life * 0.8;
    const radius = (1 - life) * 100 + 20;
    const grad = ctx.createRadialGradient(
      imp.flashX,
      imp.flashY,
      0,
      imp.flashX,
      imp.flashY,
      radius,
    );
    grad.addColorStop(0, rgba(flashCol, flashAlpha));
    grad.addColorStop(0.2, rgba([240, 120, 30], flashAlpha * 0.6));
    grad.addColorStop(0.5, rgba([180, 70, 10], flashAlpha * 0.25));
    grad.addColorStop(1, rgba([120, 40, 5], 0));
    ctx.beginPath();
    ctx.arc(imp.flashX, imp.flashY, radius, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();

    const ring = 1 - age * (1.8 / fps);
    if (ring > 0 && ring * ring * 0.5 > MIN_ALPHA) {
      const ringRadius = 15 + (1 - ring) * 120;
      ctx.beginPath();
      ctx.arc(imp.flashX, imp.flashY, ringRadius, 0, TAU);
      ctx.strokeStyle = rgba(flashCol, ring * ring * 0.5);
      ctx.lineWidth = 2 * ring;
      ctx.stroke();
    }
  }
}

export function renderKineticGrid(
  context: CanvasRenderingContext2D,
  time: number,
  fps: number,
  values: KineticGridValues,
  node: Background,
): void {
  let state = stateByNode.get(node);

  const w = node.width();
  const h = node.height();
  if (w <= 0 || h <= 0) return;

  const sceneFps = Math.max(1, fps);
  const frame = Math.max(0, Math.round(time * sceneFps));
  const cols = Math.max(3, Math.round(BASE_COLS * values.density));
  const rows = Math.max(3, Math.round(BASE_ROWS * values.density));
  const K = Math.min(40, Math.max(0, Math.floor(values.trailFrames)));
  const impulseRate = Math.max(0.05, values.impulseRate);
  const springTension = values.springTension;
  const impulseForce = values.impulseForce;
  const damping = Math.min(1, Math.max(0.5, values.damping));
  const returnForce = Math.max(0, values.returnForce);

  const key = JSON.stringify([
    w,
    h,
    cols,
    rows,
    K,
    impulseRate,
    springTension,
    impulseForce,
    damping,
    returnForce,
  ]);

  if (!state) {
    state = {
      frame: null,
      key: "",
      cols,
      rows,
      nodeCount: 0,
      spacingX: 0,
      spacingY: 0,
      marginX: 0,
      marginY: 0,
      tensionScale: 0,
      posX: new Float32Array(0),
      posY: new Float32Array(0),
      velX: new Float32Array(0),
      velY: new Float32Array(0),
      restX: new Float32Array(0),
      restY: new Float32Array(0),
      springs: [],
      ringCap: 0,
      ring: new Float32Array(0),
      ringHead: 0,
      ringCount: 0,
      impulseIdx: 0,
      nextImpulseFrame: 0,
    };
    stateByNode.set(node, state);
  }

  if (state.key !== key) {
    buildGrid(state, w, h, cols, rows, K);
    state.key = key;
  }

  const sameFrame = state.frame === frame;
  if (!sameFrame) {
    const contiguous = state.frame !== null && frame === state.frame + 1 && state.key === key;
    if (contiguous) {
      pushSnapshot(state);
      fireScheduled(state, frame, impulseRate, impulseForce, sceneFps);
      stepPhysics(state, springTension, damping, returnForce);
      state.frame = frame;
    } else {
      rebuild(
        state,
        frame,
        impulseRate,
        impulseForce,
        sceneFps,
        springTension,
        damping,
        returnForce,
      );
    }
  }

  // ── Paint ──
  context.fillStyle = values.backdrop;
  context.fillRect(-w / 2, -h / 2, w, h);
  context.translate(-w / 2, -h / 2);

  const impulses = recentImpulses(state, impulseRate, impulseForce, sceneFps, frame);
  const lastFire = impulses.length > 0 ? impulses[impulses.length - 1]!.frame : -Infinity;
  const screenFlash = 0.04 * Math.pow(0.88, frame - lastFire);
  if (screenFlash > 0.001) {
    context.fillStyle = `rgba(220, 100, 25, ${screenFlash})`;
    context.fillRect(0, 0, w, h);
  }

  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.lineJoin = "round";

  const breathe = 0.85 + 0.15 * Math.sin(time * 0.8);
  const springs = state.springs;
  const ghostCount = Math.min(K, state.ringCount);

  // Ghost passes: past neon content, weighted by the overlay's retention.
  for (let k = 1; k <= ghostCount; k++) {
    const slot = (state.ringHead - (k - 1) + state.ringCap) % state.ringCap;
    const weight = Math.pow(GHOST_RETENTION, k);
    for (let si = 0; si * 3 < springs.length; si++) {
      const s3 = si * 3;
      springSegment(
        context,
        state,
        springs[s3]!,
        springs[s3 + 1]!,
        springs[s3 + 2]!,
        slot,
        values,
        breathe,
        weight,
      );
    }
    nodeDots(context, state, slot, values, weight);
  }

  // Current pass.
  for (let si = 0; si * 3 < springs.length; si++) {
    const s3 = si * 3;
    springSegment(
      context,
      state,
      springs[s3]!,
      springs[s3 + 1]!,
      springs[s3 + 2]!,
      -1,
      values,
      breathe,
      1,
    );
  }
  nodeDots(context, state, -1, values, 1);

  drawFlashes(context, state, impulses, values, frame, sceneFps);

  context.globalCompositeOperation = "source-over";

  // Vignette, tinted with the backdrop so light backgrounds stay coherent.
  const backdrop = parseCssColor(values.backdrop);
  const vcx = w * 0.5;
  const vcy = h * 0.5;
  const maxDim = Math.max(w, h);
  const vignette = context.createRadialGradient(vcx, vcy, maxDim * 0.25, vcx, vcy, maxDim * 0.72);
  vignette.addColorStop(0, rgba(backdrop, 0));
  vignette.addColorStop(1, rgba(backdrop, 0.6));
  context.fillStyle = vignette;
  context.fillRect(0, 0, w, h);
}
