const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const scoreController = require('../controllers/scoreController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

const scoreValidators = [
  body('score').isInt({ min: 1, max: 45 }).withMessage('Score must be between 1 and 45'),
  body('played_at').isDate().withMessage('played_at must be a valid date (YYYY-MM-DD)'),
  body('course_name').optional().trim().isLength({ max: 100 }),
  body('notes').optional().trim().isLength({ max: 300 }),
];

// ─── User routes ──────────────────────────────────────────────────────────────
router.get('/my', authenticate, scoreController.getScores);
router.post('/my', authenticate, scoreValidators, validate, scoreController.addScore);
router.patch('/my/:id', authenticate, [
  param('id').isUUID(),
  body('score').optional().isInt({ min: 1, max: 45 }),
  body('played_at').optional().isDate(),
], validate, scoreController.updateScore);
router.delete('/my/:id', authenticate, param('id').isUUID(), validate, scoreController.deleteScore);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get('/user/:userId', authenticate, requireRole('admin'), scoreController.getScores);
router.patch('/admin/:id', authenticate, requireRole('admin'), scoreController.adminEditScore);
router.get('/frequency', authenticate, requireRole('admin'), scoreController.getScoreFrequency);

module.exports = router;
