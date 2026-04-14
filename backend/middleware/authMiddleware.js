const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Root account identification
      // If cashier, they should see their admin's data.
      let ownerId = req.user._id;
      if (req.user.role === 'cashier' && req.user.createdBy) {
        ownerId = req.user.createdBy;
      }
      
      req.shopOwnerId = ownerId;
      console.log(`User: ${req.user.username} (${req.user.role}), ShopOwnerId: ${req.shopOwnerId}`);

      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const isAdmin = (req, res, next) => {
  // If role is admin OR if there is no role (existing users), allow access
  if (req.user && (req.user.role === 'admin' || !req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

module.exports = { protect, isAdmin };
