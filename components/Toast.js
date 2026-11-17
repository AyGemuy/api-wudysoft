import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';

/** const [toast, node] = useToast();  toast('Tersalin'); toast('Gagal', 'err');  lalu render {node} */
export function useToast() {
  const [t, setT] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, type = 'ok') => {
    clearTimeout(timer.current);
    setT({ message, type, id: Date.now() });
    timer.current = setTimeout(() => setT(null), 2800);
  }, []);
  const node = (
    <AnimatePresence>
      {t && (
        <motion.div
          key={t.id}
          className={`ws-toast ${t.type}`}
          role="status"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          {t.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{t.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
  return [show, node];
}
