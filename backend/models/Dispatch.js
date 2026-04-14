const mongoose = require('mongoose');

const dispatchItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  buyingRate: Number,
  sellingRate: Number,
  calculatedProfit: {
    type: Number,
    default: 0
  }
});

const dispatchSchema = new mongoose.Schema({
  destination: {
    type: String,
    default: 'Unknown'
  },
  items: [dispatchItemSchema],
  totalWeight: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Dispatch', dispatchSchema);
