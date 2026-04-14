const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
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
  rate: {
    type: Number,
    required: true
  },
  amount: {
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

const transactionSchema = new mongoose.Schema({
  customerName: {
    type: String,
    default: 'Guest'
  },
  customerPhone: {
    type: String,
    default: ''
  },
  items: [transactionItemSchema],
  totalWeight: {
    type: Number,
    required: true
  },
  totalAmount: {
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

module.exports = mongoose.model('Transaction', transactionSchema);
