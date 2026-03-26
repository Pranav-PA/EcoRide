// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const tokenHeader = req.header('Authorization');
    if (!tokenHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // support both "Bearer <token>" and raw token
    const actualToken = tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7) : tokenHeader;
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET || 'fallback_secret');

    // token payload must use userId (same as signup/login)
    const userId = decoded.userId || decoded.id || decoded._id;
    if (!userId) return res.status(401).json({ message: 'Invalid token payload' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    // attach a consistent shape: req.user.id is string
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };

    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, async () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
      }
      next();
    });
  } catch (err) {
    res.status(401).json({ message: 'Authorization failed' });
  }
};

module.exports = { auth, adminAuth };