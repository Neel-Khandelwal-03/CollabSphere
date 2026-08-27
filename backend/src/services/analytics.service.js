const db = require('../config/db');

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };
const MY_WORKSPACES = '(SELECT workspace_id FROM workspace_members WHERE user_id = $1)';

/** Resolves a date-range query param into a `created_at >=` boundary, or null for "all time". */
function resolveSince(range, from) {
  if (range === 'custom' && from) return new Date(from);
  if (RANGE_DAYS[range]) return new Date(Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
  return null;
}

/**
 * Dashboard analytics aggregates across every workspace the user
 * belongs to. Runs as independent, parallel, indexed COUNT queries
 * (via Promise.all) rather than one large join — each metric is
 * unrelated to the others, so this is both simpler and at least as
 * fast as a single mega-query would be, and each piece stays easy to
 * reason about independently.
 */
async function getDashboardAnalytics(userId, { range, from } = {}) {
  const since = resolveSince(range, from);

  const [
    workspaceCount,
    projectCount,
    taskCounts,
    issueCounts,
    unreadNotifications,
    fileCount,
    activeMembers,
    recentActivity,
  ] = await Promise.all([
    db.query('SELECT COUNT(*)::int AS count FROM workspace_members WHERE user_id = $1', [userId]),

    db.query(
      `SELECT COUNT(*)::int AS count FROM projects p
       WHERE p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)
         AND p.archived = false`,
      [userId]
    ),

    db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)`,
      [userId]
    ),

    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE i.status IN ('open', 'in_progress', 'reopened'))::int AS open,
         COUNT(*) FILTER (WHERE i.status IN ('resolved', 'closed'))::int AS resolved
       FROM issues i
       JOIN projects p ON p.id = i.project_id
       WHERE p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)`,
      [userId]
    ),

    db.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),

    db.query(
      `SELECT (
         (SELECT COUNT(*) FROM files f WHERE f.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)) +
         (SELECT COUNT(*) FROM task_attachments ta JOIN tasks t ON t.id = ta.task_id JOIN projects p ON p.id = t.project_id
            WHERE p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)) +
         (SELECT COUNT(*) FROM issue_attachments ia JOIN issues i ON i.id = ia.issue_id JOIN projects p ON p.id = i.project_id
            WHERE p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1))
       )::int AS count`,
      [userId]
    ),

    db.query(
      `SELECT COUNT(DISTINCT a.actor_id)::int AS count
       FROM activity_logs a
       WHERE a.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)
         ${since ? 'AND a.created_at >= $2' : ''}`,
      since ? [userId, since] : [userId]
    ),

    db.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.new_value, a.old_value, a.created_at,
              actor.name AS actor_name, actor.avatar_url AS actor_avatar, w.name AS workspace_name
       FROM activity_logs a
       LEFT JOIN users actor ON actor.id = a.actor_id
       JOIN workspaces w ON w.id = a.workspace_id
       WHERE a.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [userId]
    ),
  ]);

  return {
    totalWorkspaces: workspaceCount.rows[0].count,
    totalProjects: projectCount.rows[0].count,
    totalTasks: taskCounts.rows[0].total,
    completedTasks: taskCounts.rows[0].completed,
    openIssues: issueCounts.rows[0].open,
    resolvedIssues: issueCounts.rows[0].resolved,
    unreadNotifications: unreadNotifications.rows[0].count,
    filesUploaded: fileCount.rows[0].count,
    activeMembers: activeMembers.rows[0].count,
    recentActivity: recentActivity.rows,
  };
}

/**
 * "Active projects" = not archived and not 100% complete by status; a
 * project is only counted as "completed" once its status field
 * literally says so (projects.status is a free-form-ish workflow field
 * set by the team, not inferred from task completion — inferring it
 * would silently override what the team explicitly set).
 */
