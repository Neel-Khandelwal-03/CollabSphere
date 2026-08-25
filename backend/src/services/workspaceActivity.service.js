const db = require('../config/db');

/**
 * Computes a "recent activity" feed for a workspace entirely from data
 * that already exists — workspace creation, member joins, and invitation
 * lifecycle events. Deliberately NOT a general-purpose activity_logs
 * table (that's the dedicated Activity Logs module, out of scope here);
 * this is just an honest view over what Workspace Management already
 * tracks, since the checkpoint spec calls for "Recent Activity" on the
 * workspace detail page.
 */
async function listRecentActivity(workspaceId, limit = 15) {
  const { rows } = await db.query(
    `
    SELECT 'workspace_created' AS type, u.name AS actor_name, NULL::text AS target_label,
           NULL::text AS role, w.created_at AS occurred_at
    FROM workspaces w
    JOIN users u ON u.id = w.owner_id
    WHERE w.id = $1

    UNION ALL

    SELECT 'member_joined' AS type, u.name AS actor_name, NULL::text AS target_label,
           wm.role::text AS role, wm.joined_at AS occurred_at
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = $1 AND wm.role <> 'owner'

    UNION ALL

    SELECT 'invitation_sent' AS type, inviter.name AS actor_name, wi.email AS target_label,
           wi.role::text AS role, wi.created_at AS occurred_at
    FROM workspace_invitations wi
    LEFT JOIN users inviter ON inviter.id = wi.invited_by
    WHERE wi.workspace_id = $1

    UNION ALL

    SELECT CASE WHEN wi.accepted THEN 'invitation_accepted' ELSE 'invitation_rejected' END AS type,
           NULL::text AS actor_name, wi.email AS target_label, wi.role::text AS role,
           wi.responded_at AS occurred_at
    FROM workspace_invitations wi
    WHERE wi.workspace_id = $1 AND wi.responded_at IS NOT NULL

    ORDER BY occurred_at DESC
    LIMIT $2
    `,
    [workspaceId, limit]
  );
  return rows;
}

module.exports = { listRecentActivity };
