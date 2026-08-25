const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

/**
 * Requires a valid access token in the Authorization header:
 *   Authorization: Bearer <token>
 * Attaches { id, email, name } to req.user on success.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed access token'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token expired'));
    }
    return next(ApiError.unauthorized('Invalid access token'));
  }
}

module.exports = authenticate;
