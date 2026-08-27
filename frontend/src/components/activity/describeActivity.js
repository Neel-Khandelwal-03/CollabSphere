const ACTION_ICONS = {
  task: '✓',
  issue: '⚠',
  project: '▣',
  workspace_member: '◐',
  project_member: '◐',
  file: '⇧',
};

/**
 * Converts an activity_logs row into a short, human-readable sentence.
 * Relies entirely on old_value/new_value's own embedded name/title
 * snapshots (captured at log time by each controller) rather than a
 * live lookup — the entity itself may since have changed or been
 * deleted, and the log should describe what happened *then*, not
 * whatever the entity looks like now.
 */
export function describeActivity(a) {
  const actor = a.actor_name || 'Someone';
  const nv = a.new_value || {};
  const ov = a.old_value || {};

  switch (a.action) {
    case 'task.created':
      return `${actor} created task "${nv.title}"`;
    case 'task.reassigned':
      return `${actor} reassigned a task`;
    case 'task.updated':
      return `${actor} updated ${nv.title ? `task "${nv.title}"` : 'a task'}`;
    case 'task.status_changed':
    case 'task.moved':
      return `${actor} moved a task from ${ov.status || '?'} to ${nv.status || '?'}`;
    case 'task.deleted':
      return `${actor} deleted task "${ov.title}"`;
    case 'task.comment_added':
      return `${actor} commented on a task`;
    case 'issue.created':
      return `${actor} created issue "${nv.title}"`;
    case 'issue.reassigned':
      return `${actor} reassigned an issue`;
    case 'issue.status_changed':
      return `${actor} changed issue status from ${ov.status || '?'} to ${nv.status || '?'}`;
    case 'issue.closed':
      return `${actor} closed an issue`;
    case 'issue.reopened':
      return `${actor} reopened an issue`;
    case 'issue.priority_changed':
      return `${actor} changed issue priority from ${ov.priority || '?'} to ${nv.priority || '?'}`;
    case 'issue.severity_changed':
      return `${actor} changed issue severity from ${ov.severity || '?'} to ${nv.severity || '?'}`;
    case 'issue.task_linked':
      return `${actor} linked a task to an issue`;
    case 'issue.task_unlinked':
      return `${actor} unlinked a task from an issue`;
    case 'issue.deleted':
      return `${actor} deleted issue "${ov.title}"`;
    case 'issue.comment_added':
      return `${actor} commented on an issue`;
    case 'project.created':
      return `${actor} created project "${nv.name}"`;
    case 'project.member_added':
      return `${actor} added a member to the project`;
    case 'project.member_removed':
      return `${actor} removed a member from the project`;
    case 'workspace.member_added':
      return `${actor} joined the workspace${nv.role ? ` as ${nv.role}` : ''}`;
    case 'workspace.role_changed':
      return `${actor} changed a member's role from ${ov.role || '?'} to ${nv.role || '?'}`;
    case 'file.uploaded':
      return `${actor} uploaded "${nv.name || nv.fileName}"`;
    case 'file.deleted':
      return `${actor} deleted "${ov.name}"`;
    default:
      return `${actor} — ${a.action}`;
  }
}

export function activityIcon(entityType) {
  return ACTION_ICONS[entityType] || '●';
}
