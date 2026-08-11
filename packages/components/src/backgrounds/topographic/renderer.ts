// Faithful canvas port of the "Topographic Contour Map" sketch
// (radiant-shaders.com / github.com/pbakaus/radiant, `static/topographic.html`),
// repainted as a Motion Canvas canvas-draw background.
//
// Painting model: each frame the reference samples a 4-octave simplex FBM field
// on an 8px grid, min/max-normalizes it, extracts isolines with marching
// squares at `contours` thresholds, strokes each level twice (a soft glow pass
// and a thin sharp pass), drops tiny elevation labels along the major (every
// 5th) rings, and darkens the edges with a vignette. The painter here does the
// same, scrubbed from MC's virtual time.
//
// Determinism: the field, the contour segments and the vignette are pure
// functions of (time, panel size, props), so seeking reproduces the exact map.
// The label placement is the one non-deterministic step in the reference
// (`Math.random()`), so this port gates each segment with a mulberry32 seeded
// from (frame, contour) — the same frame always places the same labels.
import type { Background } from "@moliniani/core";

export interface TopographicValues {
  color0: string;
  color1: string;
  color2: string;
  color3: string;
  contours: number;
  speed: number;
  noiseScale: number;
  labels: number;
  labelSize: number;
}

// Grid cell size in CSS px, matching the reference.
const CELL_SIZE = 8;

// Noise field seed, matching the reference (new SimplexNoise(73)).
const NOISE_SEED = 73;

// Per-segment label probability on the major contours (reference LABEL_DENSITY).
const LABEL_DENSITY = 0.003;

// Minimum distance between on-screen labels (reference MIN_LABEL_DIST).
const MIN_LABEL_DIST = 120;

// ── 3D simplex noise (compact port of the reference implementation) ────────
const F3 = 1 / 3;
const G3 = 1 / 6;

const grad3: readonly [number, number, number][] = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
];

function makePerm(seed: number): { perm: Uint8Array; permMod12: Uint8Array } {
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807 + 0) % 2147483647;
    const j = seed % (i + 1);
    const tmp = p[i]!;
    p[i] = p[j]!;
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]!;
    permMod12[i] = perm[i]! % 12;
  }
  return { perm, permMod12 };
}

const PERMS = makePerm(NOISE_SEED);

function noise3D(
  perm: Uint8Array,
  permMod12: Uint8Array,
  xin: number,
  yin: number,
  zin: number,
): number {
  let n0 = 0;
  let n1 = 0;
  let n2 = 0;
  let n3 = 0;
  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const k = Math.floor(zin + s);
  const t = (i + j + k) * G3;
  const X0 = i - t;
  const Y0 = j - t;
  const Z0 = k - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;
  const z0 = zin - Z0;
  let i1: number;
  let j1: number;
  let k1: number;
  let i2: number;
  let j2: number;
  let k2: number;
  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1;
      j1 = 0;
      k1 = 0;
      i2 = 1;
      j2 = 1;
      k2 = 0;
    } else if (x0 >= z0) {
      i1 = 1;
      j1 = 0;
      k1 = 0;
      i2 = 1;
      j2 = 0;
      k2 = 1;
    } else {
      i1 = 0;
      j1 = 0;
      k1 = 1;
      i2 = 1;
      j2 = 0;
      k2 = 1;
    }
  } else {
    if (y0 < z0) {
      i1 = 0;
      j1 = 0;
      k1 = 1;
      i2 = 0;
      j2 = 1;
      k2 = 1;
    } else if (x0 < z0) {
      i1 = 0;
      j1 = 1;
      k1 = 0;
      i2 = 0;
      j2 = 1;
      k2 = 1;
    } else {
      i1 = 0;
      j1 = 1;
      k1 = 0;
      i2 = 1;
      j2 = 1;
      k2 = 0;
    }
  }
  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2 * G3;
  const y2 = y0 - j2 + 2 * G3;
  const z2 = z0 - k2 + 2 * G3;
  const x3 = x0 - 1 + 3 * G3;
  const y3 = y0 - 1 + 3 * G3;
  const z3 = z0 - 1 + 3 * G3;
  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 < 0) n0 = 0;
  else {
    t0 *= t0;
    const gi = permMod12[ii + perm[jj + perm[kk]]]!;
    const g = grad3[gi]!;
    n0 = t0 * t0 * (g[0] * x0 + g[1] * y0 + g[2] * z0);
  }
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 < 0) n1 = 0;
  else {
    t1 *= t1;
    const gi = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]]!;
    const g = grad3[gi]!;
    n1 = t1 * t1 * (g[0] * x1 + g[1] * y1 + g[2] * z1);
  }
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 < 0) n2 = 0;
  else {
    t2 *= t2;
    const gi = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]]!;
    const g = grad3[gi]!;
    n2 = t2 * t2 * (g[0] * x2 + g[1] * y2 + g[2] * z2);
  }
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 < 0) n3 = 0;
  else {
    t3 *= t3;
    const gi = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]]!;
    const g = grad3[gi]!;
    n3 = t3 * t3 * (g[0] * x3 + g[1] * y3 + g[2] * z3);
  }
  return 32 * (n0 + n1 + n2 + n3);
}

