const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, requireRole } = require('../middleware/auth');

const adminGuard = [authenticate, requireRole('admin')];

router.get('/overview', ...adminGuard, analyticsController.getOverview);
router.get('/monthly', ...adminGuard, analyticsController.getMonthlyBreakdown);
router.get('/draws', ...adminGuard, analyticsController.getDrawStats);
router.get('/subscriptions', ...adminGuard, analyticsController.getSubscriptionStats);

module.exports = router;
