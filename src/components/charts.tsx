'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

/** ECharts 容器：初始化 + option 更新 + 尺寸自适应 */
export function EChart({ option, className }: { option: Record<string, unknown>; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current);
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      inst.current?.dispose();
      inst.current = null;
    };
  }, []);

  useEffect(() => {
    inst.current?.setOption(option as echarts.EChartsOption, true);
  }, [option]);

  return <div ref={ref} className={className ?? 'chart-box'} />;
}

export const AX_COLOR = '#b39e98';
export const GRID_COLOR = 'rgba(255,255,255,.06)';

export function baseAxis() {
  return {
    axisLine: { lineStyle: { color: '#4d3b42' } },
    axisLabel: { color: AX_COLOR, fontSize: 11 },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: GRID_COLOR } },
  };
}
