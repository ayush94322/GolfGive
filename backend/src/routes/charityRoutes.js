const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const charityController = require('../controllers/charityController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/', charityController.listCharities);
router.get('/:slug', charityController.getCharity);

// ─── Subscriber routes ────────────────────────────────────────────────────────
router.post(
  '/donate',
  authenticate,
  [
    body('charity_id').isUUID().withMessage('Valid charity_id required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least £1'),
  ],
  validate,
  charityController.donate
);

// ─── Admin routes ─────────────────────────────────────────────────────────────
const adminGuard = [authenticate, requireRole('admin')];

router.get('/admin/stats', ...adminGuard, charityController.adminCharityStats);

router.post(
  '/admin',
  ...adminGuard,
  [
    body('name').trim().notEmpty(),
    body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
    body('description').trim().notEmpty(),
  ],
  validate,
  charityController.adminCreateCharity
);

router.patch('/admin/:id', ...adminGuard, charityController.adminUpdateCharity);
router.delete('/admin/:id', ...adminGuard, charityController.adminDeleteCharity);

router.post(
  '/admin/:charity_id/events',
  ...adminGuard,
  [
    body('title').trim().notEmpty(),
    body('event_date').isDate().withMessage('Valid event_date required'),
  ],
  validate,
  charityController.adminAddCharityEvent
);

module.exports = router;
