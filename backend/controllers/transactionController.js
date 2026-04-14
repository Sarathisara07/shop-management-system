const Transaction = require('../models/Transaction');
const Product = require('../models/Product');

// Get all transactions
exports.getTransactions = async (req, res) => {
  try {
    const { date } = req.query;
    let query = { user: req.shopOwnerId };
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { items, customerName, totalWeight, totalAmount, date } = req.body;
    
    // Process items to add profit data
    const enrichedItems = await Promise.all(items.map(async (item) => {
      try {
        const productDoc = await Product.findById(item.product);
        if (!productDoc) {
          console.warn(`Product not found for ID: ${item.product}`);
          return item;
        }
        
        const buyingRate = item.rate;
        const sellingRate = productDoc.wholesaleRate || buyingRate; 
        const profitPerKg = sellingRate - buyingRate;
        const calculatedProfit = profitPerKg * item.weight;
        
        return {
          ...item,
          buyingRate,
          sellingRate,
          calculatedProfit
        };
      } catch (err) {
        console.error('Error fetching product for transaction:', err);
        return item;
      }
    }));

    const newTransaction = new Transaction({
      customerName,
      items: enrichedItems,
      totalWeight,
      totalAmount,
      date,
      user: req.shopOwnerId
    });
    
    const savedTransaction = await newTransaction.save();
    
    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) io.to(req.shopOwnerId.toString()).emit('data_changed');
    
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get single transaction by id
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.shopOwnerId });
    if (!deleted) return res.status(404).json({ message: 'Transaction not found or unauthorized' });
    
    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) io.to(req.shopOwnerId.toString()).emit('data_changed');
    
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
