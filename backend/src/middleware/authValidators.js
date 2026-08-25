const { body } = require('express-validator');

const registerValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2-120 characters'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidators = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
];

const resetPasswordValidators = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

module.exports = {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
};
