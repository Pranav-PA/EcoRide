const express = require('express');
const { signup, login, verifyEmail, getProfile } = require('../controllers/authController'); // ✅ added verifyEmail
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/signup
// @desc    Register user (sends verification email)
// @access  Public
router.post('/signup', signup);

// @route   POST /api/auth/login
// @desc    Authenticate user (only if verified)
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/verify-email
// @desc    Verify user's email using token
// @access  Public
router.get('/verify-email', verifyEmail); // ✅ added new route

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, getProfile);

module.exports = router;