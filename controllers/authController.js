const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Generate Access JWT
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m',
  });
};

const generateRefreshToken = (id, rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : (process.env.REFRESH_TOKEN_EXPIRE || '7d');
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn,
  });
};

// In-memory store for OTPs
const otpStore = new Map();

// @desc    Register a new employee
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, mobile, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      mobile,
      email,
      passwordHash: password, // Will be hashed by pre-save hook
    });

    // Create welcome notification
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: user._id,
      title: 'Welcome to RailTransfer!',
      message: `Hi ${name.split(' ')[0]}, thank you for joining our platform. Start by posting your transfer request to find a match.`,
      type: 'info',
      link: '/transfers/create'
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      message: 'Registration successful',
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        verified: user.verified,
        profileImage: user.profileImage,
        sector: user.sector,
        department: user.department,
        subDepartment: user.subDepartment,
        designation: user.designation,
        currentZone: user.currentZone,
        currentDivision: user.currentDivision,
        currentStation: user.currentStation,
        payLevel: user.payLevel,
        gradePay: user.gradePay,
        basicPay: user.basicPay,
        category: user.category,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login employee
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password, rememberMe } = req.body;

    // Need to explicitly select passwordHash since it has select:false
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id, rememberMe);

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        verified: user.verified,
        profileImage: user.profileImage,
        sector: user.sector,
        department: user.department,
        subDepartment: user.subDepartment,
        designation: user.designation,
        currentZone: user.currentZone,
        currentDivision: user.currentDivision,
        currentStation: user.currentStation,
        payLevel: user.payLevel,
        gradePay: user.gradePay,
        basicPay: user.basicPay,
        category: user.category,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: 'User no longer exists' });
      }

      const accessToken = generateAccessToken(user._id);

      res.json({ accessToken });
    } catch (error) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Change current user's password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = newPassword; // pre-save hook will hash it
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Email Verification OTP
// @route   POST /api/auth/send-verification-otp
// @access  Private
const sendVerificationOtp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.verified) return res.status(400).json({ message: 'Email already verified' });

    const MathRandom = Math.floor(100000 + Math.random() * 900000);
    // Actually we'll just allow any random OTP for this project or send it
    const otp = MathRandom.toString();
    otpStore.set(user._id.toString(), { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    try {
      await require('../utils/email')({
        email: user.email,
        subject: 'Email Verification OTP - AIMTP',
        html: `<h2>Welcome to All India Mutual Transfer Portal</h2><p>Your email verification OTP is <strong style="font-size: 24px;">${otp}</strong>. It is valid for 10 minutes.</p>`,
      });
      res.json({ message: 'OTP sent to your email' });
    } catch (err) {
      console.error(err);
      // For demo purposes, we can print the OTP to server console
      console.log(`Demo OTP for ${user.email} is: ${otp}`);
      // Fallback: If no SMTP defined, simulate sending for demo
      res.json({ message: 'OTP sent to your email (Check server console if no SMTP configured)' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email-otp
// @access  Private
const verifyEmailOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: 'OTP is required' });

    const userId = req.user._id.toString();
    const storedOtpData = otpStore.get(userId);
    
    if (!storedOtpData) return res.status(400).json({ message: 'OTP expired or not requested' });
    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(userId);
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const user = await User.findById(userId);
    user.verified = true;
    await user.save();
    
    otpStore.delete(userId);
    res.json({ 
      message: 'Email verified successfully', 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        verified: user.verified,
        profileImage: user.profileImage,
        sector: user.sector,
        department: user.department,
        subDepartment: user.subDepartment,
        designation: user.designation,
        currentZone: user.currentZone,
        currentDivision: user.currentDivision,
        currentStation: user.currentStation,
        payLevel: user.payLevel,
        gradePay: user.gradePay,
        basicPay: user.basicPay,
        category: user.category,
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Password Reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Return a generic semantic success even if the email wasn't found to prevent email enumeration
      return res.json({ message: 'If an account exists with that email, an OTP has been sent.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Use the email as the key for password resets since the user is not authenticated
    otpStore.set(`reset_${email}`, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    try {
      await require('../utils/email')({
        email: user.email,
        subject: 'Password Reset OTP - AIMTP',
        html: `<h2>All India Mutual Transfer Portal - Password Reset</h2>
               <p>We received a request to reset your password. Your OTP is <strong style="font-size: 24px; color: #dc2626;">${otp}</strong>.</p>
               <p>It is valid for 10 minutes. If you did not request this, please ignore this email.</p>`,
      });
      res.json({ message: 'If an account exists with that email, an OTP has been sent.' });
    } catch (err) {
      console.error(err);
      console.log(`Demo Reset OTP for ${email} is: ${otp}`);
      res.json({ message: 'If an account exists with that email, an OTP has been sent. (Check server console if no SMTP)' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const storedOtpData = otpStore.get(`reset_${email}`);
    
    if (!storedOtpData) return res.status(400).json({ message: 'OTP expired or not requested' });
    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(`reset_${email}`);
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.passwordHash = newPassword;
    await user.save();
    
    otpStore.delete(`reset_${email}`);
    res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Profile Image
// @route   POST /api/auth/upload-profile-image
// @access  Private
const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optional: Delete old image from disk to free up space
    if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', user.profileImage);
      try {
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (err) {
        console.error('Error deleting old profile image:', err);
      }
    }

    // Set new image path (using POSIX style path for web)
    user.profileImage = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.json({
      message: 'Profile image uploaded successfully',
      profileImage: user.profileImage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Profile Image via URL
// @route   POST /api/auth/update-profile-image
// @access  Private
const updateProfileImage = async (req, res, next) => {
  try {
    const { profileImage } = req.body;
    if (!profileImage) {
      return res.status(400).json({ message: 'No image URL provided' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If the old image was local, delete it off disk
    if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', user.profileImage);
      try {
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (err) {
        console.error('Error deleting old profile image:', err);
      }
    }

    user.profileImage = profileImage;
    await user.save();

    res.json({
      message: 'Profile image updated successfully',
      profileImage: user.profileImage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, mobile, sector, department, subDepartment, designation, currentZone, currentDivision, currentStation, payLevel, gradePay, basicPay, category } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (mobile) user.mobile = mobile;
    
    // Update profile fields
    user.sector = sector ?? user.sector;
    user.department = department ?? user.department;
    user.subDepartment = subDepartment ?? user.subDepartment;
    user.designation = designation ?? user.designation;
    user.currentZone = currentZone ?? user.currentZone;
    user.currentDivision = currentDivision ?? user.currentDivision;
    user.currentStation = currentStation ?? user.currentStation;
    user.payLevel = payLevel ?? user.payLevel;
    user.gradePay = gradePay ?? user.gradePay;
    user.basicPay = basicPay ?? user.basicPay;
    user.category = category ?? user.category;

    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, updateProfile, refresh, changePassword, sendVerificationOtp, verifyEmailOtp, forgotPassword, resetPassword, uploadProfileImage, updateProfileImage };
