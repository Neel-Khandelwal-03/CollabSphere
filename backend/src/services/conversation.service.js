const db = require('../config/db');

const SELECT_FIELDS = `
  c.id, c.type, c.workspace_id, c.project_id, c.created_at,
  w.name AS workspace_name,
  p.name AS project_name
`;
const JOINS = `
  JOIN workspaces w ON w.id = c.workspace_id
  LEFT JOIN projects p ON p.id = c.project_id
`;

async function findById(conversationId) {
  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM conversations c ${JOINS} WHERE c.id = $1`,
    [conversationId]
  );
  return rows[0] || null;
}

/**
 * Returns the workspace's single chat conversation, creating it on first
 * access. Deliberately NOT created when the workspace itself is created —
 * that would mean touching workspace.controller.js for a Chat-module
 * concern. The partial unique index on (workspace_id) WHERE
 * type='workspace' makes this safe even if two requests race: the loser
 * of the INSERT just re-selects the winner's row.
 */
async function getOrCreateWorkspaceConversation(workspaceId) {
  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM conversations c ${JOINS}
     WHERE c.workspace_id = $1 AND c.type = 'workspace'`,
    [workspaceId]
  );
  if (rows[0]) return rows[0];

  await db.query(
    `INSERT INTO conversations (type, workspace_id) VALUES ('workspace', $1)
     ON CONFLICT (workspace_id) WHERE type = 'workspace' DO NOTHING`,
    [workspaceId]
  );
  return getOrCreateWorkspaceConversation(workspaceId);
}

/** Same get-or-create pattern as workspace chat, scoped to a project. */
async function getOrCreateProjectConversation(projectId, workspaceId) {
  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM conversations c ${JOINS}
     WHERE c.project_id = $1 AND c.type = 'project'`,
    [projectId]
  );
  if (rows[0]) return rows[0];

  await db.query(
    `INSERT INTO conversations (type, workspace_id, project_id) VALUES ('project', $1, $2)
     ON CONFLICT (project_id) WHERE type = 'project' DO NOTHING`,
    [workspaceId, projectId]
  );
  return getOrCreateProjectConversation(projectId, workspaceId);
}

/**
 * Finds (or creates) the 1:1 direct conversation between two users within
 * a workspace. There's no simple partial-unique-index trick for "exactly
 * these two participants," so this uses a transaction with a row lock on
 * the pair to make concurrent calls safe.
 */
/**
 * Finds (or creates) the 1:1 direct conversation between two users within
 * a workspace, via a single atomic INSERT ... ON CONFLICT against the
 * sorted-pair unique index — the same race-safe pattern as workspace/
 * project chat above. An earlier version of this function did a
 * SELECT ... FOR UPDATE first, but that only locks a row if one already
 * exists; two truly concurrent first-time callers would both pass the
 * "not found" check and both insert, producing duplicate DM
 * conversations. Caught by testing before this was ever wired to a
 * route.
 */
async function getOrCreateDirectConversation(workspaceId, userIdA, userIdB) {
  const [minId, maxId] = [userIdA, userIdB].sort();

  return db.withTransaction(async (client) => {
    const { rows: inserted } = await client.query(
      `INSERT INTO conversations (type, workspace_id, direct_user_min_id, direct_user_max_id)
       VALUES ('direct', $1, $2, $3)
       ON CONFLICT (workspace_id, direct_user_min_id, direct_user_max_id) WHERE type = 'direct'
       DO NOTHING
       RETURNING id`,
      [workspaceId, minId, maxId]
    );

    let conversationId;
    if (inserted[0]) {
      conversationId = inserted[0].id;
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [conversationId, userIdA, userIdB]
      );
    } else {
      const { rows: existing } = await client.query(
        `SELECT id FROM conversations
         WHERE workspace_id = $1 AND type = 'direct' AND direct_user_min_id = $2 AND direct_user_max_id = $3`,
        [workspaceId, minId, maxId]
      );
      conversationId = existing[0].id;
    }

    // Deliberately using `client` here, not the module-level findById()
    // (which uses a different pooled connection) — reading through a
    // separate connection before this transaction commits would see
    // pre-insert data. Same bug class caught in Checkpoint 4's move().
    const { rows } = await client.query(
      `SELECT ${SELECT_FIELDS} FROM conversations c ${JOINS} WHERE c.id = $1`,
      [conversationId]
    );
    return rows[0];
  });
}

async function isParticipant(conversationId, userId) {
  const { rows } = await db.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  return rows.length > 0;
}

/** All DM conversations a user is part of, with the other participant's info and last message preview. */
async function listDirectForUser(userId) {
  const { rows } = await db.query(
    `SELECT c.id, c.workspace_id, w.name AS workspace_name,
            other.id AS other_user_id, other.name AS other_user_name, other.avatar_url AS other_user_avatar,
            lm.content AS last_message, lm.created_at AS last_message_at
     FROM conversations c
     JOIN workspaces w ON w.id = c.workspace_id
     JOIN conversation_participants mine ON mine.conversation_id = c.id AND mine.user_id = $1
     JOIN conversation_participants theirs ON theirs.conversation_id = c.id AND theirs.user_id <> $1
     JOIN users other ON other.id = theirs.user_id
     LEFT JOIN LATERAL (
       SELECT content, created_at FROM messages m
       WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1
     ) lm ON true
     WHERE c.type = 'direct'
     ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  findById,
  getOrCreateWorkspaceConversation,
  getOrCreateProjectConversation,
  getOrCreateDirectConversation,
  isParticipant,
  listDirectForUser,
};
