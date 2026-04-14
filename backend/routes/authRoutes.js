const express = require('express');
const router = express.Router();
const { signup, login, createStaff, forgotPassword, resetPassword, verifyOtp, getProfile, updateProfile, changePassword, getAllUsers, updateUserRole, deleteUser, resetStaffPassword } = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/add-staff', protect, isAdmin, createStaff);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-otp', verifyOtp);

// Protected profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Admin only user management routes
router.get('/users', protect, isAdmin, getAllUsers);
router.put('/users/:id/role', protect, isAdmin, updateUserRole);
router.delete('/users/:id', protect, isAdmin, deleteUser);
router.put('/users/:id/password', protect, isAdmin, resetStaffPassword);

module.exports = router;
