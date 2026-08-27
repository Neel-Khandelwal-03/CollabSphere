'use client';

import { useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/Select';
import Avatar from '@/components/ui/Avatar';

/**
 * `candidates` is the list of people mentionable in THIS context —
 * workspace members for task/issue comments and group chat, or just the
 * other DM participant for a direct conversation. The caller decides
 * that scope; this component only handles detecting "@", filtering, and
 * inserting the structured @[Name](userId) token — never free-text
 * @username parsing, matching the backend's mention format exactly
 * (see backend/src/utils/mentions.js).
 */
export default function MentionTextarea({ value, onChange, candidates, onKeyDown, ...props }) {
  const [query, setQuery] = useState(null); // null = not currently mentioning
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef(null);

  const matches = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return candidates.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, candidates]);

  const detectMention = (text, cursorPos) => {
    const before = text.slice(0, cursorPos);
    const match = before.match(/(?:^|\s)@(\w*)$/);
    if (match) {
      setQuery(match[1]);
      setActiveIndex(0);
    } else {
      setQuery(null);
    }
  };

  const handleChange = (e) => {
    onChange(e);
    detectMention(e.target.value, e.target.selectionStart);
  };

  const insertMention = (candidate) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const beforeMatch = before.match(/(?:^|\s)@\w*$/);
    const start = beforeMatch ? cursorPos - beforeMatch[0].length + (beforeMatch[0].startsWith(' ') ? 1 : 0) : cursorPos;

    const token = `@[${candidate.name}](${candidate.id}) `;
    const newValue = value.slice(0, start) + token + after;
    onChange({ target: { value: newValue } });
    setQuery(null);

    // Restore focus and place the cursor right after the inserted token.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e) => {
    if (query !== null && matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % matches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(matches[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setQuery(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        {...props}
      />
      {query !== null && matches.length > 0 && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-64 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {matches.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMention(c)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                i === activeIndex ? 'bg-brand-tint/50' : 'hover:bg-ink/[0.03]'
              }`}
            >
              <Avatar name={c.name} src={c.avatarUrl} size={22} />
              <span className="truncate text-ink">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