// 4-octave fractal Brownian motion over a 3D simplex field; the time axis is
// sampled once per octave (same as the reference).
function fbm(x: number, y: number, z: number): number {
  let val = 0;
  let amp = 1;
  let freq = 1;
  let sum = 0;
  for (let o = 0; o < 4; o++) {
    val += noise3D(PERMS.perm, PERMS.permMod12, x * freq, y * freq, z) * amp;
    sum += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / sum;
}

// ── Color helpers ───────────────────────────────────────────────────────────
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

function lerpC(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgba(c: [number, number, number], a: number): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
}

// ── Marching squares (edge table from the reference) ────────────────────────
// Edges: 0=top, 1=right, 2=bottom, 3=left. The 4-bit case index is
// `tl|tr|br|bl >= threshold`.
const EDGE_TABLE: readonly (readonly [number, number][])[] = [
  [],
  [[3, 2]],
  [[2, 1]],
  [[3, 1]],
  [[1, 0]],
  [
    [1, 0],
    [3, 2],
  ],
  [[2, 0]],
  [[3, 0]],
  [[0, 3]],
  [[0, 2]],
  [
    [0, 3],
    [2, 1],
  ],
  [[0, 1]],
  [[1, 3]],
  [[1, 2]],
  [[2, 3]],
  [],
];

function interp(v1: number, v2: number, threshold: number): number {
  if (Math.abs(v2 - v1) < 0.0001) return 0.5;
  return (threshold - v1) / (v2 - v1);
}

function edgePoint(
  edge: number,
  cx: number,
  cy: number,
  cellW: number,
  cellH: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
  threshold: number,
): [number, number] {
  let t: number;
  switch (edge) {
    case 0:
      t = interp(tl, tr, threshold);
      return [cx + t * cellW, cy];
    case 1:
      t = interp(tr, br, threshold);
      return [cx + cellW, cy + t * cellH];
    case 2:
      t = interp(bl, br, threshold);
      return [cx + t * cellW, cy + cellH];
    default:
      t = interp(tl, bl, threshold);
      return [cx, cy + t * cellH];
  }
}

// ── Deterministic label rng ─────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function labelRng(frame: number, contour: number): () => number {
  const seed = (Math.imul(frame + 1, 2654435761) ^ Math.imul(contour + 1, 40503)) >>> 0;
  return mulberry32(seed);
}

// ── Per-instance field buffer ───────────────────────────────────────────────
interface RunnerState {
  cols: number;
  rows: number;
  field: Float32Array;
}

const stateByNode = new WeakMap<Background, RunnerState>();

interface LabelCandidate {
  x: number;
  y: number;
  angle: number;
  elevation: number;
  color: [number, number, number];
  alpha: number;
}

