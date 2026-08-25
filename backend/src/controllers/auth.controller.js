const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const userService = require('../services/user.service');
const refreshTokenService = require('../services/refreshToken.service');
const passwordResetService = require('../services/passwordReset.service');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');

const REFRESH_COOKIE = 'refreshToken';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/api/auth', // only sent to auth endpoints
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days, mirrors JWT_REFRESH_EXPIRES_IN default
  };
}

async function issueSession(res, user, req) {
  const accessToken = signAccessToken(user);
  const refreshToken = await refreshTokenService.issue(user, {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await userService.findByEmail(email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await userService.create({ name, email, passwordHash });

  const accessToken = await issueSession(res, user, req);

  sendWelcomeEmail(user.email, user.name).catch((err) =>
    console.error('Failed to send welcome email:', err.message)
  );

  res.status(201).json({ success: true, data: { user, accessToken } });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const userRecord = await userService.findByEmail(email);
  if (!userRecord) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const valid = await comparePassword(password, userRecord.password_hash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const user = await userService.findById(userRecord.id);
  const accessToken = await issueSession(res, user, req);

  res.json({ success: true, data: { user, accessToken } });
});

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) {
    throw ApiError.unauthorized('No refresh token provided');
  }

  const payload = await refreshTokenService.verify(rawToken);
  if (!payload) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    throw ApiError.unauthorized('Refresh token is invalid, expired, or revoked');
  }

  // Rotate: revoke the used token and issue a new pair. This limits the
  // blast radius if a refresh token is ever stolen.
  await refreshTokenService.revoke(payload.jti);

  const user = await userService.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  const accessToken = await issueSession(res, user, req);
  res.json({ success: true, data: { user, accessToken } });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (rawToken) {
    try {
      const payload = await refreshTokenService.verify(rawToken);
      if (payload) await refreshTokenService.revoke(payload.jti);
    } catch {
      // token already invalid/expired — nothing to revoke, fall through
    }
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out' });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await userService.findByEmail(email);

  // Always respond 200 regardless of whether the account exists, so the
  // endpoint can't be used to enumerate registered emails.
  if (user) {
    const rawToken = await passwordResetService.create(user.id);
    const resetUrl = `${env.clientUrl}/reset-password/${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  res.json({
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const record = await passwordResetService.consume(token);
  if (!record) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  const passwordHash = await hashPassword(password);
  await userService.updatePassword(record.user_id, passwordHash);

  // Invalidate all existing sessions so a stolen password can't be used
  // to stay logged in after the owner resets it.
  await refreshTokenService.revokeAllForUser(record.user_id);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });

  res.json({ success: true, message: 'Password has been reset. Please log in again.' });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const user = await userService.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, data: { user } });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
};
