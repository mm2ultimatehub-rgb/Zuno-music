import React, { useEffect, useRef } from 'react';
import { TAU, clamp, getDarkAccentRgb, hexToRgb, rgbCss } from '../../utils/fluidShapes';

interface WaveProgressProps {
  progress: number; // 0 to 100
  accentColor: string;
  variant?: 'liquid' | 'ring' | 'line';
  size?: number;
  showPercent?: boolean;
  paused?: boolean;
}

export const WaveProgress: React.FC<WaveProgressProps> = ({
  progress,
  accentColor,
  variant = 'liquid',
  size = 56,
  showPercent = true,
  paused = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ progress, accentColor, variant, size, showPercent, paused });
  propsRef.current = { progress, accentColor, variant, size, showPercent, paused };

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = variant === 'line' ? size * 2.4 : size;
    const height = size;
    cv.width = Math.round(width * dpr);
    cv.height = Math.round(height * dpr);

    let rafId = 0;
    let acc = 0;
    let lastNow = performance.now();

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - lastNow) / 1000, 0.08);
      lastNow = now;
      const cfg = propsRef.current;
      if (!cfg.paused && !reduceMotion) {
        acc += dt;
      }

      const w = cfg.variant === 'line' ? cfg.size * 2.4 : cfg.size;
      const h = cfg.size;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const ep = clamp(cfg.progress / 100, 0, 1);
      const pctText = `${Math.round(ep * 100)}%`;
      const cx = w / 2;
      const cy = h / 2;
      const rgb = hexToRgb(cfg.accentColor);
      const boxRgb = getDarkAccentRgb(rgb);

      if (cfg.variant === 'liquid') {
        const Rc = h * 0.44;
        const box = new Path2D();
        box.arc(cx, cy, Rc, 0, TAU);
        ctx.fillStyle = rgbCss(boxRgb, 1);
        ctx.fill(box);

        const A = Rc * 0.1 * (cfg.paused ? 0.15 : 0.35 + 0.65 * Math.sin(Math.PI * ep));
        const base = cy + Rc * 1.15 - ep * Rc * 2.3;
        const step = Math.max(2, h / 40);
        const front = new Path2D();
        const back = new Path2D();
        let first = true;
        for (let x = cx - Rc; x <= cx + Rc + step; x += step) {
          const yb = base + Rc * 0.06 + Math.sin((x / (Rc * 1.25)) * TAU + acc * 2.2) * A * 1.1;
          const yf = base + Math.sin((x / (Rc * 0.95)) * TAU - acc * 3.1 + 1.2) * A * 0.85;
          if (first) {
            back.moveTo(x, yb);
            front.moveTo(x, yf);
            first = false;
          } else {
            back.lineTo(x, yb);
            front.lineTo(x, yf);
          }
        }
        const bottom = cy + Rc + 6;
        back.lineTo(cx + Rc + step, bottom);
        back.lineTo(cx - Rc, bottom);
        back.closePath();
        front.lineTo(cx + Rc + step, bottom);
        front.lineTo(cx - Rc, bottom);
        front.closePath();

        ctx.save();
        ctx.clip(box);
        ctx.fillStyle = rgbCss(rgb, 0.42);
        ctx.fill(back);
        ctx.fillStyle = rgbCss(rgb, 1);
        ctx.fill(front);
        if (cfg.showPercent) {
          ctx.font = `600 ${Math.round(h * 0.24)}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = rgbCss(rgb, 0.95);
          ctx.fillText(pctText, cx, cy);
          ctx.save();
          ctx.clip(front);
          ctx.fillStyle = rgbCss(boxRgb, 1);
          ctx.fillText(pctText, cx, cy);
          ctx.restore();
        }
        ctx.restore();
      } else if (cfg.variant === 'ring') {
        const R = h * 0.36;
        const lwr = Math.max(3, h * 0.08);
        const Aw = h * 0.03 * (cfg.paused ? 0.1 : 1);
        const a0 = -Math.PI / 2;
        const total = ep * TAU;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lwr;
        ctx.strokeStyle = rgbCss(rgb, 0.22);
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.stroke();

        if (total > 0.02) {
          ctx.strokeStyle = rgbCss(rgb, 1);
          ctx.beginPath();
          const steps = Math.max(4, Math.ceil(total * 36));
          for (let i = 0; i <= steps; i++) {
            const sa = (total * i) / steps;
            const th = a0 + sa;
            const rr = R + Math.sin(12 * sa - acc * 4) * Aw;
            const px = cx + Math.cos(th) * rr;
            const py = cy + Math.sin(th) * rr;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        if (cfg.showPercent) {
          ctx.font = `600 ${Math.round(h * 0.23)}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = rgbCss(rgb, 0.95);
          ctx.fillText(pctText, cx, cy);
        }
      } else {
        const x0 = 6;
        const x1 = w - 6;
        const xe = x0 + (x1 - x0) * ep;
        const lw = Math.max(4, h * 0.18);
        const Aw = h * 0.12 * (cfg.paused ? 0.1 : 1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lw;
        ctx.strokeStyle = rgbCss(rgb, 0.22);
        ctx.beginPath();
        ctx.moveTo(x0, cy);
        ctx.lineTo(x1, cy);
        ctx.stroke();

        if (xe > x0 + 1) {
          ctx.strokeStyle = rgbCss(rgb, 1);
          ctx.beginPath();
          for (let xx = x0; xx <= xe; xx += 2) {
            const yy = cy + Math.sin(((xx - x0) / 22) * TAU - acc * 4) * Aw;
            if (xx === x0) ctx.moveTo(xx, yy);
            else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [variant, size]);

  const width = variant === 'line' ? size * 2.4 : size;
  return (
    <canvas
      ref={canvasRef}
      style={{ width, height: size }}
      className="block shrink-0"
      aria-label={`İlerleme yüzde ${Math.round(progress)}`}
    />
  );
};
