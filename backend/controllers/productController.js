const Product = require('../models/Product');

// Get all products for logged in user
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ user: req.shopOwnerId });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const { name, defaultRate, wholesaleRate } = req.body;
    const newProduct = new Product({
      name,
      defaultRate,
      wholesaleRate: wholesaleRate || 0,
      user: req.shopOwnerId
    });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update product (rate/name)
exports.updateProduct = async (req, res) => {
  try {
    const { name, defaultRate, wholesaleRate } = req.body;
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id, user: req.shopOwnerId },
      { name, defaultRate, wholesaleRate },
      { new: true, runValidators: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found or unauthorized' });
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findOneAndDelete({ _id: req.params.id, user: req.shopOwnerId });
    if (!deletedProduct) return res.status(404).json({ message: 'Product not found or unauthorized' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
