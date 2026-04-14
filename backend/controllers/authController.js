const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const cleanEmail = email && email.trim() !== '' ? email.toLowerCase() : undefined;

    if (cleanEmail) {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.create({
      username,
      email: cleanEmail,
      password,
      role: req.body.role || 'admin',
      createdBy: req.user ? req.user.id : null // Link to the admin who created this account
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'admin',
        token: generateToken(user._id)
      });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Admin creates a staff member
// @route   POST /api/auth/add-staff
exports.createStaff = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const cleanEmail = email && email.trim() !== '' ? email.toLowerCase() : undefined;

    if (cleanEmail) {
      const exists = await User.findOne({ email: cleanEmail });
      if (exists) return res.status(400).json({ message: 'Email already exists' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) return res.status(400).json({ message: 'Username already taken' });

    const user = await User.create({
      username,
      email: cleanEmail,
      password,
      role: role || 'cashier',
      createdBy: req.user.id // Explicitly link to the admin
    });

    res.status(201).json({
      message: 'Staff account created successfully',
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Authenticate user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    // 'identifier' is used for either email or username
    const loginId = identifier || email;

    const user = await User.findOne({
      $or: [
        { email: loginId },
        { username: loginId }
      ]
    }).populate('createdBy', 'username');

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'admin',
        parentName: user.createdBy?.username || null,
        shopOwnerId: user.role === 'cashier' ? user.createdBy?._id || user.createdBy : user._id,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Forgot Password - Send OTP (to console)
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    try {
      const message = `Your password reset OTP is: ${otp}. This code is valid for 10 minutes.`;
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px;">
          <h2 style="color: #6366f1;">Scrap Shop Password Reset</h2>
          <p>You requested a password reset. Please use the following One-Time Password (OTP) to reset your password:</p>
          <div style="font-size: 24px; font-weight: bold; color: #6366f1; padding: 15px; background: #f3f4f6; text-align: center; border-radius: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #666;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">Scrap Shop Management System</p>
        </div>
      `;

      await sendEmail({
        email: user.email,
        subject: 'Your Password Reset OTP (Scrap Shop)',
        message,
        html
      });

      res.json({ message: 'Reset code sent to your email' });
    } catch (err) {
      console.error('CRITICAL: Email sending failed. Details:', err.message);
      return res.status(500).json({ 
        message: `Email sending failed: ${err.message}. Please check your .env credentials.` 
      });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Reset Password with OTP
// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Verify OTP only
// @route   POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetOtp -resetOtpExpires');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update profile (username, email, shopLogo)
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, shopLogo } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username && username !== user.username) {
      const exists = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (exists) return res.status(400).json({ message: 'Username already taken' });
      user.username = username;
    }

    if (email && email !== user.email) {
      const exists = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (exists) return res.status(400).json({ message: 'Email already in use' });
      user.email = email;
    }

    if (shopLogo !== undefined) {
      user.shopLogo = shopLogo;
    }

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'admin',
      shopLogo: user.shopLogo,
      parentName: user.createdBy?.username || null,
      shopOwnerId: user.role === 'cashier' ? user.createdBy?._id || user.createdBy : user._id,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Change password (requires current password)
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all users created by this admin
// @route   GET /api/auth/users
exports.getAllUsers = async (req, res) => {
  try {
    // Admins only see users they created, plus themselves
    const users = await User.find({
      $or: [
        { _id: req.user.id },
        { createdBy: req.user.id }
      ]
    }).select('-password -resetOtp -resetOtpExpires');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role (admin only)
// @route   PUT /api/auth/users/:id/role
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'cashier'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure admin can only modify their own staff
    if (user.createdBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this user' });
    }

    user.role = role;
    await user.save();

    res.json({ message: `User role updated to ${role}` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/auth/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Prevent self-deletion if needed, or just allow it with caution
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete yourself' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Reset staff password (admin only)
// @route   PUT /api/auth/users/:id/password
exports.resetStaffPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure admin can only modify their own staff
    if (user.createdBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this user' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Staff password reset successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
