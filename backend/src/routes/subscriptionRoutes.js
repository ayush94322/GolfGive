const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const subController = require('../controllers/subscriptionController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

// ─── Stripe webhook (raw body required — mounted before json middleware) ───────
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  subController.stripeWebhook
);

// ─── User routes ──────────────────────────────────────────────────────────────
router.post(
  '/checkout',
  authenticate,
  [
    body('plan').isIn(['monthly', 'yearly']).withMessage('Plan must be monthly or yearly'),
    body('charity_percentage').optional().isFloat({ min: 10, max: 100 }),
  ],
  validate,
  subController.createCheckoutSession
);

router.get('/my', authenticate, subController.getSubscription);
router.post('/cancel', authenticate, subController.cancelSubscription);
router.patch(
  '/charity',
  authenticate,
  [
    body('charity_id').isUUID().withMessage('Valid charity_id required'),
    body('charity_percentage').isFloat({ min: 10, max: 100 }),
  ],
  validate,
  subController.updateCharitySelection
);
router.get('/payments', authenticate, subController.getPaymentHistory);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin', authenticate, requireRole('admin'), subController.adminListSubscriptions);

module.exports = router;
