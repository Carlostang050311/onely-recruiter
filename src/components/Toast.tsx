'use client';
import { AnimatePresence, motion } from 'framer-motion';

/** 堆叠 toast：绿点 + 弹入 */
export default function Toast({ msg }: { msg: string }) {
  return (
    <div className="toast-wrap">
      <AnimatePresence>
        {msg ? (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <span className="tdot" />
            {msg}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
