const { query } = require('express-validator');

const searchQueryValidators = [
  query('q').trim().isLength({ min: 1, max: 200 }).withMessage('A search term is required'),
  query('type').optional().isIn(['workspace', 'project', 'task', 'issue', 'user', 'file']),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

module.exports = { searchQueryValidators };
