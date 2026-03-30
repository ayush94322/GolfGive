const supabase = require('../../config/supabase');
const { AppError } = require('../middleware/errorHandler');

const MAX_SCORES = 5;

// ─── GET USER SCORES ──────────────────────────────────────────────────────────
exports.getScores = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;

    // Only admins can view other users' scores
    if (userId !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Forbidden', 403);
    }

    const { data: scores, error } = await supabase
      .from('golf_scores')
      .select('id, score, played_at, course_name, notes, created_at')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(MAX_SCORES);

    if (error) throw new AppError(error.message, 500);

    res.json({ success: true, data: { scores } });
  } catch (err) {
    next(err);
  }
};

// ─── ADD SCORE ────────────────────────────────────────────────────────────────
// The DB trigger handles rolling: oldest is auto-deleted when count >= 5
exports.addScore = async (req, res, next) => {
  try {
    const { score, played_at, course_name, notes } = req.body;

    // Validate range
    if (score < 1 || score > 45) throw new AppError('Score must be between 1 and 45', 400);

    // Check subscription is active before allowing score entry
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();
    if (!sub) throw new AppError('Active subscription required to enter scores', 403);

    const { data: newScore, error } = await supabase
      .from('golf_scores')
      .insert({ user_id: req.user.id, score, played_at, course_name, notes })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Return updated full list
    const { data: scores } = await supabase
      .from('golf_scores')
      .select('id, score, played_at, course_name, notes, created_at')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: false })
      .limit(MAX_SCORES);

    res.status(201).json({ success: true, data: { scores, added: newScore } });
  } catch (err) {
    next(err);
  }
};

// ─── UPDATE SCORE ─────────────────────────────────────────────────────────────
exports.updateScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { score, played_at, course_name, notes } = req.body;

    if (score !== undefined && (score < 1 || score > 45)) {
      throw new AppError('Score must be between 1 and 45', 400);
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('golf_scores')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!existing) throw new AppError('Score not found', 404);
    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Forbidden', 403);
    }

    const updateFields = {};
    if (score !== undefined) updateFields.score = score;
    if (played_at !== undefined) updateFields.played_at = played_at;
    if (course_name !== undefined) updateFields.course_name = course_name;
    if (notes !== undefined) updateFields.notes = notes;

    const { data: updated, error } = await supabase
      .from('golf_scores')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.json({ success: true, data: { score: updated } });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE SCORE ─────────────────────────────────────────────────────────────
exports.deleteScore = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('golf_scores')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!existing) throw new AppError('Score not found', 404);
    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Forbidden', 403);
    }

    await supabase.from('golf_scores').delete().eq('id', id);

    res.json({ success: true, message: 'Score deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: Edit any user's score ────────────────────────────────────────────
exports.adminEditScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { score, played_at, course_name } = req.body;

    if (score !== undefined && (score < 1 || score > 45)) {
      throw new AppError('Score must be between 1 and 45', 400);
    }

    const updateFields = {};
    if (score !== undefined) updateFields.score = score;
    if (played_at !== undefined) updateFields.played_at = played_at;
    if (course_name !== undefined) updateFields.course_name = course_name;

    const { data, error } = await supabase
      .from('golf_scores')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    if (!data) throw new AppError('Score not found', 404);

    res.json({ success: true, data: { score: data } });
  } catch (err) {
    next(err);
  }
};

// ─── Score frequency stats (used by algorithmic draw) ────────────────────────
exports.getScoreFrequency = async (req, res, next) => {
  try {
    // Fetch all active subscribers' latest scores
    const { data: activeUsers } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active');

    const userIds = activeUsers.map(s => s.user_id);
    if (!userIds.length) return res.json({ success: true, data: { frequency: {} } });

    const { data: scores } = await supabase
      .from('golf_scores')
      .select('score')
      .in('user_id', userIds);

    const frequency = {};
    for (let i = 1; i <= 45; i++) frequency[i] = 0;
    scores.forEach(s => { frequency[s.score] = (frequency[s.score] || 0) + 1; });

    res.json({ success: true, data: { frequency } });
  } catch (err) {
    next(err);
  }
};
