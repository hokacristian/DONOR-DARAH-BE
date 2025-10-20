const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

// POST /api/auth/register (Admin only)
router.post(
  '/register',
  authenticate,
  authorize(['admin']),
  authController.registerValidation,
  authController.register
);

// POST /api/auth/login
router.post('/login', authController.loginValidation, authController.login);

// GET /api/auth/me
router.get('/me', authenticate, authController.getMe);

module.exports = router;
