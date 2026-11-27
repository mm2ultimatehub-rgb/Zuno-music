import React, { useEffect, useRef } from 'react';
import {
  FLUID_SHAPES,
  SHAPE_SAMPLE_COUNT,
  TAU,
  clamp,
  easeIO,
  getDarkAccentRgb,
  hexToRgb,
  lerp,
  rgbCss,
} from '../../utils/fluidShapes';
import type { DownloadStatus, FluidShapeId } from '../../types/music';

interface DownloadActionButtonProps {
  status?: DownloadStatus;
  progress?: number; // 0 to 100
  onTrigger: () => void;
  accentColor: string;
  shapeId?: FluidShapeId;
  ariaLabel: string;
  compact?: boolean;
}

export const DownloadActionButton: React.FC<DownloadActionButtonProps> = ({
  status,
  progress = 0,
  onTrigger,
  accentColor,
  shapeId = 'burst',
  ariaLabel,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = compact ? 92 : 116;
  const h = compact ? 36 : 42;

  const propsRef = useRef({ status, progress, accentColor, shapeId, w, h });
  propsRef.current = { status, progress, accentColor, shapeId, w, h };

  const animRef = useRef({
    press: 0,
    pt: 0,
    clock: 0,
    doneTime: 0,
    prevStatus: status,
  });

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);

    const pillPath = (cx: number, cy: number, pw: number, ph: number) => {
      const p = new Path2D();
      const r = ph / 2;
      const x = cx - pw / 2;
      const y = cy - ph / 2;
      p.moveTo(x + r, y);
      p.lineTo(x + pw - r, y);
      p.arc(x + pw - r, y + r, r, -Math.PI / 2, Math.PI / 2);
      p.lineTo(x + r, y + ph);
      p.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
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

      const cfg = propsRef.current;
      const anim = animRef.current;
      anim.clock += dt;
      anim.press += (anim.pt - anim.press) * Math.min(1, dt * 16);

      if (cfg.status === 'completed' && anim.prevStatus !== 'completed') {
        anim.doneTime = 0;
      }
      if (cfg.status === 'completed') {
        anim.doneTime += dt;
      }
      anim.prevStatus = cfg.status;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cfg.w, cfg.h);

      const cx = cfg.w / 2;
      const cy = cfg.h / 2;
      const bh = cfg.h * 0.84;
      const rgb = hexToRgb(cfg.accentColor);
      const darkRgb = getDarkAccentRgb(rgb);
      const accent = rgbCss(rgb, 1);
      const dark = rgbCss(darkRgb, 1);

      if (!cfg.status || cfg.status === 'error') {
        const sc = 1 - 0.04 * anim.press;
        ctx.fillStyle = cfg.status === 'error' ? 'rgba(248, 113, 113, 0.92)' : accent;
        ctx.fill(pillPath(cx, cy, cfg.w * sc, bh * sc));
        ctx.font = `600 ${Math.round(bh * 0.36)}px "DM Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = cfg.status === 'error' ? '#1f0909' : dark;
        ctx.fillText(cfg.status === 'error' ? 'Tekrar' : 'İndir', cx, cy + 0.5);
      } else if (cfg.status === 'downloading' || cfg.status === 'queued' || cfg.status === 'paused') {
        const lw = Math.max(5, bh * 0.22);
        const x0 = lw / 2 + 4;
        const x1 = cfg.w - lw / 2 - 4;
        const ep = clamp(cfg.progress / 100, 0, 1);
        const xe = lerp(x0, x1, ep);
        const Aw = cfg.status === 'paused' ? 0 : bh * 0.14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lw;
        ctx.strokeStyle = rgbCss(rgb, 0.24);
        ctx.beginPath();
        ctx.moveTo(x0, cy + 6);
        ctx.lineTo(x1, cy + 6);
        ctx.stroke();

        if (xe > x0 + 1) {
          ctx.strokeStyle = accent;
          ctx.beginPath();
          for (let xx = x0; xx <= xe; xx += 2.5) {
            const env = clamp((xx - x0) / 14, 0, 1) * clamp((xe - xx) / 10, 0, 1);
            const yy = cy + 6 + Math.sin(((xx - x0) / 22) * TAU - anim.clock * 4) * Aw * env;
            if (xx === x0) ctx.moveTo(xx, yy);
            else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
        ctx.font = `600 11px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = accent;
        ctx.fillText(
          cfg.status === 'paused' ? 'Durdu' : `${Math.round(cfg.progress)}%`,
          cx,
          cy - 8
        );
      } else if (cfg.status === 'completed') {
        const m = easeIO(clamp(anim.doneTime / 0.4, 0, 1));
        const R = (bh / 2) * (0.95 + 0.08 * m);
        ctx.fillStyle = accent;
        ctx.fill(knobPath(cx, cy, R, anim.clock * 0.45, m, cfg.shapeId));

        // Crisp checkmark inside morphing badge
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.34, cy + R * 0.02);
        ctx.lineTo(cx - R * 0.08, cy + R * 0.28);
        ctx.lineTo(cx + R * 0.36, cy - R * 0.22);
        ctx.lineWidth = Math.max(2, R * 0.18);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = dark;
        ctx.stroke();
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [w, h]);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-busy={status === 'downloading' || status === 'queued'}
      onClick={onTrigger}
      onPointerDown={() => {
        animRef.current.pt = 1;
      }}
      onPointerUp={() => {
        animRef.current.pt = 0;
      }}
      onPointerLeave={() => {
        animRef.current.pt = 0;
      }}
      style={{ width: w, height: h }}
      className="relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <canvas ref={canvasRef} style={{ width: w, height: h }} className="block" />
    </button>
  );
};
