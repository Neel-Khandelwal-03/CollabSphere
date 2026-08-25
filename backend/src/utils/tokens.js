const crypto = require('crypto');

/**
 * Generates a random URL-safe token and its SHA-256 hash.
 * The raw token is sent to the client (email link / cookie);
 * only the hash is stored in the database, so a DB leak alone
 * can't be used to forge sessions or reset passwords.
 */
function generateToken(bytes = 48) {
  const raw = crypto.randomBytes(bytes).toString('base64url');
  const hash = hashToken(raw);
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { generateToken, hashToken };