async function getWorkspaceAnalytics(workspaceId, { range, from } = {}) {
  const since = resolveSince(range, from);

  const [projectCounts, taskCounts, issueCounts, memberCounts, fileCount, recentActivity] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE archived = false AND status != 'completed')::int AS active,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM projects WHERE workspace_id = $1`,
      [workspaceId]
    ),

    db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status != 'completed')::int AS overdue
       FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE p.workspace_id = $1`,
      [workspaceId]
    ),

    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE i.status IN ('open', 'in_progress', 'reopened'))::int AS open,
         COUNT(*) FILTER (WHERE i.status IN ('resolved', 'closed'))::int AS resolved
       FROM issues i JOIN projects p ON p.id = i.project_id
       WHERE p.workspace_id = $1`,
      [workspaceId]
    ),

    db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(DISTINCT a.actor_id)::int AS active
       FROM workspace_members wm
       LEFT JOIN activity_logs a ON a.workspace_id = wm.workspace_id AND a.actor_id = wm.user_id
         ${since ? 'AND a.created_at >= $2' : ''}
       WHERE wm.workspace_id = $1`,
      since ? [workspaceId, since] : [workspaceId]
    ),

    db.query(
      `SELECT (
         (SELECT COUNT(*) FROM files WHERE workspace_id = $1) +
         (SELECT COUNT(*) FROM task_attachments ta JOIN tasks t ON t.id = ta.task_id JOIN projects p ON p.id = t.project_id WHERE p.workspace_id = $1) +
         (SELECT COUNT(*) FROM issue_attachments ia JOIN issues i ON i.id = ia.issue_id JOIN projects p ON p.id = i.project_id WHERE p.workspace_id = $1)
       )::int AS count`,
      [workspaceId]
    ),

    db.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.new_value, a.old_value, a.created_at,
              actor.name AS actor_name, actor.avatar_url AS actor_avatar, p.name AS project_name
       FROM activity_logs a
       LEFT JOIN users actor ON actor.id = a.actor_id
       LEFT JOIN projects p ON p.id = a.project_id
       WHERE a.workspace_id = $1
       ORDER BY a.created_at DESC
       LIMIT 15`,
      [workspaceId]
    ),
  ]);

  return {
    projects: projectCounts.rows[0],
    tasks: taskCounts.rows[0],
    issues: issueCounts.rows[0],
    members: memberCounts.rows[0],
    filesCount: fileCount.rows[0].count,
    recentActivity: recentActivity.rows,
  };
}

async function getProjectAnalytics(projectId) {
  const [taskByStatus, taskOverdue, issueCounts, issuesBySeverity, memberCount, fileCount] = await Promise.all([
    db.query(
      `SELECT status, COUNT(*)::int AS count FROM tasks WHERE project_id = $1 GROUP BY status`,
      [projectId]
    ),

    db.query(
      `SELECT COUNT(*)::int AS count FROM tasks
       WHERE project_id = $1 AND due_date < CURRENT_DATE AND status != 'completed'`,
      [projectId]
    ),

    db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('open', 'in_progress', 'reopened'))::int AS open,
         COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::int AS resolved,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical
       FROM issues WHERE project_id = $1`,
      [projectId]
    ),

    db.query(`SELECT severity, COUNT(*)::int AS count FROM issues WHERE project_id = $1 GROUP BY severity`, [projectId]),

    db.query('SELECT COUNT(*)::int AS count FROM project_members WHERE project_id = $1', [projectId]),

    db.query(
      `SELECT (
         (SELECT COUNT(*) FROM files WHERE project_id = $1) +
         (SELECT COUNT(*) FROM task_attachments ta JOIN tasks t ON t.id = ta.task_id WHERE t.project_id = $1) +
         (SELECT COUNT(*) FROM issue_attachments ia JOIN issues i ON i.id = ia.issue_id WHERE i.project_id = $1)
       )::int AS count`,
      [projectId]
    ),
  ]);

  const statusMap = { backlog: 0, todo: 0, in_progress: 0, testing: 0, completed: 0 };
  taskByStatus.rows.forEach((r) => { statusMap[r.status] = r.count; });
  const totalTasks = Object.values(statusMap).reduce((sum, n) => sum + n, 0);

  return {
    tasks: {
      ...statusMap,
      total: totalTasks,
      overdue: taskOverdue.rows[0].count,
      completionPercent: totalTasks > 0 ? Math.round((statusMap.completed / totalTasks) * 100) : 0,
    },
    issues: {
      ...issueCounts.rows[0],
      bySeverity: issuesBySeverity.rows,
    },
    membersCount: memberCount.rows[0].count,
    filesCount: fileCount.rows[0].count,
  };
}

/** Tasks by priority — its own function since it's project-scoped for the Project Analytics chart but not part of getProjectAnalytics' core numbers (kept separate so the main call stays lean when a caller only needs totals, not every chart). */
async function getTaskPriorityBreakdown(projectId) {
  const { rows } = await db.query(
    `SELECT priority, COUNT(*)::int AS count FROM tasks WHERE project_id = $1 GROUP BY priority`,
    [projectId]
  );
  const map = { low: 0, medium: 0, high: 0, critical: 0 };
  rows.forEach((r) => { map[r.priority] = r.count; });
  return map;
}

