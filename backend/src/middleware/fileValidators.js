const { body, param, query } = require('express-validator');

const uploadFileValidators = [
  body('workspaceId').isUUID().withMessage('A valid workspaceId is required'),
  body('projectId').optional({ nullable: true }).isUUID().withMessage('projectId must be a valid UUID'),
];

const fileIdValidators = [param('fileId').isUUID().withMessage('Invalid file id')];

const listFilesQueryValidators = [
  query('search').optional().trim().isLength({ max: 200 }),
  query('mimeType').optional().trim(),
  query('category').optional().isIn(['image', 'document']),
  query('uploadedBy').optional().isUUID(),
  query('createdAfter').optional().isISO8601(),
  query('createdBefore').optional().isISO8601(),
  query('sort').optional().isIn(['newest', 'oldest', 'name_asc', 'name_desc', 'largest', 'smallest']),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { uploadFileValidators, fileIdValidators, listFilesQueryValidators };
