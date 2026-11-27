import React, { useEffect, useRef } from 'react';
import {
  FLUID_SHAPES,
  SHAPE_SAMPLE_COUNT,
  TAU,
  clamp,
  getDarkAccentRgb,
  hexToRgb,
  rgbCss,
  stepSpring,
} from '../../utils/fluidShapes';
import type { FluidShapeId } from '../../types/music';

interface LiquidSliderProps {
  value: number; // 0 to 1
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  accentColor: string;
  shapeId?: FluidShapeId;
  waveAmp?: number;
  speed?: number;
  height?: number;
  ariaLabel: string;
  darkMode?: boolean;
  className?: string;
}

export const LiquidSlider: React.FC<LiquidSliderProps> = ({
  value,
  onChange,
  onChangeEnd,
  accentColor,
  shapeId = 'burst',
  waveAmp = 1,
  speed = 1,
  height = 46,
  ariaLabel,
  darkMode = true,
  className = '',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    target: clamp(value, 0, 1),
    val: clamp(value, 0, 1),
    vel: 0,
    press: 0,
    pt: 0,
    drag: false,
    w: 0,
    h: height,
    clock: 0,
    accentColor,
    shapeId,
    waveAmp,
    speed,
    darkMode,
  });

  stateRef.current.accentColor = accentColor;
  stateRef.current.shapeId = shapeId;
  stateRef.current.waveAmp = waveAmp;
  stateRef.current.speed = speed;
  stateRef.current.darkMode = darkMode;
  if (!stateRef.current.drag) {
    stateRef.current.target = clamp(value, 0, 1);
  }

  const onChangeRef = useRef(onChange);
  const onChangeEndRef = useRef(onChangeEnd);
  onChangeRef.current = onChange;
  onChangeEndRef.current = onChangeEnd;

  useEffect(() => {
    const el = rootRef.current;
    const cv = canvasRef.current;
    if (!el || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      stateRef.current.w = el.clientWidth;
      stateRef.current.h = el.clientHeight;
      cv.width = Math.round(stateRef.current.w * dpr);
      cv.height = Math.round(stateRef.current.h * dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let rafId = 0;
    let last = performance.now();

    const pillPath = (L: number, T: number) => {
      const p = new Path2D();
      const r = T / 2;
      p.moveTo(r, 0);
      p.lineTo(L - r, 0);
      p.arc(L - r, r, r, -Math.PI / 2, Math.PI / 2);
      p.lineTo(r, T);
      p.arc(r, r, r, Math.PI / 2, Math.PI * 1.5);
      p.closePath();
      return p;
    };

    const wavePath = (T: number, edge: number, A: number, ph: number, tilt: number) => {
      const p = new Path2D();
      const st = Math.max(2, T / 10);
      p.moveTo(-4, -4);
      p.lineTo(edge + Math.sin(ph) * A - (T / 2 + 4) * tilt, -4);
      for (let y = 0; y <= T + st; y += st) {
        p.lineTo(edge + Math.sin((y / T) * TAU * 1.2 + ph) * A + (y - T / 2) * tilt, y);
      }
      p.lineTo(-4, T + 4);
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

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const st = stateRef.current;
      st.clock += dt * st.speed;

      if (reduceMotion) {
        st.val = st.target;
        st.vel = 0;
      } else {
        const next = stepSpring(st.val, st.target, st.vel, 260 * st.speed * st.speed, 0.52, dt);
        st.val = next.value;
        st.vel = next.velocity;
      }
      st.press += (st.pt - st.press) * Math.min(1, dt * 14);

      if (st.w > 0 && st.h > 0) {
        const L = st.w;
        const T = st.h;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, L, T);

        const v = clamp(st.val, -0.02, 1.02);
        const track = pillPath(L, T);
        const kx = T / 2 + (L - T) * v;
        const ky = T / 2;
        const edge = kx + (v - 0.5) * T * 0.55;
        const motion = reduceMotion ? 0 : Math.min(1.2, Math.abs(st.vel) * 0.9);
        const A = T * 0.08 * st.waveAmp * (0.25 + motion);
        const tilt = reduceMotion ? 0 : clamp(-st.vel * 0.1 * st.waveAmp, -0.5, 0.5);

        const rgb = hexToRgb(st.accentColor);
        const darkRgb = getDarkAccentRgb(rgb);

        ctx.fillStyle = st.darkMode ? 'rgb(22, 28, 39)' : 'rgb(226, 232, 240)';
        ctx.fill(track);

        ctx.save();
        ctx.clip(track);
        ctx.fillStyle = rgbCss(rgb, 0.42);
        ctx.fill(wavePath(T, edge - T * 0.08, A * 1.1, st.clock * 2.2, tilt * 0.8));
        ctx.fillStyle = rgbCss(rgb, 1);
        ctx.fill(wavePath(T, edge, A, -st.clock * 3.1 + 1.2, tilt));
        ctx.restore();

        const R = T * 0.34 * (1 + 0.12 * st.press);
        const m = st.shapeId === 'circ' ? 0 : 0.25 + 0.75 * st.press;
        const knob = knobPath(kx, ky, R, v * TAU * 1.25, m, st.shapeId);
        ctx.fillStyle = rgbCss(darkRgb, 1);
        ctx.fill(knob);
        ctx.lineWidth = Math.max(1.5, T * 0.045);
        ctx.strokeStyle = 'rgba(242, 246, 252, 0.92)';
        ctx.stroke(knob);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const updateFromClientX = (clientX: number) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const T = rect.height;
    const L = rect.width;
    const pos = clientX - rect.left;
    const v = clamp((pos - T / 2) / Math.max(1, L - T), 0, 1);
    stateRef.current.target = v;
    onChangeRef.current(v);
  };

  return (
    <div
      ref={rootRef}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamp(value, 0, 1) * 100)}
      style={{ height }}
      className={`relative w-full cursor-pointer select-none rounded-full touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      onPointerDown={(e) => {
        stateRef.current.drag = true;
        stateRef.current.pt = 1;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (stateRef.current.drag) {
          updateFromClientX(e.clientX);
        }
      }}
      onPointerUp={() => {
        if (stateRef.current.drag) {
          stateRef.current.drag = false;
          stateRef.current.pt = 0;
          onChangeEndRef.current?.(stateRef.current.target);
        }
      }}
      onPointerCancel={() => {
        stateRef.current.drag = false;
        stateRef.current.pt = 0;
      }}
      onKeyDown={(e) => {
        let delta = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = 0.05;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -0.05;
        else if (e.key === 'Home') {
          e.preventDefault();
          onChange(0);
          onChangeEnd?.(0);
          return;
        } else if (e.key === 'End') {
          e.preventDefault();
          onChange(1);
          onChangeEnd?.(1);
          return;
        } else return;
        e.preventDefault();
        const next = clamp(value + delta, 0, 1);
        onChange(next);
        onChangeEnd?.(next);
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none block h-full w-full" />
    </div>
  );
};
