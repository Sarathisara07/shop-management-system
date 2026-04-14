const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/', protect, transactionController.getTransactions);
router.post('/', protect, transactionController.createTransaction);
router.get('/:id', protect, transactionController.getTransactionById);
router.delete('/:id', protect, isAdmin, transactionController.deleteTransaction);

module.exports = router;
