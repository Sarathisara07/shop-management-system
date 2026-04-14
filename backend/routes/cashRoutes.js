const express = require('express');
const router = express.Router();
const cashController = require('../controllers/cashController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, cashController.addCash);

module.exports = router;
