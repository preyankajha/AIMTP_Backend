const express = require('express');
const router = express.Router();
const {
  getStats,
  getAnalytics,
  getAllUsers,
  getVisitorLogs,
  getUserById,
  suspendUser,
  deleteUser,
  getAllTransfers,
  deleteTransfer,
  getAllMatches,
  deleteMatch,
  getRecentActivity,
  getSettings,
  updateSettings,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All admin routes are protected and require admin role
router.use(protect);
router.use(adminOnly);

// Overview Stats & Analytics & Settings
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);
router.get('/visitor-logs', getVisitorLogs);
router.get('/activity', getRecentActivity);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/suspend', suspendUser);
router.delete('/users/:id', deleteUser);

// Transfer Management
router.get('/transfers', getAllTransfers);
router.delete('/transfers/:id', deleteTransfer);

// Match Management
router.get('/matches', getAllMatches);
router.delete('/matches/:id', deleteMatch);

module.exports = router;
