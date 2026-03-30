const express = require('express');
const router = express.Router();
const supabase = require('../../config/supabase');
const drawEngine = require('../services/drawEngine');
const logger = require('../../config/logger');

// ─── Guard: only allow Vercel cron calls (or internal calls) ──────────────────
const cronGuard = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  // Vercel sets this header automatically for cron jobs
  if (req.headers['x-vercel-cron'] === '1') return next();

  // Allow manual trigger with a secret (for testing)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return next();

  return res.status(401).json({ success: false, message: 'Unauthorized' });
};

// ─── Monthly Draw ─────────────────────────────────────────────────────────────
router.post('/monthly-draw', cronGuard, async (req, res) => {
  try {
    const now = new Date();
    const drawMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];

    const { data: draw } = await supabase
      .from('draws')
      .select('id, status')
      .eq('draw_month', drawMonth)
      .eq('status', 'scheduled')
      .single();

    if (!draw) {
      logger.warn(`CRON: No scheduled draw found for ${drawMonth}`);
      return res.json({ success: true, message: `No scheduled draw for ${drawMonth}` });
    }

    const result = await drawEngine.runDraw(draw.id, true);
    logger.info(`CRON: Draw ${draw.id} published. Winners: ${result.winners.length}`);
    res.json({ success: true, drawId: draw.id, winners: result.winners.length });
  } catch (err) {
    logger.error(`CRON: Monthly draw failed: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Lapsed Subscription Check ────────────────────────────────────────────────
router.post('/lapsed-check', cronGuard, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'lapsed' })
      .lt('current_period_end', now)
      .eq('status', 'active');

    if (error) throw new Error(error.message);
    logger.info('CRON: Lapsed subscription check complete');
    res.json({ success: true, message: 'Lapsed check complete' });
  } catch (err) {
    logger.error(`CRON: Lapsed check failed: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Analytics Snapshot ───────────────────────────────────────────────────────
router.post('/analytics-snapshot', cronGuard, async (req, res) => {
  try {
    // Only run on actual last day of month
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDate() !== 1) {
      return res.json({ success: true, message: 'Not last day of month, skipping' });
    }

    const analyticsController = require('../controllers/analyticsController');
    await analyticsController.takeMonthlySnapshot();
    logger.info('CRON: Analytics snapshot complete');
    res.json({ success: true, message: 'Analytics snapshot complete' });
  } catch (err) {
    logger.error(`CRON: Analytics snapshot failed: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
