'use client';
import { AnimatePresence, motion } from 'framer-motion';

/** 全局 toast：滑入 + 弹性，退出收缩淡出 */
export default function Toast({ msg }: { msg: string }) {
  return (
    <AnimatePresence>
      {msg ? (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        >
          {msg}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
