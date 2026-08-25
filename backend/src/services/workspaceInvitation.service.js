const db = require('../config/db');
const { generateToken, hashToken } = require('../utils/tokens');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Creates a new pending invitation, or refreshes the token/role/expiry of
 * an existing pending one for the same (workspace, email) — enforced by
 * the partial unique index in the migration.
 */
async function createOrRefresh({ workspaceId, email, role, invitedBy }) {
  const { raw, hash } = generateToken(32);
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

  const { rows } = await db.query(
    `INSERT INTO workspace_invitations (workspace_id, email, role, invited_by, invitation_token, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (workspace_id, email) WHERE accepted IS NULL
     DO UPDATE SET role = EXCLUDED.role, invitation_token = EXCLUDED.invitation_token,
                   expires_at = EXCLUDED.expires_at, invited_by = EXCLUDED.invited_by
     RETURNING id, workspace_id, email, role, expires_at, created_at`,
    [workspaceId, email.toLowerCase(), role, invitedBy, hash, expiresAt]
  );

  return { invitation: rows[0], rawToken: raw };
}

async function findPendingByToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const { rows } = await db.query(
    `SELECT * FROM workspace_invitations
     WHERE invitation_token = $1 AND accepted IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function respond(invitationId, accepted) {
  const { rows } = await db.query(
    `UPDATE workspace_invitations SET accepted = $1, responded_at = now()
     WHERE id = $2 RETURNING *`,
    [accepted, invitationId]
  );
  return rows[0] || null;
}

async function listPendingForWorkspace(workspaceId) {
  const { rows } = await db.query(
    `SELECT id, email, role, expires_at, created_at
     FROM workspace_invitations
     WHERE workspace_id = $1 AND accepted IS NULL AND expires_at > now()
     ORDER BY created_at DESC`,
    [workspaceId]
  );
  return rows;
}

module.exports = { createOrRefresh, findPendingByToken, respond, listPendingForWorkspace };
