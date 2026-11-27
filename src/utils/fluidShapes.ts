import type { FluidShapeId } from '../types/music';

export const TAU = Math.PI * 2;
export const SHAPE_SAMPLE_COUNT = 120;

export type RGB = [number, number, number];

export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeIO(x: number): number {
  const t = clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeSpringOut(x: number): number {
  const c1 = 1.1;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function smoothPolar(
  arr: Float32Array,
  sigma: number,
  count = SHAPE_SAMPLE_COUNT
): Float32Array<ArrayBuffer> {
  if (sigma < 0.1) return new Float32Array(arr);
  const rad = Math.ceil(3 * sigma);
  const weights: number[] = [];
  let sum = 0;
  for (let d = -rad; d <= rad; d++) {
    const v = Math.exp((-d * d) / (2 * sigma * sigma));
    weights.push(v);
    sum += v;
  }
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let acc = 0;
    for (let d = -rad; d <= rad; d++) {
      acc += arr[((i + d) % count + count) % count] * weights[d + rad];
    }
    out[i] = acc / sum;
  }
  return out;
}

export function polyRadius(sides: number, theta: number, offset = 0): number {
  const tp = theta + Math.PI / 2 + offset;
  const seg = TAU / sides;
  const phi = (((tp % seg) + seg) % seg) - seg / 2;
  return Math.cos(Math.PI / sides) / Math.cos(phi);
}

export function buildPolarShape(
  fn: (theta: number) => number,
  sigma: number,
  targetMean: number,
  count = SHAPE_SAMPLE_COUNT
): Float32Array<ArrayBuffer> {
  let a: Float32Array<ArrayBuffer> = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    a[i] = fn((i / count) * TAU);
  }
  a = smoothPolar(a, sigma, count);
  let sum = 0;
  for (let i = 0; i < count; i++) sum += a[i];
  const scale = targetMean / (sum / count);
  for (let i = 0; i < count; i++) a[i] *= scale;
  return a;
}

const CIRC_ARRAY = (() => {
  const c = new Float32Array(SHAPE_SAMPLE_COUNT);
  for (let i = 0; i < SHAPE_SAMPLE_COUNT; i++) c[i] = 0.92;
  return c;
})();

export const FLUID_SHAPES: Record<FluidShapeId, { id: FluidShapeId; name: string; r: Float32Array }> = {
  burst: {
    id: 'burst',
    name: 'Yumuşak yıldız',
    r: buildPolarShape((t) => 1 + 0.1 * Math.cos(10 * t), 0, 0.92),
  },
  sun: {
    id: 'sun',
    name: 'Güneş',
    r: buildPolarShape((t) => 1 + 0.14 * Math.cos(8 * t), 0, 0.92),
  },
  pent: {
    id: 'pent',
    name: 'Beşgen',
    r: buildPolarShape((t) => polyRadius(5, t, 0), 5.5, 0.92),
  },
  hex: {
    id: 'hex',
    name: 'Altıgen',
    r: buildPolarShape((t) => polyRadius(6, t, 0), 4.5, 0.92),
  },
  sq: {
    id: 'sq',
    name: 'Kare',
    r: buildPolarShape((t) => polyRadius(4, t, Math.PI / 4), 5.5, 0.92),
  },
  tri: {
    id: 'tri',
    name: 'Üçgen',
    r: buildPolarShape((t) => polyRadius(3, t, 0), 7, 0.88),
  },
  pill: {
    id: 'pill',
    name: 'Hap',
    r: buildPolarShape((t) => {
      const a = 0.74;
      const b = 1;
      const p = 3.2;
      const c = Math.abs(Math.cos(t)) / a;
      const s = Math.abs(Math.sin(t)) / b;
      return Math.pow(Math.pow(c, p) + Math.pow(s, p), -1 / p);
    }, 0, 0.88),
  },
  circ: {
    id: 'circ',
    name: 'Daire',
    r: CIRC_ARRAY,
  },
};

export function hexToRgb(hex: string): RGB {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [155, 114, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const mx = Math.max(rn, gn, bn);
  const mn = Math.min(rn, gn, bn);
  const l = (mx + mn) / 2;
  let h = 0;
  let s = 0;
  const d = mx - mn;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (mx === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const hn = (((h % 360) + 360) % 360) / 360;
  const f = (p: number, q: number, t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(f(p, q, hn + 1 / 3) * 255),
    Math.round(f(p, q, hn) * 255),
    Math.round(f(p, q, hn - 1 / 3) * 255),
  ];
}

export function getDarkAccentRgb(rgb: RGB): RGB {
  const [h, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return hslToRgb(h, Math.min(1, s * 1.35), 0.14);
}

export function mixRgb(a: RGB, b: RGB, t: number): string {
  const k = clamp(t, 0, 1);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
}

export function rgbCss(c: RGB, alpha = 1): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

export function getRelativeLuminance(rgb: RGB): number {
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);
}

export function getContrastTextHex(bgHex: string): '#0b0e16' | '#ffffff' {
  const lum = getRelativeLuminance(hexToRgb(bgHex));
  return lum > 0.18 ? '#0b0e16' : '#ffffff';
}

export function stepSpring(
  current: number,
  target: number,
  velocity: number,
  stiffness: number,
  dampingRatio: number,
  dt: number
): { value: number; velocity: number } {
  let val = current;
  let vel = velocity;
  const substeps = 3;
  const h = dt / substeps;
  const damping = 2 * Math.sqrt(stiffness) * dampingRatio;
  for (let i = 0; i < substeps; i++) {
    const force = (target - val) * stiffness - vel * damping;
    vel += force * h;
    val += vel * h;
  }
  if (Math.abs(target - val) < 0.0004 && Math.abs(vel) < 0.01) {
    return { value: target, velocity: 0 };
  }
  return { value: val, velocity: vel };
}
