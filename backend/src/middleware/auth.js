const jwt = require('jsonwebtoken');
const supabase = require('../../config/supabase');

// ─── Verify JWT and attach user to req ───────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user row (catches deactivated accounts)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'User not found or token invalid' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ─── Role-based guard factory ─────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

// ─── Check active subscription ───────────────────────────────────────────────
const requireActiveSubscription = async (req, res, next) => {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!sub) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    req.subscription = sub;
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Subscription check failed' });
  }
};

module.exports = { authenticate, requireRole, requireActiveSubscription };
