const db = require('../config/db');

async function list(taskId) {
  const { rows } = await db.query(
    `SELECT a.id, a.task_id, a.uploaded_by, a.file_name, a.file_url, a.file_type, a.file_size, a.created_at,
            u.name AS uploaded_by_name
     FROM task_attachments a
     LEFT JOIN users u ON u.id = a.uploaded_by
     WHERE a.task_id = $1
     ORDER BY a.created_at DESC`,
    [taskId]
  );
  return rows;
}

async function findById(attachmentId) {
  const { rows } = await db.query('SELECT * FROM task_attachments WHERE id = $1', [attachmentId]);
  return rows[0] || null;
}

async function create({ taskId, uploadedBy, fileName, fileUrl, fileType, fileSize }) {
  const { rows } = await db.query(
    `INSERT INTO task_attachments (task_id, uploaded_by, file_name, file_url, file_type, file_size)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, task_id, uploaded_by, file_name, file_url, file_type, file_size, created_at`,
    [taskId, uploadedBy, fileName, fileUrl, fileType, fileSize]
  );
  return rows[0];
}

async function remove(attachmentId) {
  await db.query('DELETE FROM task_attachments WHERE id = $1', [attachmentId]);
}

module.exports = { list, findById, create, remove };
