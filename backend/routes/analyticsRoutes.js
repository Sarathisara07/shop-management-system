const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/', protect, analyticsController.getDailyAnalytics);
router.get('/stock', protect, analyticsController.getRealtimeStock);
router.get('/charts', protect, analyticsController.getWeeklyChartData);

module.exports = router;
