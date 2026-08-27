// Hardcoded to match app/globals.css's CSS custom properties exactly.
// Used as literal hex (not var()) for reliable SVG fill resolution
// across Recharts' internals. Deliberately just the app's existing 4
// semantic colors plus their tints - not a new chart-specific palette -
// matching globals.css's own documented restraint ("violet is the
// single brand signal, green is reserved for positive states only").
export const CHART_COLORS = {
  ink: '#10192b',
  muted: '#5b6b85',
  line: '#d7dee8',
  brand: '#6e56cf',
  brandStrong: '#5940b3',
  brandTint: '#efeafb',
  signal: '#1b8a5a',
  signalTint: '#e6f5ee',
  danger: '#d64545',
  dangerTint: '#fceaea',
};

export const TASK_STATUS_COLORS = {
  backlog: CHART_COLORS.muted,
  todo: '#8f9bb3',
  in_progress: CHART_COLORS.brand,
  testing: '#a794e8',
  completed: CHART_COLORS.signal,
};

export const TASK_STATUS_LABELS = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  testing: 'Testing',
  completed: 'Completed',
};

export const TASK_PRIORITY_COLORS = {
  low: CHART_COLORS.muted,
  medium: CHART_COLORS.brand,
  high: '#b7791f',
  critical: CHART_COLORS.danger,
};

export const ISSUE_STATUS_COLORS = {
  open: CHART_COLORS.danger,
  in_progress: CHART_COLORS.brand,
  resolved: CHART_COLORS.signal,
  closed: CHART_COLORS.muted,
  reopened: '#b7791f',
};

export const ISSUE_SEVERITY_COLORS = {
  minor: CHART_COLORS.muted,
  major: CHART_COLORS.brand,
  critical: '#b7791f',
  blocker: CHART_COLORS.danger,
};
