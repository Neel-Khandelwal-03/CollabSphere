'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Modal({ open, onClose, title, description, children, className }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl',
              className
            )}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md p-1 text-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
            {title && (
              <h2 className="pr-8 font-display text-lg font-semibold text-ink">{title}</h2>
            )}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            <div className={title ? 'mt-5' : ''}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
