const db = require('../config/db');
const { generateToken, hashToken } = require('../utils/tokens');

const ONE_HOUR_MS = 60 * 60 * 1000;

async function create(userId) {
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + ONE_HOUR_MS);

  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );

  return raw;
}

async function consume(rawToken) {
  const tokenHash = hashToken(rawToken);
  const { rows } = await db.query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  const record = rows[0];
  if (!record) return null;

  await db.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [
    record.id,
  ]);
  return record;
}

module.exports = { create, consume };
