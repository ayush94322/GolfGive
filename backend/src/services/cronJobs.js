const cron = require('node-cron');
const logger = require('../../config/logger');
const supabase = require('../../config/supabase');
const drawEngine = require('./drawEngine');
const analyticsController = require('../controllers/analyticsController');

// ─── MONTHLY DRAW TRIGGER ─────────────────────────────────────────────────────
// Default: 1st of every month at 10:00 AM UTC
const scheduleMonthlyDraw = () => {
  const schedule = process.env.DRAW_CRON_SCHEDULE || '0 10 1 * *';

  cron.schedule(schedule, async () => {
    logger.info('CRON: Monthly draw trigger fired');
    try {
      const now = new Date();
      const drawMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      // Find scheduled draw for this month
      const { data: draw } = await supabase
        .from('draws')
        .select('id, status')
        .eq('draw_month', drawMonth)
        .eq('status', 'scheduled')
        .single();

      if (!draw) {
        logger.warn(`CRON: No scheduled draw found for ${drawMonth}. Skipping auto-publish.`);
        return;
      }

      // Auto-publish the draw
      const result = await drawEngine.runDraw(draw.id, true);
      logger.info(`CRON: Draw ${draw.id} published. Winners: ${result.winners.length}, Jackpot rolled: ${result.jackpotRolledOver}`);
    } catch (err) {
      logger.error(`CRON: Monthly draw failed: ${err.message}`);
    }
  }, {
    timezone: 'UTC',
  });

  logger.info(`CRON: Monthly draw scheduler started (${schedule})`);
};

// ─── MONTHLY ANALYTICS SNAPSHOT ──────────────────────────────────────────────
// Runs at 11:00 PM on last day of each month
const scheduleAnalyticsSnapshot = () => {
  cron.schedule('0 23 28-31 * *', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDate() !== 1) return; // Only run on the actual last day

    logger.info('CRON: Taking monthly analytics snapshot');
    try {
      await analyticsController.takeMonthlySnapshot();
      logger.info('CRON: Analytics snapshot complete');
    } catch (err) {
      logger.error(`CRON: Analytics snapshot failed: ${err.message}`);
    }
  }, { timezone: 'UTC' });

  logger.info('CRON: Analytics snapshot scheduler started');
};

// ─── LAPSED SUBSCRIPTION CHECK ────────────────────────────────────────────────
// Runs daily at midnight — marks subscriptions past their end date as lapsed
const scheduleLapsedCheck = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('CRON: Checking for lapsed subscriptions');
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'lapsed' })
        .lt('current_period_end', now)
        .eq('status', 'active');

      if (!error) logger.info(`CRON: Marked lapsed subscriptions`);
    } catch (err) {
      logger.error(`CRON: Lapsed check failed: ${err.message}`);
    }
  }, { timezone: 'UTC' });

  logger.info('CRON: Lapsed subscription checker started');
};

const initCronJobs = () => {
  scheduleMonthlyDraw();
  scheduleAnalyticsSnapshot();
  scheduleLapsedCheck();
};

module.exports = { initCronJobs };
