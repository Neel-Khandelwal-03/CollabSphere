const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const requireWorkspaceRole = require('../middleware/requireWorkspaceRole');
const { loadFile, resolveWorkspaceFromBody } = require('../middleware/loadFile');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const fileController = require('../controllers/file.controller');
const { uploadFileValidators, fileIdValidators } = require('../middleware/fileValidators');

const router = Router();

router.use(authenticate);

// multer runs first here (unlike task's attachment route) because this
// route's validators check req.body.workspaceId, which multer is what
// populates from the multipart form in the first place.
router.post(
  '/',
  upload.single('file'),
  uploadFileValidators,
  validate,
  resolveWorkspaceFromBody,
  requireWorkspaceRole('member'),
  fileController.uploadFile
);

router.get(
  '/:fileId',
  fileIdValidators,
  validate,
  loadFile,
  requireWorkspaceRole('viewer'),
  fileController.getFile
);

router.get(
  '/:fileId/download',
  fileIdValidators,
  validate,
  loadFile,
  requireWorkspaceRole('viewer'),
  fileController.downloadFile
);

router.delete(
  '/:fileId',
  fileIdValidators,
  validate,
  loadFile,
  requireWorkspaceRole('member'),
  fileController.deleteFile
);

module.exports = router;
