const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const requireWorkspaceRole = require('../middleware/requireWorkspaceRole');
const validate = require('../middleware/validate');
const workspaceController = require('../controllers/workspace.controller');
const invitationController = require('../controllers/workspaceInvitation.controller');
const projectController = require('../controllers/project.controller');
const labelController = require('../controllers/label.controller');
const chatController = require('../controllers/chat.controller');
const fileController = require('../controllers/file.controller');
const activityController = require('../controllers/activity.controller');
const analyticsController = require('../controllers/analytics.controller');
const { listFilesQueryValidators } = require('../middleware/fileValidators');
const { activityQueryValidators } = require('../middleware/activityValidators');
const {
  createWorkspaceValidators,
  updateWorkspaceValidators,
  workspaceIdValidators,
  inviteValidators,
  invitationTokenValidators,
  updateMemberRoleValidators,
  memberIdValidators,
} = require('../middleware/workspaceValidators');
const { listProjectsQueryValidators } = require('../middleware/projectValidators');
const { createWorkspaceLabelValidators } = require('../middleware/taskValidators');

const router = Router();

router.use(authenticate); // every workspace route requires a logged-in user

router.post('/', createWorkspaceValidators, validate, workspaceController.createWorkspace);
router.get('/', workspaceController.listWorkspaces);

// Invitation response routes are NOT scoped by :workspaceId (the token IS
// the authorization for these two), so they're declared before the
// generic /:workspaceId routes to keep the invite family together.
router.post(
  '/invitations/:token/accept',
  invitationTokenValidators,
  validate,
  invitationController.acceptInvitation
);
router.post(
  '/invitations/:token/reject',
  invitationTokenValidators,
  validate,
  invitationController.rejectInvitation
);

router.get(
  '/:workspaceId',
  workspaceIdValidators,
  validate,
  requireWorkspaceRole('viewer'),
  workspaceController.getWorkspace
);

router.put(
  '/:workspaceId',
  updateWorkspaceValidators,
  validate,
  requireWorkspaceRole('admin'),
  workspaceController.updateWorkspace
);

router.delete(
  '/:workspaceId',
  workspaceIdValidators,
  validate,
  requireWorkspaceRole('owner'),
  workspaceController.deleteWorkspace
);

router.post(
  '/:workspaceId/invite',
  inviteValidators,
  validate,
  requireWorkspaceRole('admin'),
  invitationController.inviteMember
);

router.get(
  '/:workspaceId/members',
  workspaceIdValidators,
  validate,
  requireWorkspaceRole('viewer'),
  workspaceController.listMembers
);

router.patch(
  '/:workspaceId/members/:memberId',
  updateMemberRoleValidators,
  validate,
  requireWorkspaceRole('admin'),
  workspaceController.updateMemberRole
);

router.delete(
  '/:workspaceId/members/:memberId',
  memberIdValidators,
  validate,
  requireWorkspaceRole('admin'),
  workspaceController.removeMember
);

router.post(
  '/:workspaceId/leave',
  workspaceIdValidators,
  validate,
  requireWorkspaceRole('viewer'),
  workspaceController.leaveWorkspace
);

// Added for Project Management integration (Checkpoint 3). Reuses the
// same requireWorkspaceRole('viewer') gate as every other read route here.
router.get(
  '/:workspaceId/projects',
  workspaceIdValidators,
  listProjectsQueryValidators,
  validate,
  requireWorkspaceRole('viewer'),
  projectController.listWorkspaceProjects
);

// Added for Task Management integration (Checkpoint 4). Labels are
// workspace-scoped shared taxonomy (see task_labels table), so they live
// here rather than under /tasks. Not in the checkpoint's literal endpoint
// list, but required for "Create"/"Reuse" labels and the Label Selector
// to have any data to show — documented in the README.
router.post(
  '/:workspaceId/labels',
  createWorkspaceLabelValidators,
  validate,
  requireWorkspaceRole('admin'),
  labelController.createLabel
);

router.get(
  '/:workspaceId/labels',
  workspaceIdValidators,
  validate,
  requireWorkspaceRole('viewer'),
  labelController.listLabels
);

// Added for Real-Time Chat integration (Checkpoint 6). Resolves (get-or-
// creates) the workspace's single chat conversation and its first page
// of messages in one round trip.
router.get(
  '/:workspaceId/chat',
  workspaceIdValidators,
  validate,
  requireWorkspaceRole('viewer'),
  chatController.getWorkspaceChat
);

// Added for File Management (Checkpoint 7). Unions files/task_attachments/
// issue_attachments scoped to this workspace — see file.service.js.
router.get(
  '/:workspaceId/files',
  workspaceIdValidators,
  listFilesQueryValidators,
  validate,
  requireWorkspaceRole('viewer'),
  fileController.listWorkspaceFiles
);

// Added for Checkpoint 8 (Notifications/Activity/Mentions).
router.get(
  '/:workspaceId/activity',
  workspaceIdValidators,
  activityQueryValidators,
  validate,
  requireWorkspaceRole('viewer'),
  activityController.getWorkspaceActivity
);

// Added for Checkpoint 9 (Analytics).
router.get(
  '/:workspaceId/analytics',
  workspaceIdValidators,
  validate,
  requireWorkspaceRole('viewer'),
  analyticsController.getWorkspaceAnalytics
);

module.exports = router;
