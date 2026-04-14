const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  defaultRate: {
    type: Number,
    required: true
  },
  wholesaleRate: {
    type: Number,
    default: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Add unique constraint per user for product name
productSchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
