const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const drawController = require('../controllers/drawController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

// ─── Public / subscriber routes ───────────────────────────────────────────────
router.get('/', drawController.listDraws);
router.get('/my-history', authenticate, drawController.getUserDrawHistory);

// Draw detail — auth optional (admins can see non-published)
router.get('/:id', (req, res, next) => {
  // Attach user if token present (optional auth)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const jwt = require('jsonwebtoken');
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch { /* non-authed OK */ }
  }
  next();
}, drawController.getDraw);

// ─── Admin routes ─────────────────────────────────────────────────────────────
const adminGuard = [authenticate, requireRole('admin')];

router.get('/admin/all', ...adminGuard, drawController.adminListDraws);

router.post(
  '/admin',
  ...adminGuard,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('draw_month').isDate().withMessage('draw_month must be a valid date'),
    body('logic').optional().isIn(['random', 'algorithmic']),
  ],
  validate,
  drawController.adminCreateDraw
);

router.patch('/admin/:id', ...adminGuard, drawController.adminUpdateDraw);
router.post('/admin/:id/simulate', ...adminGuard, drawController.adminSimulateDraw);
router.post('/admin/:id/publish', ...adminGuard, drawController.adminPublishDraw);
router.delete('/admin/:id', ...adminGuard, drawController.adminCancelDraw);

module.exports = router;
