const CashEntry = require('../models/CashEntry');

// Create a new cash entry
exports.addCash = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }
    
    const newEntry = new CashEntry({ 
      amount,
      user: req.shopOwnerId 
    });
    const savedEntry = await newEntry.save();
    
    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) io.to(req.shopOwnerId.toString()).emit('data_changed');

    res.status(201).json(savedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
