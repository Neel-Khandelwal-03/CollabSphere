const db = require('../config/db');

async function list(issueId) {
  const { rows } = await db.query(
    `SELECT a.id, a.issue_id, a.uploaded_by, a.file_name, a.file_url, a.file_type, a.file_size,
            a.public_id, a.resource_type, a.folder, a.created_at,
            u.name AS uploaded_by_name
     FROM issue_attachments a
     LEFT JOIN users u ON u.id = a.uploaded_by
     WHERE a.issue_id = $1
     ORDER BY a.created_at DESC`,
    [issueId]
  );
  return rows;
}

async function findById(attachmentId) {
  const { rows } = await db.query('SELECT * FROM issue_attachments WHERE id = $1', [attachmentId]);
  return rows[0] || null;
}

async function create({ issueId, uploadedBy, fileName, fileUrl, fileType, fileSize, publicId, resourceType, folder }) {
  const { rows } = await db.query(
    `INSERT INTO issue_attachments (issue_id, uploaded_by, file_name, file_url, file_type, file_size, public_id, resource_type, folder)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, issue_id, uploaded_by, file_name, file_url, file_type, file_size, public_id, resource_type, folder, created_at`,
    [issueId, uploadedBy, fileName, fileUrl, fileType, fileSize, publicId, resourceType, folder]
  );
  return rows[0];
}

async function remove(attachmentId) {
  await db.query('DELETE FROM issue_attachments WHERE id = $1', [attachmentId]);
}

module.exports = { list, findById, create, remove };
