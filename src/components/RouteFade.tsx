'use client';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

/** 路由切换：内容区淡入上移 180ms（key 变更触发重挂载） */
export default function RouteFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.main
      className="main"
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.main>
  );
}
