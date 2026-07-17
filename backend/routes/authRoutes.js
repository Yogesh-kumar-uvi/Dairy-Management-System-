import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import User from '../models/User.js';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import { sendTokens, clearTokens, hashToken } from '../utils/tokens.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// Brute-force protection on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  message: { message: 'Too many attempts, please try again after 15 minutes' }
});

const userValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

// POST /api/auth/bootstrap - creates the FIRST admin only (works when no users exist)
router.post('/bootstrap', authLimiter, userValidators, validate, async (req, res, next) => {
  try {
    const count = await User.estimatedDocumentCount();
    if (count > 0) return res.status(403).json({ message: 'Setup already completed' });
    const user = await User.create({ ...req.body, role: 'admin' });
    await sendTokens(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register - admin creates operators/admins
router.post(
  '/register',
  protect,
  authorize('admin'),
  [...userValidators, body('role').optional().isIn(['admin', 'operator'])],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      const user = await User.create({ name, email, password, role: role || 'operator' });
      res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findOne({ email: req.body.email }).select('+password');
      if (!user || !(await user.comparePassword(req.body.password))) {
        // Log failed attempts without sensitive data
        console.warn(`[SECURITY] Failed login attempt for ${req.body.email} from ${req.ip}`);
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      await sendTokens(res, user);
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/refresh - refresh token rotation
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshTokenHash');
    if (!user || user.refreshTokenHash !== hashToken(token)) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    await sendTokens(res, user); // rotate
    res.json({ user: publicUser(user) });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  req.user.refreshTokenHash = undefined;
  await req.user.save({ validateBeforeSave: false });
  clearTokens(res);
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, [body('email').isEmail().normalizeEmail()], validate, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = hashToken(token);
      user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
      await user.save({ validateBeforeSave: false });
      const clientUrl = (process.env.CLIENT_URLS || 'http://localhost:3000').split(',')[0];
      await sendEmail({
        to: user.email,
        subject: 'Dairy MS - Password Reset',
        text: `Reset your password (valid 10 min): ${clientUrl}/reset-password/${token}`
      });
    }
    // Same response whether or not user exists (prevents email enumeration)
    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password/:token
router.post(
  '/reset-password/:token',
  authLimiter,
  [body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findOne({
        resetPasswordToken: hashToken(req.params.token),
        resetPasswordExpires: { $gt: Date.now() }
      });
      if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });
      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.refreshTokenHash = undefined;
      await user.save();
      res.json({ message: 'Password reset successful. Please login.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
