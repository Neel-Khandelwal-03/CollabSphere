const db = require('../config/db');

async function list(issueId) {
  const { rows } = await db.query(
    `SELECT c.id, c.issue_id, c.user_id, c.comment, c.edited_at, c.created_at,
            u.name AS author_name, u.avatar_url AS author_avatar
     FROM issue_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.issue_id = $1
     ORDER BY c.created_at ASC`,
    [issueId]
  );
  return rows;
}

async function findById(commentId) {
  const { rows } = await db.query('SELECT * FROM issue_comments WHERE id = $1', [commentId]);
  return rows[0] || null;
}

async function create(issueId, userId, comment) {
  const { rows } = await db.query(
    'INSERT INTO issue_comments (issue_id, user_id, comment) VALUES ($1, $2, $3) RETURNING id',
    [issueId, userId, comment]
  );
  const { rows: one } = await db.query(
    `SELECT c.id, c.issue_id, c.user_id, c.comment, c.edited_at, c.created_at,
            u.name AS author_name, u.avatar_url AS author_avatar
     FROM issue_comments c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
    [rows[0].id]
  );
  return one[0];
}

async function update(commentId, comment) {
  const { rows } = await db.query(
    `UPDATE issue_comments SET comment = $1, edited_at = now() WHERE id = $2
     RETURNING id, issue_id, user_id, comment, edited_at, created_at`,
    [comment, commentId]
  );
  return rows[0] || null;
}

async function remove(commentId) {
  await db.query('DELETE FROM issue_comments WHERE id = $1', [commentId]);
}

module.exports = { list, findById, create, update, remove };
