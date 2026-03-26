const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail'); // ✅ you'll create this file (explained below)

// ========================== SIGNUP ==========================
const signup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (not verified yet)
    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'user',
      isVerified: false // ✅ new field
    });

    await user.save();

    // Generate verification token (valid for 1 hour)
    const verifyToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    // Create verification link
const verifyLink = `${process.env.BASE_URL}/api/auth/verify-email?token=${verifyToken}`;
await sendEmail(
  user.email,
  'Verify Your EcoRide Account',
  `
  <h2>Welcome to EcoRide, ${user.name}!</h2>
  <p>Click the link below to verify your email:</p>
  <a href="${verifyLink}" target="_blank" style="color:#1a73e8;">Verify Email</a>
  <p>This link expires in 1 hour.</p>
  `
);

res.status(201).json({
  message: 'Signup successful! Please check your email to verify your account.'
});;

  }    catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      if (err.keyPattern?.phone) {
        return res.status(400).json({ message: 'Phone number already registered' });
      }
    }
    console.error('❌ Signup error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========================== LOGIN ==========================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Prevent login if not verified
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token (valid 30 days)
    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========================== VERIFY EMAIL ==========================
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send(`
        <h2 style="font-family:sans-serif;color:red;text-align:center;margin-top:50px;">
          ❌ Invalid verification link
        </h2>
      `);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).send(`
        <h2 style="font-family:sans-serif;color:red;text-align:center;margin-top:50px;">
          ❌ User not found
        </h2>
      `);
    }

    if (user.isVerified) {
      return res.send(`
        <h2 style="font-family:sans-serif;color:#4CAF50;text-align:center;margin-top:50px;">
          ✅ Email already verified!<br><br>
          <a href="/login" style="color:#1a73e8;text-decoration:none;">Go to Login</a>
        </h2>
      `);
    }

    user.isVerified = true;
    await user.save();

    // ✅ Show success message directly in browser
    res.send(`
      <h2 style="font-family:sans-serif;color:#4CAF50;text-align:center;margin-top:50px;">
        ✅ Email Verified Successfully!<br><br>
        You can now log in to your EcoRide account.<br><br>
        <a href="/login" style="color:#1a73e8;text-decoration:none;">Go to Login</a>
      </h2>
    `);
  } catch (err) {
    console.error('❌ Email verification error:', err.message);
    res.status(400).send(`
      <h2 style="font-family:sans-serif;color:red;text-align:center;margin-top:50px;">
        ❌ Invalid or expired verification link.<br><br>
        Please try signing up again.
      </h2>
    `);
  }
};
// ========================== GET PROFILE ==========================
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('name email phone role createdAt isVerified');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('❌ Profile fetch error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { signup, login, verifyEmail, getProfile };