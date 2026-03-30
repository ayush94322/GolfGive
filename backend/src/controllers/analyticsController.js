const supabase = require('../../config/supabase');
const { AppError } = require('../middleware/errorHandler');

// ─── ADMIN: MAIN ANALYTICS OVERVIEW ──────────────────────────────────────────
exports.getOverview = async (req, res, next) => {
  try {
    const [
      { count: totalUsers },
      { count: activeSubscribers },
      { data: revenueStat },
      { data: prizeStats },
      { data: charityStats },
      { data: recentDraws },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('payment_history').select('amount').eq('status', 'paid'),
      supabase.from('payment_history').select('prize_pool_contribution').eq('status', 'paid'),
      supabase.from('charity_contributions').select('amount'),
      supabase.from('draws').select('id, title, draw_month, status, total_prize_pool, eligible_entries, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(5),
    ]);

    const totalRevenue = (revenueStat || []).reduce((s, p) => s + parseFloat(p.amount), 0);
    const totalPrizePool = (prizeStats || []).reduce((s, p) => s + parseFloat(p.prize_pool_contribution || 0), 0);
    const totalCharity = (charityStats || []).reduce((s, c) => s + parseFloat(c.amount), 0);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeSubscribers,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalPrizePool: parseFloat(totalPrizePool.toFixed(2)),
        totalCharityContributed: parseFloat(totalCharity.toFixed(2)),
        recentDraws,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: MONTHLY BREAKDOWN ─────────────────────────────────────────────────
exports.getMonthlyBreakdown = async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .order('snapshot_month', { ascending: false })
      .limit(parseInt(months));

    res.json({ success: true, data: { snapshots: snapshots || [] } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: DRAW STATISTICS ───────────────────────────────────────────────────
exports.getDrawStats = async (req, res, next) => {
  try {
    const { data: draws } = await supabase
      .from('draws')
      .select('id, title, draw_month, total_prize_pool, eligible_entries, jackpot_rolled_over')
      .eq('status', 'published')
      .order('draw_month', { ascending: false })
      .limit(24);

    const { data: winnersByType } = await supabase
      .from('winners')
      .select('match_type, prize_amount');

    const byType = { five_match: { count: 0, total: 0 }, four_match: { count: 0, total: 0 }, three_match: { count: 0, total: 0 } };
    for (const w of winnersByType || []) {
      if (byType[w.match_type]) {
        byType[w.match_type].count++;
        byType[w.match_type].total += parseFloat(w.prize_amount);
      }
    }

    res.json({ success: true, data: { draws, winnersByType: byType } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: SUBSCRIPTION PLAN BREAKDOWN ──────────────────────────────────────
exports.getSubscriptionStats = async (req, res, next) => {
  try {
    const { data: monthly } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('plan', 'monthly')
      .eq('status', 'active');

    const { data: yearly } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('plan', 'yearly')
      .eq('status', 'active');

    const { data: cancelled } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled');

    res.json({
      success: true,
      data: {
        active: { monthly: monthly?.length || 0, yearly: yearly?.length || 0 },
        cancelled: cancelled?.length || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: TAKE MONTHLY SNAPSHOT (called by cron) ───────────────────────────
exports.takeMonthlySnapshot = async () => {
  const now = new Date();
  const snapshotMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const [
    { count: totalUsers },
    { count: activeSubscribers },
    { data: revenue },
    { data: prizePool },
    { data: charity },
    { count: drawsRun },
    { count: winners },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('payment_history').select('amount').eq('status', 'paid').gte('paid_at', `${snapshotMonth}T00:00:00`),
    supabase.from('payment_history').select('prize_pool_contribution').eq('status', 'paid').gte('paid_at', `${snapshotMonth}T00:00:00`),
    supabase.from('charity_contributions').select('amount').gte('created_at', `${snapshotMonth}T00:00:00`),
    supabase.from('draws').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', `${snapshotMonth}T00:00:00`),
    supabase.from('winners').select('id', { count: 'exact', head: true }).gte('created_at', `${snapshotMonth}T00:00:00`),
  ]);

  const totalRevenue = (revenue || []).reduce((s, p) => s + parseFloat(p.amount), 0);
  const totalPrize = (prizePool || []).reduce((s, p) => s + parseFloat(p.prize_pool_contribution || 0), 0);
  const totalCharity = (charity || []).reduce((s, c) => s + parseFloat(c.amount), 0);

  await supabase.from('analytics_snapshots').upsert({
    snapshot_month: snapshotMonth,
    total_users: totalUsers,
    active_subscribers: activeSubscribers,
    total_revenue: parseFloat(totalRevenue.toFixed(2)),
    total_prize_pool: parseFloat(totalPrize.toFixed(2)),
    total_charity_contributed: parseFloat(totalCharity.toFixed(2)),
    draws_run: drawsRun,
    winners_count: winners,
  }, { onConflict: 'snapshot_month' });
};