// ── Public entry ────────────────────────────────────────────────────────────
export function renderTopographic(
  context: CanvasRenderingContext2D,
  time: number,
  fps: number,
  values: TopographicValues,
  node: Background,
): void {
  const w = node.width();
  const h = node.height();
  if (w <= 0 || h <= 0) return;

  const frame = Math.max(0, Math.round(time * fps));
  const z = time * values.speed;
  const scale = values.noiseScale;

  const cols = Math.ceil(w / CELL_SIZE) + 1;
  const rows = Math.ceil(h / CELL_SIZE) + 1;

  let state = stateByNode.get(node);
  if (!state || state.cols !== cols || state.rows !== rows) {
    state = { cols, rows, field: new Float32Array(cols * rows) };
    stateByNode.set(node, state);
  }
  const field = state.field;

  // Sample the noise field into the grid.
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      field[j * cols + i] = fbm(i * CELL_SIZE * scale, j * CELL_SIZE * scale, z);
    }
  }

  // Min/max normalize the field to 0..1 so the contour thresholds always span
  // the full elevation range (same as the reference).
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let k = 0; k < field.length; k++) {
    if (field[k] < minVal) minVal = field[k];
    if (field[k] > maxVal) maxVal = field[k];
  }
  const range = maxVal - minVal || 1;
  for (let k = 0; k < field.length; k++) {
    field[k] = (field[k] - minVal) / range;
  }

  // Paint in CSS-pixel space, origin translated to the panel's top-left.
  context.fillStyle = values.color0;
  context.fillRect(-w / 2, -h / 2, w, h);
  context.translate(-w / 2, -h / 2);
  context.lineCap = "round";
  context.lineJoin = "round";

  const low = parseCssColor(values.color1);
  const mid = parseCssColor(values.color2);
  const high = parseCssColor(values.color3);
  const numContours = Math.max(1, Math.round(values.contours));
  const labelSpawnChance = LABEL_DENSITY * values.labels;

  const labelCandidates: LabelCandidate[] = [];

  for (let c = 0; c < numContours; c++) {
    const threshold = (c + 1) / (numContours + 1);

    // Color: coral (low) through amber (mid) to gold (high).
    const lineColor =
      threshold < 0.5 ? lerpC(low, mid, threshold * 2) : lerpC(mid, high, (threshold - 0.5) * 2);

    // Opacity strongest mid-range, subtler at the extremes.
    const distFromCenter = Math.abs(threshold - 0.5) * 2;
    const baseAlpha = 0.25 + (1 - distFromCenter) * 0.45;

    const isMajor = c % 5 === 0;
    const glowWidth = isMajor ? 4.5 : 2.5;
    const sharpWidth = isMajor ? 1.2 : 0.6;
    const glowAlpha = baseAlpha * 0.25;
    const sharpAlpha = baseAlpha * (isMajor ? 1.0 : 0.8);

    const rng = labelRng(frame, c);
    const segments: number[] = [];

    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const tl = field[j * cols + i]!;
        const tr = field[j * cols + i + 1]!;
        const br = field[(j + 1) * cols + i + 1]!;
        const bl = field[(j + 1) * cols + i]!;

        const caseIdx =
          (tl >= threshold ? 8 : 0) |
          (tr >= threshold ? 4 : 0) |
          (br >= threshold ? 2 : 0) |
          (bl >= threshold ? 1 : 0);

        const edges = EDGE_TABLE[caseIdx];
        if (!edges || edges.length === 0) continue;

        const cx = i * CELL_SIZE;
        const cy = j * CELL_SIZE;

        for (let e = 0; e < edges.length; e++) {
          const p1 = edgePoint(
            edges[e]![0],
            cx,
            cy,
            CELL_SIZE,
            CELL_SIZE,
            tl,
            tr,
            br,
            bl,
            threshold,
          );
          const p2 = edgePoint(
            edges[e]![1],
            cx,
            cy,
            CELL_SIZE,
            CELL_SIZE,
            tl,
            tr,
            br,
            bl,
            threshold,
          );
          segments.push(p1[0], p1[1], p2[0], p2[1]);

          if (isMajor && labelSpawnChance > 0 && rng() < labelSpawnChance) {
            labelCandidates.push({
              x: (p1[0] + p2[0]) * 0.5,
              y: (p1[1] + p2[1]) * 0.5,
              angle: Math.atan2(p2[1] - p1[1], p2[0] - p1[0]),
              elevation: Math.round(threshold * 1000),
              color: lineColor,
              alpha: sharpAlpha * 0.6,
            });
          }
        }
      }
    }

    if (segments.length > 0) {
      // Glow pass: thick, low alpha.
      context.beginPath();
      for (let s = 0; s < segments.length; s += 4) {
        context.moveTo(segments[s]!, segments[s + 1]!);
        context.lineTo(segments[s + 2]!, segments[s + 3]!);
      }
      context.strokeStyle = rgba(lineColor, glowAlpha);
      context.lineWidth = glowWidth;
      context.stroke();

      // Sharp pass: thin, high alpha.
      context.beginPath();
      for (let s = 0; s < segments.length; s += 4) {
        context.moveTo(segments[s]!, segments[s + 1]!);
        context.lineTo(segments[s + 2]!, segments[s + 3]!);
      }
      context.strokeStyle = rgba(lineColor, sharpAlpha);
      context.lineWidth = sharpWidth;
      context.stroke();
    }
  }

  // ── Elevation labels ─────────────────────────────────────────
  // Filter out candidates too close together or near the edges.
  const filtered: LabelCandidate[] = [];
  for (const lbl of labelCandidates) {
    if (lbl.x < 80 || lbl.x > w - 80 || lbl.y < 40 || lbl.y > h - 40) continue;
    let tooClose = false;
    for (const f of filtered) {
      const dx = lbl.x - f.x;
      const dy = lbl.y - f.y;
      if (dx * dx + dy * dy < MIN_LABEL_DIST * MIN_LABEL_DIST) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) filtered.push(lbl);
  }

  context.font = `${values.labelSize}px "SF Mono", "Fira Code", "Cascadia Code", monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const lbl of filtered) {
    const text = String(lbl.elevation);
    const tw = context.measureText(text).width + 6;

    context.save();
    context.translate(lbl.x, lbl.y);

    // Keep the text roughly horizontal for readability.
    let angle = lbl.angle;
    if (angle > Math.PI / 2) angle -= Math.PI;
    if (angle < -Math.PI / 2) angle += Math.PI;
    context.rotate(angle);

    // Small dark knockout behind the text so it stays legible over the lines.
    const halfH = values.labelSize * 0.66;
    context.fillStyle = "rgba(10, 10, 10, 0.85)";
    context.fillRect(-tw / 2, -halfH, tw, halfH * 2);
    context.fillStyle = rgba(lbl.color, lbl.alpha);
    context.fillText(text, 0, values.labelSize * 0.06);

    context.restore();
  }

  // ── Subtle vignette ───────────────────────────────────────────
  const vGrad = context.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.3,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  vGrad.addColorStop(0, "rgba(10,10,10,0)");
  vGrad.addColorStop(1, "rgba(10,10,10,0.4)");
  context.fillStyle = vGrad;
  context.fillRect(0, 0, w, h);
}
