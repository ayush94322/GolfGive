const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

// ─── Subscriber routes ────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, userController.getDashboard);

router.patch(
  '/profile',
  authenticate,
  [
    body('first_name').optional().trim().notEmpty(),
    body('last_name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
  ],
  validate,
  userController.updateProfile
);

router.post(
  '/change-password',
  authenticate,
  [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8 }),
  ],
  validate,
  userController.changePassword
);

router.get('/notifications', authenticate, userController.getNotifications);
router.patch('/notifications/:id/read', authenticate, userController.markNotificationRead);
router.post('/notifications/read-all', authenticate, userController.markAllNotificationsRead);

// ─── Admin routes ─────────────────────────────────────────────────────────────
const adminGuard = [authenticate, requireRole('admin')];

router.get('/admin', ...adminGuard, userController.adminListUsers);
router.get('/admin/:id', ...adminGuard, userController.adminGetUser);
router.patch('/admin/:id', ...adminGuard, userController.adminUpdateUser);

module.exports = router;
