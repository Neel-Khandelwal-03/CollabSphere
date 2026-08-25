const db = require('../config/db');
const ApiError = require('../utils/ApiError');

const ROLE_RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };

/**
 * Requires the authenticated user to be a member of :workspaceId with at
 * least `minRole`. Attaches req.workspaceRole on success. Used by
 * workspace/project/task routes added in later modules; kept here now so
 * the RBAC story is established alongside auth.
 *
 * Usage: router.post('/:workspaceId/...', authenticate, requireWorkspaceRole('admin'), handler)
 */
function requireWorkspaceRole(minRole = 'member') {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.body.workspaceId;
      if (!workspaceId) {
        return next(ApiError.badRequest('workspaceId is required'));
      }

      const { rows } = await db.query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [workspaceId, req.user.id]
      );

      if (rows.length === 0) {
        return next(ApiError.forbidden('You are not a member of this workspace'));
      }

      const role = rows[0].role;
      if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
        return next(ApiError.forbidden(`Requires ${minRole} role or higher`));
      }

      req.workspaceRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requireWorkspaceRole;
