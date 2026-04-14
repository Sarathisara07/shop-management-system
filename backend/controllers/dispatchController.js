const Dispatch = require('../models/Dispatch');
const Product = require('../models/Product');

// Get all dispatches
exports.getDispatches = async (req, res) => {
  try {
    const dispatches = await Dispatch.find({ user: req.shopOwnerId }).sort({ date: -1 });
    res.json(dispatches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new dispatch
exports.createDispatch = async (req, res) => {
  try {
    const { items, destination, totalWeight } = req.body;
    
    // Process items to add profit data
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const productDoc = await Product.findById(item.product);
      if (!productDoc) return item;
      
      const buyingRate = productDoc.defaultRate;
      const sellingRate = productDoc.wholesaleRate || buyingRate; // Default to buying rate if no wholesale rate set
      const profitPerKg = sellingRate - buyingRate;
      const calculatedProfit = profitPerKg * item.weight;
      
      return {
        ...item,
        buyingRate,
        sellingRate,
        calculatedProfit
      };
    }));

    const newDispatch = new Dispatch({
      destination,
      totalWeight,
      items: enrichedItems,
      user: req.shopOwnerId
    });
    
    const savedDispatch = await newDispatch.save();
    
    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) io.to(req.shopOwnerId.toString()).emit('data_changed');
    
    res.status(201).json(savedDispatch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a dispatch record
exports.deleteDispatch = async (req, res) => {
  try {
    const deleted = await Dispatch.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Dispatch not found' });
    
    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) io.to(req.shopOwnerId.toString()).emit('data_changed');
    
    res.json({ message: 'Dispatch deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
