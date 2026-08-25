const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function signRefreshToken(user, jti) {
  return jwt.sign({ sub: user.id, jti }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
