const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const requireWorkspaceRole = require('../middleware/requireWorkspaceRole');
const loadProject = require('../middleware/loadProject');
const validate = require('../middleware/validate');
const projectController = require('../controllers/project.controller');
const issueController = require('../controllers/issue.controller');
const chatController = require('../controllers/chat.controller');
const fileController = require('../controllers/file.controller');
const {
  createProjectValidators,
  updateProjectValidators,
  projectIdValidators,
  addProjectMemberValidators,
  removeProjectMemberValidators,
  listProjectsQueryValidators,
} = require('../middleware/projectValidators');
const { listIssuesQueryValidators } = require('../middleware/issueValidators');
const { listFilesQueryValidators } = require('../middleware/fileValidators');

const router = Router();

router.use(authenticate);

router.post(
  '/',
  createProjectValidators,
  validate,
  requireWorkspaceRole('admin'), // workspaceId sourced from req.body by the middleware
  projectController.createProject
);

router.get('/', listProjectsQueryValidators, validate, projectController.listMyProjects);

router.get(
  '/:projectId',
  projectIdValidators,
  validate,
  loadProject,
  requireWorkspaceRole('viewer'),
  projectController.getProject
);

router.put(
  '/:projectId',
  updateProjectValidators,
  validate,
  loadProject,
  requireWorkspaceRole('admin'),
  projectController.updateProject
);

router.delete(
  '/:projectId',
  projectIdValidators,
  validate,
  loadProject,
  requireWorkspaceRole('admin'),
  projectController.deleteProject
);

router.post(
  '/:projectId/archive',
  projectIdValidators,
  validate,
  loadProject,
  requireWorkspaceRole('admin'),
  projectController.archiveProject
);

router.post(
  '/:projectId/restore',
  projectIdValidators,
  validate,
  loadProject,
  requireWorkspaceRole('admin'),
  projectController.restoreProject
);

router.post(
  '/:projectId/members',
  addProjectMemberValidators,
  validate,
  loadProject,
  requireWorkspaceRole('admin'),
  projectController.addProjectMember
);

router.delete(
  '/:projectId/members/:memberId',
  removeProjectMemberValidators,
  validate,
  loadProject,
  requireWorkspaceRole('admin'),
  projectController.removeProjectMember
);

// Added for Issue Tracking integration (Checkpoint 5) — explicitly in
// the checkpoint's endpoint list, unlike the equivalent tasks route
// which was intentionally left as a query-param filter on GET /tasks.
router.get(
  '/:projectId/issues',
  projectIdValidators,
  listIssuesQueryValidators,
  validate,
  loadProject,
  requireWorkspaceRole('viewer'),
  issueController.listProjectIssues
);

// Added for Real-Time Chat integration (Checkpoint 6). Same
// get-or-create + first-page-of-messages shape as the workspace chat
// route.
router.get(
  '/:projectId/chat',
  projectIdValidators,
  validate,
  loadProject,
  requireWorkspaceRole('viewer'),
  chatController.getProjectChat
);

// Added for File Management (Checkpoint 7). Same union-based listing as
// the workspace files route, scoped to this project.
router.get(
  '/:projectId/files',
  projectIdValidators,
  listFilesQueryValidators,
  validate,
  loadProject,
  requireWorkspaceRole('viewer'),
  fileController.listProjectFiles
);

module.exports = router;
