const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const winnerController = require('../controllers/winnerController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

// ─── Subscriber routes ────────────────────────────────────────────────────────
router.get('/my', authenticate, winnerController.getMyWinnings);
router.post(
  '/my/:id/proof',
  authenticate,
  winnerController.uploadMiddleware,
  winnerController.uploadProof
);

// ─── Admin routes ─────────────────────────────────────────────────────────────
const adminGuard = [authenticate, requireRole('admin')];

router.get('/admin', ...adminGuard, winnerController.adminListWinners);

router.post(
  '/admin/:id/verify',
  ...adminGuard,
  [
    body('action').isIn(['approve', 'reject']).withMessage('action must be approve or reject'),
    body('notes').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  winnerController.adminVerifyWinner
);

router.post('/admin/:id/pay', ...adminGuard, winnerController.adminMarkPaid);

module.exports = router;
