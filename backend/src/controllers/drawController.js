const supabase = require('../../config/supabase');
const { AppError } = require('../middleware/errorHandler');
const drawEngine = require('../services/drawEngine');

// ─── LIST DRAWS (public: published only) ──────────────────────────────────────
exports.listDraws = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const from = (page - 1) * limit;

    const { data, count } = await supabase
      .from('draws')
      .select('id, title, draw_month, status, winning_numbers, total_prize_pool, jackpot_pool, eligible_entries, published_at', { count: 'exact' })
      .eq('status', 'published')
      .order('draw_month', { ascending: false })
      .range(from, from + limit - 1);

    res.json({ success: true, data: { draws: data, total: count } });
  } catch (err) {
    next(err);
  }
};

// ─── GET SINGLE DRAW ──────────────────────────────────────────────────────────
exports.getDraw = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: draw } = await supabase
      .from('draws')
      .select('*')
      .eq('id', id)
      .single();

    if (!draw) throw new AppError('Draw not found', 404);

    // Non-admins can only see published draws
    if (draw.status !== 'published' && req.user?.role !== 'admin') {
      throw new AppError('Draw not available', 403);
    }

    // Attach top winners summary
    const { data: topWinners } = await supabase
      .from('winners')
      .select('match_type, prize_amount, user:users(first_name, last_name)')
      .eq('draw_id', id)
      .eq('match_type', 'five_match')
      .limit(5);

    res.json({ success: true, data: { draw, topWinners } });
  } catch (err) {
    next(err);
  }
};

// ─── GET USER'S DRAW HISTORY ──────────────────────────────────────────────────
exports.getUserDrawHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const from = (page - 1) * limit;

    const { data, count } = await supabase
      .from('draw_entries')
      .select(`
        id, scores, matched_count, match_type, created_at,
        draw:draws(id, title, draw_month, winning_numbers, status, published_at)
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    res.json({ success: true, data: { entries: data, total: count } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: CREATE DRAW ───────────────────────────────────────────────────────
exports.adminCreateDraw = async (req, res, next) => {
  try {
    const { title, draw_month, logic = 'random' } = req.body;

    // Ensure no duplicate month
    const monthDate = new Date(draw_month);
    monthDate.setDate(1);

    const { data: existing } = await supabase
      .from('draws')
      .select('id')
      .eq('draw_month', monthDate.toISOString().split('T')[0])
      .neq('status', 'cancelled')
      .single();

    if (existing) throw new AppError('A draw for that month already exists', 409);

    // Check for jackpot rollover from previous draw
    const prevMonth = new Date(monthDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const { data: prevDraw } = await supabase
      .from('draws')
      .select('jackpot_pool, jackpot_rolled_over')
      .eq('draw_month', prevMonth.toISOString().split('T')[0])
      .eq('status', 'published')
      .single();

    const rolledOverAmount = prevDraw?.jackpot_rolled_over ? (prevDraw.jackpot_pool || 0) : 0;

    const { data: draw, error } = await supabase
      .from('draws')
      .insert({
        title,
        draw_month: monthDate.toISOString().split('T')[0],
        logic,
        status: 'scheduled',
        rolled_over_amount: rolledOverAmount,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json({ success: true, data: { draw } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: LIST ALL DRAWS ────────────────────────────────────────────────────
exports.adminListDraws = async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('draws')
      .select('*', { count: 'exact' })
      .order('draw_month', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, count } = await query;
    res.json({ success: true, data: { draws: data, total: count } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: SIMULATE DRAW ────────────────────────────────────────────────────
exports.adminSimulateDraw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await drawEngine.simulateDraw(id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: RUN AND PUBLISH DRAW ─────────────────────────────────────────────
exports.adminPublishDraw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await drawEngine.runDraw(id, true);
    res.json({ success: true, message: 'Draw published successfully', data: result });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: UPDATE DRAW SETTINGS ─────────────────────────────────────────────
exports.adminUpdateDraw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, logic } = req.body;

    const { data: existing } = await supabase.from('draws').select('status').eq('id', id).single();
    if (!existing) throw new AppError('Draw not found', 404);
    if (existing.status === 'published') throw new AppError('Cannot edit a published draw', 400);

    const { data, error } = await supabase
      .from('draws')
      .update({ title, logic })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true, data: { draw: data } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: CANCEL DRAW ───────────────────────────────────────────────────────
exports.adminCancelDraw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('draws').select('status').eq('id', id).single();
    if (!existing) throw new AppError('Draw not found', 404);
    if (existing.status === 'published') throw new AppError('Cannot cancel a published draw', 400);

    await supabase.from('draws').update({ status: 'cancelled' }).eq('id', id);
    res.json({ success: true, message: 'Draw cancelled' });
  } catch (err) {
    next(err);
  }
};
