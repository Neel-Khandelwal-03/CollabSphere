'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const PALETTE = ['#6E56CF', '#1B8A5A', '#5B6B85', '#B34AA3', '#2E7DBF'];

function hashToIndex(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % PALETTE.length;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

/**
 * Renders a logo/photo when `src` is provided and loads successfully;
 * falls back to a deterministic-color initials badge otherwise (missing
 * src, empty string, or a broken/unreachable URL).
 */
export default function Avatar({ name, src, size = 36, className }) {
  const [imgFailed, setImgFailed] = useState(false);
  const bg = PALETTE[hashToIndex(name || '?')];

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        onError={() => setImgFailed(true)}
        className={cn('shrink-0 rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full font-medium text-white', className)}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
