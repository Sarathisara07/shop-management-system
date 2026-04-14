const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/', protect, isAdmin, dispatchController.getDispatches);
router.post('/', protect, isAdmin, dispatchController.createDispatch);
router.delete('/:id', protect, isAdmin, dispatchController.deleteDispatch);

module.exports = router;
