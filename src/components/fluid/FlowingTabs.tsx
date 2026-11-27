import React, { useEffect, useRef } from 'react';
import {
  FLUID_SHAPES,
  SHAPE_SAMPLE_COUNT,
  TAU,
  clamp,
  getContrastTextHex,
  getDarkAccentRgb,
  hexToRgb,
  rgbCss,
} from '../../utils/fluidShapes';
import type { FluidShapeId, TabIndicatorStyle } from '../../types/music';

export interface FlowingTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface FlowingTabsProps {
  items: FlowingTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  accentColor: string;
  styleMode?: TabIndicatorStyle;
  shapeId?: FluidShapeId;
  speed?: number;
  stretch?: number;
  compact?: boolean;
  ariaLabel?: string;
  className?: string;
  darkMode?: boolean;
}

export const FlowingTabs: React.FC<FlowingTabsProps> = ({
  items,
  activeId,
  onSelect,
  accentColor,
  styleMode = 'pill',
  shapeId = 'burst',
  speed = 1,
  stretch = 0.7,
  compact = false,
  ariaLabel = 'Gezinme',
  className = '',
  darkMode = true,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIdx = Math.max(0, items.findIndex((item) => item.id === activeId));

  const stateRef = useRef({
    L: 0,
    R: 0,
    vl: 0,
    vr: 0,
    tl: 0,
    tr: 0,
    ty: 0,
    th: 0,
    w: 0,
    h: 0,
    dir: 1,
    ready: false,
    clock: 0,
    activeIdx,
    accentColor,
    styleMode,
    shapeId,
    speed,
    stretch,
    darkMode,
  });

  stateRef.current.accentColor = accentColor;
  stateRef.current.styleMode = styleMode;
  stateRef.current.shapeId = shapeId;
  stateRef.current.speed = speed;
  stateRef.current.stretch = stretch;
  stateRef.current.darkMode = darkMode;

  useEffect(() => {
    const st = stateRef.current;
    const btn = btnRefs.current[activeIdx];
    if (btn) {
      const oldC = (st.L + st.R) / 2;
      const newC = btn.offsetLeft + btn.offsetWidth / 2;
      if (st.ready && activeIdx !== st.activeIdx) {
        st.dir = newC >= oldC ? 1 : -1;
      }
      st.activeIdx = activeIdx;
      st.tl = btn.offsetLeft;
      st.tr = btn.offsetLeft + btn.offsetWidth;
      st.ty = btn.offsetTop;
      st.th = btn.offsetHeight;
      if (!st.ready) {
        st.L = st.tl;
        st.R = st.tr;
        st.ready = true;
      }
    }
  }, [activeIdx, items.length, compact]);

  useEffect(() => {
    const root = rootRef.current;
    const cv = canvasRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dpr = 1;
    const measureLayout = (snap: boolean) => {
      const st = stateRef.current;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.w = root.clientWidth;
      st.h = root.clientHeight;
      cv.width = Math.round(st.w * dpr);
      cv.height = Math.round(st.h * dpr);
      const btn = btnRefs.current[st.activeIdx];
      if (btn) {
        st.tl = btn.offsetLeft;
        st.tr = btn.offsetLeft + btn.offsetWidth;
        st.ty = btn.offsetTop;
        st.th = btn.offsetHeight;
        if (snap || !st.ready) {
          st.L = st.tl;
          st.R = st.tr;
          st.vl = 0;
          st.vr = 0;
          st.ready = true;
        }
      }
    };

    measureLayout(true);
    const ro = new ResizeObserver(() => measureLayout(true));
    ro.observe(root);

    let rafId = 0;
    let last = performance.now();

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const st = stateRef.current;
      const btn = btnRefs.current[st.activeIdx];
      if (btn) {
        st.tl = btn.offsetLeft;
        st.tr = btn.offsetLeft + btn.offsetWidth;
        st.ty = btn.offsetTop;
        st.th = btn.offsetHeight;
      }

      st.clock += dt * st.speed;

      if (reduceMotion) {
        st.L = st.tl;
        st.R = st.tr;
        st.vl = 0;
        st.vr = 0;
      } else {
        const fastK = 320 * st.speed * st.speed;
        const slowK = fastK * (1 - 0.72 * st.stretch);
        const kr = st.dir > 0 ? fastK : slowK;
        const kl = st.dir > 0 ? slowK : fastK;
        const zr = st.dir > 0 ? 0.56 : 0.8;
        const zl = st.dir > 0 ? 0.8 : 0.56;
        const steps = 3;
        const hh = dt / steps;
        for (let j = 0; j < steps; j++) {
          st.vr += ((st.tr - st.R) * kr - st.vr * 2 * Math.sqrt(kr) * zr) * hh;
          st.R += st.vr * hh;
          st.vl += ((st.tl - st.L) * kl - st.vl * 2 * Math.sqrt(kl) * zl) * hh;
          st.L += st.vl * hh;
        }
      }

      if (st.w > 0 && st.h > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, st.w, st.h);

        const L = st.L;
        const R = st.R;
        const top = st.ty;
        const h = st.th || (compact ? 40 : 52);
        const cx = (L + R) / 2;
        const wI = Math.max(R - L, 4);
        const tabW = btn?.offsetWidth || wI;
        const rgb = hexToRgb(st.accentColor);
        const accent = rgbCss(rgb, 1);

        if (st.styleMode === 'pill') {
          const r = Math.min(h / 2, wI / 2);
          ctx.beginPath();
          ctx.moveTo(L + r, top);
          ctx.lineTo(R - r, top);
          ctx.arc(R - r, top + r, r, -Math.PI / 2, 0);
          ctx.lineTo(R, top + h - r);
          ctx.arc(R - r, top + h - r, r, 0, Math.PI / 2);
          ctx.lineTo(L + r, top + h);
          ctx.arc(L + r, top + h - r, r, Math.PI / 2, Math.PI);
          ctx.lineTo(L, top + r);
          ctx.arc(L + r, top + r, r, Math.PI, Math.PI * 1.5);
          ctx.closePath();
          ctx.fillStyle = accent;
          ctx.fill();
        } else if (st.styleMode === 'shape') {
          const shapeArr = FLUID_SHAPES[st.shapeId]?.r || FLUID_SHAPES.burst.r;
          const Rm = Math.min(8, h * 0.14);
          const sx = clamp(wI / tabW, 0.7, 1.85);
          const sy = 1 / Math.sqrt(sx);
          const p = new Path2D();
          const rot = (cx / Math.max(24, h)) * 0.8 + st.clock * 0.6;
          for (let i = 0; i < SHAPE_SAMPLE_COUNT; i++) {
            const rad = shapeArr[i] / 0.92;
            const ang = (i / SHAPE_SAMPLE_COUNT) * TAU + rot;
            const px = Math.cos(ang) * Rm * rad;
            const py = Math.sin(ang) * Rm * rad;
            if (i === 0) p.moveTo(px, py);
            else p.lineTo(px, py);
          }
          p.closePath();
          ctx.save();
          ctx.translate(cx, top + (compact ? h * 0.22 : 11));
          ctx.scale(sx, sy);
          ctx.fillStyle = accent;
          ctx.fill(p);
          ctx.restore();
        } else {
          const y0 = top + h - 5;
          const x0 = L + tabW * 0.16;
          const x1 = R - tabW * 0.16;
          const motion = Math.min(2.6, (Math.abs(st.vl) + Math.abs(st.vr)) * 0.005);
          const amp = reduceMotion ? 0 : 1.6 + motion;
          ctx.lineWidth = Math.max(2.5, h * 0.065);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = accent;
          ctx.beginPath();
          const endX = Math.max(x0 + 4, x1);
          for (let x = x0; x <= endX; x += 3) {
            const f = (x - x0) / (endX - x0);
            const yy =
              y0 +
              Math.sin(((x - x0) / Math.max(16, h * 0.5)) * TAU - st.clock * 5) *
                amp *
                Math.sin(Math.PI * f);
            if (x === x0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
          }
          ctx.lineTo(endX, y0);
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [compact]);

  const darkAccentHex = getContrastTextHex(accentColor);
  const darkFallbackRgb = getDarkAccentRgb(hexToRgb(accentColor));
  const pillActiveColor = darkAccentHex === '#0b0e16' ? rgbCss(darkFallbackRgb, 1) : '#ffffff';

  return (
    <div
      ref={rootRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex items-center rounded-full p-1.5 border transition-colors ${
        compact ? 'w-max min-w-full' : 'w-full'
      } ${
        darkMode
          ? 'bg-[#121722]/90 border-white/10 backdrop-blur-xl'
          : 'bg-white/90 border-slate-900/10 backdrop-blur-xl shadow-sm'
      } ${className}`}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {items.map((item, idx) => {
        const isActive = item.id === activeId;
        const textStyle =
          isActive && styleMode === 'pill'
            ? { color: pillActiveColor }
            : isActive
              ? { color: accentColor }
              : undefined;

        return (
          <button
            key={item.id}
            ref={(el) => {
              btnRefs.current[idx] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => {
              let dir = 0;
              if (e.key === 'ArrowRight') dir = 1;
              else if (e.key === 'ArrowLeft') dir = -1;
              else return;
              e.preventDefault();
              const nextIdx = (idx + dir + items.length) % items.length;
              onSelect(items[nextIdx].id);
              btnRefs.current[nextIdx]?.focus();
            }}
            style={textStyle}
            className={`relative z-10 flex items-center justify-center whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              compact
                ? 'flex-1 shrink-0 h-9 px-4 gap-1.5 text-xs'
                : 'flex-1 min-w-0 h-[52px] flex-col gap-0.5 px-1 text-[11px]'
            } ${
              !isActive
                ? darkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
                : ''
            } ${styleMode === 'shape' && !compact ? 'pt-3' : ''}`}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className={compact ? 'whitespace-nowrap' : 'truncate max-w-full'}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
