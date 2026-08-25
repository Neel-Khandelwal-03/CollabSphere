const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
} = require('../middleware/authValidators');

const router = Router();

// Stricter limiter for auth endpoints prone to abuse (credential stuffing,
// email enumeration via forgot-password).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

router.post('/register', authLimiter, registerValidators, validate, authController.register);
router.post('/login', authLimiter, loginValidators, validate, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordValidators,
  validate,
  authController.forgotPassword
);
router.post(
  '/reset-password',
  authLimiter,
  resetPasswordValidators,
  validate,
  authController.resetPassword
);
router.get('/me', authenticate, authController.me);

module.exports = router;
