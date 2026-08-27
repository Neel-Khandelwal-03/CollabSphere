const MENTION_PATTERN = /@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g;

/**
 * Splits text containing @[Name](userId) tokens into an array of plain
 * strings and { mention: name } markers, for the caller to render
 * however fits its context (used by MentionText below, and directly by
 * MessageBubble which needs slightly different styling for its own
 * bubble background).
 */
export function splitMentionText(text) {
  if (!text) return [];
  const parts = [];
  let lastIndex = 0;
  let match;
  MENTION_PATTERN.lastIndex = 0;
  while ((match = MENTION_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push({ mention: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/** Default rendering: mentions as a subtle highlighted, bold inline span. */
export default function MentionText({ text, className = '', mentionClassName = '' }) {
  const parts = splitMentionText(text);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <span key={i}>{part}</span>
        ) : (
          <span
            key={i}
            className={mentionClassName || 'rounded bg-brand-tint px-1 py-0.5 font-medium text-brand-strong'}
          >
            @{part.mention}
          </span>
        )
      )}
    </span>
  );
}
