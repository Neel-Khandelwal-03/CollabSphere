const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const requireWorkspaceRole = require('../middleware/requireWorkspaceRole');
const loadIssue = require('../middleware/loadIssue');
const { resolveProjectFromBody } = require('../middleware/loadTask'); // reused as-is, see loadIssue.js
const validate = require('../middleware/validate');
const issueController = require('../controllers/issue.controller');
const {
  createIssueValidators,
  updateIssueValidators,
  issueIdValidators,
  changeStatusValidators,
  changePriorityValidators,
  changeSeverityValidators,
  changeAssigneeValidators,
  linkTaskValidators,
  listIssuesQueryValidators,
  createCommentValidators,
  updateCommentValidators,
  commentIdValidators,
  attachLabelValidators,
  detachLabelValidators,
} = require('../middleware/issueValidators');

const router = Router();

router.use(authenticate);

router.post(
  '/',
  createIssueValidators,
  validate,
  resolveProjectFromBody,
  requireWorkspaceRole('member'),
  issueController.createIssue
);

router.get('/', listIssuesQueryValidators, validate, issueController.listMyIssues);

router.get(
  '/:issueId',
  issueIdValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('viewer'),
  issueController.getIssue
);

router.put(
  '/:issueId',
  updateIssueValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.updateIssue
);

router.delete(
  '/:issueId',
  issueIdValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('admin'),
  issueController.deleteIssue
);

router.patch(
  '/:issueId/status',
  changeStatusValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.changeStatus
);

router.patch(
  '/:issueId/priority',
  changePriorityValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.changePriority
);

router.patch(
  '/:issueId/severity',
  changeSeverityValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.changeSeverity
);

router.patch(
  '/:issueId/assignee',
  changeAssigneeValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.changeAssignee
);

router.patch(
  '/:issueId/link-task',
  linkTaskValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.linkTask
);

router.post(
  '/:issueId/comments',
  createCommentValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.createComment
);

router.get(
  '/:issueId/comments',
  issueIdValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('viewer'),
  issueController.listComments
);

router.patch(
  '/:issueId/comments/:commentId',
  updateCommentValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.updateComment
);

router.delete(
  '/:issueId/comments/:commentId',
  commentIdValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.deleteComment
);

router.post(
  '/:issueId/labels',
  attachLabelValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.attachLabel
);

router.delete(
  '/:issueId/labels/:labelId',
  detachLabelValidators,
  validate,
  loadIssue,
  requireWorkspaceRole('member'),
  issueController.detachLabel
);

module.exports = router;
