/**
 * Mention syntax: @[Display Name](userId) — a structured token the
 * frontend's autocomplete inserts when a user picks a match, not
 * free-text @username parsing. There's no username field on the user
 * model (just name/email), and open-ended "@Full Name" extraction from
 * prose is genuinely ambiguous (multi-word names, partial matches,
 * substring collisions). The display name in the token is decoration
 * only — the backend never trusts it for anything; the userId is the
 * only part that's ever validated or acted on, exactly matching the
 * spec's "do not rely only on client-side parsing."
 */
const MENTION_PATTERN = /@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g;

/** Extracts every mention token's userId from raw text, deduplicated, preserving first-seen order. */
function extractMentionedUserIds(text) {
  if (!text) return [];
  const ids = [];
  const seen = new Set();
  let match;
  MENTION_PATTERN.lastIndex = 0;
  while ((match = MENTION_PATTERN.exec(text)) !== null) {
    const userId = match[2];
    if (!seen.has(userId)) {
      seen.add(userId);
      ids.push(userId);
    }
  }
  return ids;
}

module.exports = { MENTION_PATTERN, extractMentionedUserIds, resolveValidMentions };

/**
 * Filters extracted mention userIds down to only those the caller says
 * are actually authorized in this context (workspace members for task/
 * issue comments, conversation participants for chat) — dropping the
 * rest silently rather than throwing, since an error naming which
 * mention failed would confirm to the mentioner that an unauthorized
 * user exists at all, which the spec explicitly says not to leak.
 */
function resolveValidMentions(text, authorizedUserIds) {
  const authorized = authorizedUserIds instanceof Set ? authorizedUserIds : new Set(authorizedUserIds);
  return extractMentionedUserIds(text).filter((id) => authorized.has(id));
}
