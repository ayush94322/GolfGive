const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../../config/supabase');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

// ─── Generate token pair ──────────────────────────────────────────────────────
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

// ─── REGISTER ─────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Check existing
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    if (existing) throw new AppError('Email already registered', 409);

    const password_hash = await bcrypt.hash(password, 12);
    const email_verify_token = uuidv4();

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        first_name,
        last_name,
        phone,
        email_verify_token,
      })
      .select('id, email, first_name, last_name, role')
      .single();

    if (error) throw new AppError(error.message, 500);

    await emailService.sendVerificationEmail(user.email, email_verify_token, user.first_name);

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Persist refresh token
    await supabase.from('users').update({ refresh_token: refreshToken }).eq('id', user.id);

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email.',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id, email, password_hash, first_name, last_name, role, is_email_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) throw new AppError('Invalid credentials', 401);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const { accessToken, refreshToken } = generateTokens(user.id);

    await supabase.from('users').update({
      refresh_token: refreshToken,
      last_login_at: new Date().toISOString(),
    }).eq('id', user.id);

    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const { data: user } = await supabase
      .from('users')
      .select('id, refresh_token')
      .eq('id', decoded.userId)
      .single();

    if (!user || user.refresh_token !== refreshToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    const tokens = generateTokens(user.id);
    await supabase.from('users').update({ refresh_token: tokens.refreshToken }).eq('id', user.id);

    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    await supabase.from('users').update({ refresh_token: null }).eq('id', req.user.id);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .update({ is_email_verified: true, email_verify_token: null })
      .eq('email_verify_token', token)
      .select('id')
      .single();

    if (error || !user) throw new AppError('Invalid or expired verification token', 400);

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('email', email.toLowerCase())
      .single();

    // Always respond 200 to prevent email enumeration
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });

    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await supabase.from('users').update({
      password_reset_token: token,
      password_reset_expires: expires,
    }).eq('id', user.id);

    await emailService.sendPasswordResetEmail(user.email, token, user.first_name);

    res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    next(err);
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id, password_reset_expires')
      .eq('password_reset_token', token)
      .single();

    if (!user || new Date(user.password_reset_expires) < new Date()) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const password_hash = await bcrypt.hash(password, 12);

    await supabase.from('users').update({
      password_hash,
      password_reset_token: null,
      password_reset_expires: null,
    }).eq('id', user.id);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, avatar_url, role, is_email_verified, created_at')
      .eq('id', req.user.id)
      .single();

    // Attach active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, plan, status, current_period_end, charity_id, charity_percentage')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({ success: true, data: { user, subscription: subscription || null } });
  } catch (err) {
    next(err);
  }
};
