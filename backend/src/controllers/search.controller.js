const asyncHandler = require('../utils/asyncHandler');
const searchService = require('../services/search.service');

// GET /api/search?q=...&type=...&limit=...
const search = asyncHandler(async (req, res) => {
  const { q, type, limit } = req.query;
  const results = await searchService.search(req.user.id, q, {
    type,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.json({ success: true, data: { results } });
});

module.exports = { search };
