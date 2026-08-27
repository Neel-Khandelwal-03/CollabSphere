const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const searchController = require('../controllers/search.controller');
const { searchQueryValidators } = require('../middleware/searchValidators');

const router = Router();

router.use(authenticate);

router.get('/', searchQueryValidators, validate, searchController.search);

module.exports = router;
