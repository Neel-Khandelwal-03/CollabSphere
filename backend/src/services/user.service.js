const db = require('../config/db');

const PUBLIC_FIELDS = `
  id, name, email, avatar_url, bio, designation, skills,
  github_url, linkedin_url, portfolio_url, is_email_verified, created_at
`;

async function findByEmail(email) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [
    email.toLowerCase(),
  ]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_FIELDS}`,
    [name, email.toLowerCase(), passwordHash]
  );
  return rows[0];
}

async function updatePassword(userId, passwordHash) {
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    passwordHash,
    userId,
  ]);
}

async function updateProfile(userId, fields) {
  const allowed = [
    'name',
    'bio',
    'designation',
    'skills',
    'github_url',
    'linkedin_url',
    'portfolio_url',
    'avatar_url',
  ];
  const sets = [];
  const values = [];
  let i = 1;
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = $${i}`);
      values.push(fields[key]);
      i += 1;
    }
  }
  if (sets.length === 0) return findById(userId);

  values.push(userId);
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING ${PUBLIC_FIELDS}`,
    values
  );
  return rows[0];
}

module.exports = { findByEmail, findById, create, updatePassword, updateProfile };
