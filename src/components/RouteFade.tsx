'use client';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

/** 路由切换淡入（与参照稿 .view fade 同感） */
export default function RouteFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      className="content"
      key={pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
