'use client';
import { MotionConfig } from 'framer-motion';

/** 全局动效配置：尊重系统「减少动态效果」偏好 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
