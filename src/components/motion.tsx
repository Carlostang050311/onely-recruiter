'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** 数字滚动：600ms ease-out；reduced-motion 下直接显示终值 */
export function CountUp({ value, duration = 600 }: { value: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (reduce) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    const from = shown.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (value - from) * eased);
      shown.current = v;
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return <>{display}</>;
}

/** 入场淡入上移：默认 250ms ease-out，可 stagger */
export function FadeIn({
  children,
  delay = 0,
  y = 8,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/** 骨架屏块 */
export function Skeleton({ h = 16, w = '100%', style }: { h?: number | string; w?: number | string; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: h, width: w, ...style }} />;
}
