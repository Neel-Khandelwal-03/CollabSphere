const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const requireWorkspaceRole = require('../middleware/requireWorkspaceRole');
const resolveEntityWorkspace = require('../middleware/resolveEntityWorkspace');
const validate = require('../middleware/validate');
const activityController = require('../controllers/activity.controller');
const { entityActivityValidators } = require('../middleware/activityValidators');

const router = Router();

router.use(authenticate);

router.get(
  '/:entityType/:entityId',
  entityActivityValidators,
  validate,
  resolveEntityWorkspace,
  requireWorkspaceRole('viewer'),
  activityController.getEntityActivity
);

module.exports = router;
