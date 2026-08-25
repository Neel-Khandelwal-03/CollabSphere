'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * Portal-rendered tooltip — the floating label is appended to
 * document.body with `position: fixed` coordinates computed from the
 * trigger's own bounding rect, rather than `position: absolute` relative
 * to a wrapper inside the sidebar.
 *
 * Root cause this fixes: the previous version positioned the label
 * `absolute left-full` inside a `relative` wrapper that lives inside the
 * sidebar's nav-items container (which sets `overflow-y-auto`). Per the
 * CSS overflow spec, setting only one axis to a non-`visible` value
 * computes the *other* axis to `auto` too — so that container became
 * horizontally scrollable, and the tooltip's wide `whitespace-nowrap`
 * label (e.g. a full name + email) contributed to its scrollable area
 * even while invisible (opacity-0). A portal sidesteps this entirely:
 * the label is never a descendant of any sidebar container, so it can't
 * contribute to any of their overflow regions, collapsed or expanded.
 */
export default function Tooltip({ label, show = true, children }) {
  const triggerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 });
  }, [visible]);

  if (!show) return children;

  return (
    <>
      <div
        ref={triggerRef}
        className="flex"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
      </div>
      {visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            style={{ top: coords.top, left: coords.left, transform: 'translateY(-50%)' }}
            className={cn(
              'pointer-events-none fixed z-50 whitespace-nowrap rounded-md',
              'bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-lg'
            )}
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}
