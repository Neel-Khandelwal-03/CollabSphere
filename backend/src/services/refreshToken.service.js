const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashToken } = require('../utils/tokens');
const env = require('../config/env');

function expiresInMsFromNow() {
  // Only supports 'Nd' / 'Nh' / 'Nm' style durations from env, default 30 days.
  const match = /^(\d+)([dhm])$/.exec(env.jwt.refreshExpiresIn);
  const value = match ? parseInt(match[1], 10) : 30;
  const unit = match ? match[2] : 'd';
  const unitMs = { d: 86400000, h: 3600000, m: 60000 }[unit];
  return value * unitMs;
}

/**
 * Issues a new refresh token for a user, persisting its hash so it can be
 * revoked later (logout / logout-all / password change).
 */
async function issue(user, meta = {}) {
  const jti = uuidv4();
  const raw = signRefreshToken(user, jti);
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + expiresInMsFromNow());

  await db.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [jti, user.id, tokenHash, meta.userAgent || null, meta.ip || null, expiresAt]
  );

  return raw;
}

/**
 * Verifies a refresh token's signature AND that it hasn't been revoked
 * or expired server-side. Returns the decoded payload if valid.
 */
async function verify(rawToken) {
  const payload = verifyRefreshToken(rawToken); // throws if invalid/expired signature
  const tokenHash = hashToken(rawToken);

  const { rows } = await db.query(
    `SELECT * FROM refresh_tokens
     WHERE id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > now()`,
    [payload.jti, tokenHash]
  );

  if (rows.length === 0) {
    return null;
  }
  return payload;
}

async function revoke(jti) {
  await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [jti]);
}

async function revokeAllForUser(userId) {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}

module.exports = { issue, verify, revoke, revokeAllForUser };
