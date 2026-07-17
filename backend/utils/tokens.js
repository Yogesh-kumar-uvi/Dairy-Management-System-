import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const isProd = () => process.env.NODE_ENV === 'production';

// Cross-site cookies (Vercel <-> Render) need SameSite=None + Secure in production.
// In development we use strict for maximum CSRF protection.
export const cookieOptions = (maxAge, path = '/') => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: isProd() ? 'none' : 'strict',
  maxAge,
  path
});

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Issues short-lived access token + rotating refresh token
export const sendTokens = async (res, user) => {
  const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user._id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  res.cookie('accessToken', accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000, '/api/auth/refresh'));
};

export const clearTokens = (res) => {
  res.clearCookie('accessToken', cookieOptions(0));
  res.clearCookie('refreshToken', cookieOptions(0, '/api/auth/refresh'));
};
