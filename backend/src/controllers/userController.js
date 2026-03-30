const bcrypt = require('bcryptjs');
const supabase = require('../../config/supabase');
const { AppError } = require('../middleware/errorHandler');

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, avatar_url } = req.body;
    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, email, first_name, last_name, phone, avatar_url')
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: { user: data } });
  } catch (err) {
    next(err);
  }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) throw new AppError('Current password is incorrect', 401);

    const password_hash = await bcrypt.hash(new_password, 12);
    await supabase.from('users').update({ password_hash }).eq('id', req.user.id);

    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

// ─── USER DASHBOARD SUMMARY ───────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Parallel fetch all dashboard data
    const [
      { data: subscription },
      { data: scores },
      { data: winnings },
      { data: upcomingDraw },
      { data: notifications },
      { data: recentEntries },
    ] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*, charity:charities(id, name, logo_url)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      supabase
        .from('golf_scores')
        .select('id, score, played_at, course_name')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(5),

      supabase
        .from('winners')
        .select('id, match_type, prize_amount, verification_status, payment_status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      supabase
        .from('draws')
        .select('id, title, draw_month, status, total_prize_pool')
        .eq('status', 'scheduled')
        .order('draw_month', { ascending: true })
        .limit(1)
        .single(),

      supabase
        .from('notifications')
        .select('id, type, title, body, is_read, created_at')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('draw_entries')
        .select('id, scores, matched_count, match_type, draw:draws(id, title, draw_month, status)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const totalWon = (winnings || []).reduce((s, w) => s + parseFloat(w.prize_amount), 0);
    const pendingPayout = (winnings || [])
      .filter(w => w.payment_status === 'pending' && w.verification_status === 'approved')
      .reduce((s, w) => s + parseFloat(w.prize_amount), 0);

    res.json({
      success: true,
      data: {
        subscription: subscription || null,
        scores: scores || [],
        winningsSummary: {
          total: winnings?.length || 0,
          totalWon: parseFloat(totalWon.toFixed(2)),
          pendingPayout: parseFloat(pendingPayout.toFixed(2)),
          recent: (winnings || []).slice(0, 3),
        },
        upcomingDraw: upcomingDraw || null,
        notifications: notifications || [],
        recentDrawEntries: recentEntries || [],
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET NOTIFICATIONS ────────────────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;

    const { data, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    res.json({ success: true, data: { notifications: data, total: count } });
  } catch (err) {
    next(err);
  }
};

// ─── MARK NOTIFICATION READ ───────────────────────────────────────────────────
exports.markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    res.json({ success: true, message: 'All notifications marked read' });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: LIST USERS ────────────────────────────────────────────────────────
exports.adminListUsers = async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_email_verified, last_login_at, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (search) query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    if (role) query = query.eq('role', role);

    const { data, count } = await query;
    res.json({ success: true, data: { users: data, total: count } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: GET USER DETAIL ───────────────────────────────────────────────────
exports.adminGetUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [
      { data: user },
      { data: subscription },
      { data: scores },
      { data: winnings },
    ] = await Promise.all([
      supabase.from('users').select('id, email, first_name, last_name, phone, role, is_email_verified, created_at').eq('id', id).single(),
      supabase.from('subscriptions').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('golf_scores').select('*').eq('user_id', id).order('played_at', { ascending: false }).limit(5),
      supabase.from('winners').select('*').eq('user_id', id),
    ]);

    if (!user) throw new AppError('User not found', 404);

    res.json({ success: true, data: { user, subscription, scores, winnings } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: UPDATE USER ───────────────────────────────────────────────────────
exports.adminUpdateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, role } = req.body;

    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, first_name, last_name, role')
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: { user: data } });
  } catch (err) {
    next(err);
  }
};