/** Weekly task-completion progress over the given range, one point per day — DATE_TRUNC does the bucketing in SQL rather than grouping timestamps in JS. */
async function getWeeklyTaskProgress(projectId, { range = '30d', from } = {}) {
  const since = resolveSince(range, from) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { rows } = await db.query(
    `SELECT DATE_TRUNC('day', updated_at)::date AS day, COUNT(*)::int AS completed
     FROM tasks
     WHERE project_id = $1 AND status = 'completed' AND updated_at >= $2
     GROUP BY day
     ORDER BY day ASC`,
    [projectId, since]
  );
  return rows;
}

/** Activity volume per day for a workspace, for the "Activity Over Time" chart. */
async function getActivityOverTime(workspaceId, { range = '30d', from } = {}) {
  const since = resolveSince(range, from) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { rows } = await db.query(
    `SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS count
     FROM activity_logs
     WHERE workspace_id = $1 AND created_at >= $2
     GROUP BY day
     ORDER BY day ASC`,
    [workspaceId, since]
  );
  return rows;
}

/**
 * Team contribution: tasks completed and issues resolved per member,
 * within a workspace. Deliberately framed as activity indicators, not
 * performance scores — see the frontend TeamContributionChart for the
 * exact wording shown to users, matching the spec's explicit warning
 * against presenting this as an evaluation metric.
 */
async function getTeamContribution(workspaceId, { range, from } = {}) {
  const since = resolveSince(range, from);
  const { rows } = await db.query(
    `SELECT
       u.id AS user_id, u.name, u.avatar_url,
       COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed' ${since ? 'AND t.updated_at >= $2' : ''})::int AS tasks_completed,
       COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('resolved', 'closed') ${since ? 'AND i.updated_at >= $2' : ''})::int AS issues_resolved
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     LEFT JOIN tasks t ON t.assigned_to = u.id AND t.project_id IN (SELECT id FROM projects WHERE workspace_id = $1)
     LEFT JOIN issues i ON i.assignee_id = u.id AND i.project_id IN (SELECT id FROM projects WHERE workspace_id = $1)
     WHERE wm.workspace_id = $1
     GROUP BY u.id, u.name, u.avatar_url
     ORDER BY tasks_completed DESC, issues_resolved DESC`,
    since ? [workspaceId, since] : [workspaceId]
  );
  return rows;
}

/**
 * Task and project deadlines across every workspace the user belongs
 * to, categorized by urgency. Issues have no due_date column in the
 * existing schema — correctly excluded rather than fabricated, matching
 * the spec's own "if supported by the existing model" qualifier.
 */
async function getUpcomingDeadlines(userId) {
  const [tasks, projects] = await Promise.all([
    db.query(
      `SELECT t.id, t.title, t.due_date, p.name AS project_name
       FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE p.workspace_id IN ${MY_WORKSPACES}
         AND t.due_date IS NOT NULL AND t.status != 'completed'
         AND t.due_date <= CURRENT_DATE + INTERVAL '7 days'
       ORDER BY t.due_date ASC
       LIMIT 20`,
      [userId]
    ),
    db.query(
      `SELECT p.id, p.name, p.deadline, w.name AS workspace_name
       FROM projects p JOIN workspaces w ON w.id = p.workspace_id
       WHERE p.workspace_id IN ${MY_WORKSPACES}
         AND p.deadline IS NOT NULL AND p.status != 'completed' AND p.archived = false
         AND p.deadline <= CURRENT_DATE + INTERVAL '7 days'
       ORDER BY p.deadline ASC
       LIMIT 20`,
      [userId]
    ),
  ]);

  const bucket = (dateStr) => {
    const days = Math.floor((new Date(dateStr) - new Date(new Date().toDateString())) / (24 * 60 * 60 * 1000));
    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    return 'this_week';
  };

  return [
    ...tasks.rows.map((t) => ({
      type: 'task',
      id: t.id,
      title: t.title,
      context: t.project_name,
      dueDate: t.due_date,
      bucket: bucket(t.due_date),
      href: `/tasks?open=${t.id}`,
    })),
    ...projects.rows.map((p) => ({
      type: 'project',
      id: p.id,
      title: p.name,
      context: p.workspace_name,
      dueDate: p.deadline,
      bucket: bucket(p.deadline),
      href: `/projects/${p.id}`,
    })),
  ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

module.exports = {
  getDashboardAnalytics,
  getWorkspaceAnalytics,
  getProjectAnalytics,
  getTaskPriorityBreakdown,
  getWeeklyTaskProgress,
  getActivityOverTime,
  getTeamContribution,
  getUpcomingDeadlines,
  resolveSince,
};
