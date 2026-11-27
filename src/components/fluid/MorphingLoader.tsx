import React, { useEffect, useRef } from 'react';
import {
  FLUID_SHAPES,
  SHAPE_SAMPLE_COUNT,
  TAU,
  easeSpringOut,
  getDarkAccentRgb,
  hexToRgb,
  rgbCss,
} from '../../utils/fluidShapes';
import type { FluidShapeId } from '../../types/music';

interface MorphingLoaderProps {
  size?: number;
  accentColor: string;
  shapes?: FluidShapeId[];
  withContainer?: boolean;
  speed?: number;
  label?: string;
}

export const MorphingLoader: React.FC<MorphingLoaderProps> = ({
  size = 56,
  accentColor,
  shapes = ['burst', 'pent', 'pill', 'sun'],
  withContainer = true,
  speed = 1,
  label = 'Yükleniyor',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ size, accentColor, shapes, withContainer, speed });
  propsRef.current = { size, accentColor, shapes, withContainer, speed };

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);

    let rafId = 0;
    let acc = 0;
    let lastNow = performance.now();
    const STEP = 0.85;
    const MOVE = 0.55;

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - lastNow) / 1000, 0.1);
      lastNow = now;
      const cfg = propsRef.current;
      acc += reduceMotion ? 0 : dt * cfg.speed;

      const list = cfg.shapes.length >= 2 ? cfg.shapes : (['burst', 'sun'] as FluidShapeId[]);
      const L = list.length;
      const stepIdx = Math.floor(acc / STEP);
      const local = acc - stepIdx * STEP;
      const s = local < MOVE ? easeSpringOut(local / MOVE) : 1;
      const A = FLUID_SHAPES[list[stepIdx % L]].r;
      const B = FLUID_SHAPES[list[(stepIdx + 1) % L]].r;
      const rot = acc * 0.9 + (stepIdx + Math.min(s, 1)) * 0.55;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cfg.size, cfg.size);

      const cx = cfg.size / 2;
      const cy = cfg.size / 2;
      const Rc = cfg.size * 0.46;
      const Rs = Rc * 0.7;

      const rgb = hexToRgb(cfg.accentColor);
      const boxRgb = getDarkAccentRgb(rgb);

      if (cfg.withContainer) {
        ctx.fillStyle = rgbCss(boxRgb, 1);
        ctx.beginPath();
        ctx.arc(cx, cy, Rc, 0, TAU);
        ctx.fill();
      }

      const path = new Path2D();
      for (let i = 0; i < SHAPE_SAMPLE_COUNT; i++) {
        const r = A[i] + (B[i] - A[i]) * s;
        const ang = (i / SHAPE_SAMPLE_COUNT) * TAU + rot;
        const x = cx + Math.cos(ang) * Rs * r;
        const y = cy + Math.sin(ang) * Rs * r;
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
      path.closePath();

      ctx.fillStyle = rgbCss(rgb, 1);
      ctx.fill(path);

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [size]);

  return (
    <div
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center"
    >
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </div>
  );
};
