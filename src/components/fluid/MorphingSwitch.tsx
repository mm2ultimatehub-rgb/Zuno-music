import React, { useEffect, useRef } from 'react';
import {
  FLUID_SHAPES,
  SHAPE_SAMPLE_COUNT,
  TAU,
  clamp,
  getDarkAccentRgb,
  hexToRgb,
  mixRgb,
  rgbCss,
  stepSpring,
  type RGB,
} from '../../utils/fluidShapes';
import type { FluidShapeId } from '../../types/music';

interface MorphingSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  accentColor: string;
  shapeId?: FluidShapeId;
  styleMode?: 'shape' | 'liquid';
  speed?: number;
  ariaLabel: string;
  darkMode?: boolean;
}

export const MorphingSwitch: React.FC<MorphingSwitchProps> = ({
  checked,
  onChange,
  accentColor,
  shapeId = 'burst',
  styleMode = 'shape',
  speed = 1,
  ariaLabel,
  darkMode = true,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    s: checked ? 1 : 0,
    v: 0,
    press: 0,
    pt: 0,
    spin: 0,
    clock: 0,
    checked,
    accentColor,
    shapeId,
    styleMode,
    speed,
    darkMode,
  });

  stateRef.current.checked = checked;
  stateRef.current.accentColor = accentColor;
  stateRef.current.shapeId = shapeId;
  stateRef.current.styleMode = styleMode;
  stateRef.current.speed = speed;
  stateRef.current.darkMode = darkMode;

  useEffect(() => {
    const btn = btnRef.current;
    const cv = canvasRef.current;
    if (!btn || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dpr = 1;
    const w = 60;
    const h = 34;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    };
    resize();

    const pillPath = () => {
      const p = new Path2D();
      const r = h / 2;
      p.moveTo(r, 0);
      p.lineTo(w - r, 0);
      p.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2);
      p.lineTo(r, h);
      p.arc(r, r, r, Math.PI / 2, Math.PI * 1.5);
      p.closePath();
      return p;
    };

    const wavePath = (edge: number, A: number, ph: number) => {
      const p = new Path2D();
      const st = h / 10;
      p.moveTo(-4, -4);
      p.lineTo(edge + Math.sin(ph) * A, -4);
      for (let y = 0; y <= h + st; y += st) {
        p.lineTo(edge + Math.sin((y / h) * TAU * 1.2 + ph) * A, y);
      }
      p.lineTo(-4, h + 4);
      p.closePath();
      return p;
    };

    const knobPath = (x: number, y: number, R: number, rot: number, m: number, sId: FluidShapeId) => {
      const p = new Path2D();
      const circ = FLUID_SHAPES.circ.r;
      const shape = FLUID_SHAPES[sId]?.r || FLUID_SHAPES.burst.r;
      for (let i = 0; i < SHAPE_SAMPLE_COUNT; i++) {
        const rad = (circ[i] + (shape[i] - circ[i]) * m) / 0.92;
        const ang = (i / SHAPE_SAMPLE_COUNT) * TAU + rot;
        const px = x + Math.cos(ang) * R * rad;
        const py = y + Math.sin(ang) * R * rad;
        if (i === 0) p.moveTo(px, py);
        else p.lineTo(px, py);
      }
      p.closePath();
      return p;
    };

    let rafId = 0;
    let last = performance.now();

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const st = stateRef.current;
      const tgt = st.checked ? 1 : 0;
      st.clock += dt * st.speed;

      if (reduceMotion) {
        st.s = tgt;
        st.v = 0;
      } else {
        const next = stepSpring(st.s, tgt, st.v, 200 * st.speed * st.speed, 0.55, dt);
        st.s = next.value;
        st.v = next.velocity;
      }
      st.press += (st.pt - st.press) * Math.min(1, dt * 16);
      st.spin += dt * st.speed * 1.1 * clamp(st.s, 0, 1);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const s = st.s;
      const sc = clamp(s, 0, 1);
      const track = pillPath();
      const R = h * 0.38 * (0.7 + 0.3 * clamp(s, 0, 1.1)) * (1 - 0.1 * st.press);
      const x = h / 2 + (w - h) * clamp(s, -0.04, 1.06);
      const y = h / 2;
      const rot = s * 2.0 + st.spin;
      const knob = knobPath(x, y, R, rot, sc, st.shapeId);

      const rgb = hexToRgb(st.accentColor);
      const darkRgb = getDarkAccentRgb(rgb);
      const trackOff: RGB = st.darkMode ? [32, 39, 54] : [203, 213, 225];
      const knobOff: RGB = st.darkMode ? [138, 149, 168] : [255, 255, 255];

      if (st.styleMode === 'shape') {
        ctx.fillStyle = mixRgb(trackOff, rgb, sc);
        ctx.fill(track);
        ctx.fillStyle = mixRgb(knobOff, darkRgb, clamp(sc * 1.3 - 0.15, 0, 1));
        ctx.fill(knob);
      } else {
        ctx.fillStyle = rgbCss(trackOff, 1);
        ctx.fill(track);
        ctx.save();
        ctx.clip(track);
        const edge = -h * 0.4 + (w + h * 0.8) * sc;
        const A = h * 0.16 * Math.sin(Math.PI * sc);
        ctx.fillStyle = rgbCss(rgb, 0.42);
        ctx.fill(wavePath(edge + h * 0.1, A * 1.1, st.clock * 2.2));
        const front = wavePath(edge, A, -st.clock * 3.1 + 1.2);
        ctx.fillStyle = rgbCss(rgb, 1);
        ctx.fill(front);
        ctx.fillStyle = rgbCss(knobOff, 1);
        ctx.fill(knob);
        ctx.save();
        ctx.clip(front);
        ctx.fillStyle = rgbCss(darkRgb, 1);
        ctx.fill(knob);
        ctx.restore();
        ctx.restore();
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <button
      ref={btnRef}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      onPointerDown={() => {
        stateRef.current.pt = 1;
      }}
      onPointerUp={() => {
        stateRef.current.pt = 0;
      }}
      onPointerLeave={() => {
        stateRef.current.pt = 0;
      }}
      onPointerCancel={() => {
        stateRef.current.pt = 0;
      }}
      className="relative block h-[34px] w-[60px] shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
    </button>
  );
};
