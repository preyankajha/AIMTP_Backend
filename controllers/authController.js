const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

const sendWelcomeEmail = async (user) => {
  try {
    const sendEmail = require('../utils/email');
    await sendEmail({
      email: user.email,
      subject: 'Welcome to All India Mutual Transfer Portal - Next Steps',
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #eff6ff; border-radius: 32px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #1e40af; padding: 12px 24px; border-radius: 16px; margin-bottom: 12px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">AIMTP</h1>
            </div>
            <p style="color: #1e3a8a; margin: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em;">Success Starts Here</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 45px; border-radius: 28px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #dbeafe;">
            <h2 style="color: #0f172a; margin: 0 0 20px; font-size: 26px; font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">Welcome Aboard, ${user.name.split(' ')[0]}!</h2>
            <p style="color: #475569; margin: 0 0 28px; font-size: 16px; line-height: 1.7;">You have successfully joined the most advanced professional network for Indian Railway employees. We are committed to helping you find the perfect mutual transfer match with ease and transparency.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; margin-bottom: 35px; border-radius: 20px;">
              <h3 style="color: #1e40af; margin: 0 0 15px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: flex; items-center gap: 8px;">
                🚀 Critical Next Steps
              </h3>
              <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 12px;">
                <div style="background-color: #dcfce7; color: #15803d; border-radius: 50%; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; margin-top: 2px;">1</div>
                <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.5;"><strong style="color: #0f172a;">Complete Your Work Profile:</strong> A complete profile ensures you rank higher in searches and receive more relevant match suggestions.</p>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="background-color: #dbeafe; color: #1e40af; border-radius: 50%; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; margin-top: 2px;">2</div>
                <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.5;"><strong style="color: #0f172a;">Post Your Transfer Request:</strong> Specify your current posting and desired locations to activate our real-time matching engine.</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-bottom: 10px;">
              <a href="https://aimtp.in/profile" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 18px 40px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 15px; transition: all 0.2s; letter-spacing: 0.5px;">Finalize My Profile Now</a>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 11px; font-weight: 600; margin-top: 15px;">Secure professional access • Encrypted data</p>
          </div>
          
          <div style="text-align: center; margin-top: 35px; padding: 0 20px;">
            <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.6;">You are receiving this email as a registered member of the All India Mutual Transfer Portal. Please do not reply to this automated message.</p>
            <div style="margin-top: 20px; border-top: 1px solid #dbeafe; pt: 20px;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">© ${new Date().getFullYear()} All India Mutual Transfer Portal</p>
            </div>
          </div>
        </div>
      `,
      message: `Welcome to AIMTP, ${user.name}! Please complete your work profile and post your transfer request at https://aimtp.in/profile to start finding matches.`
    });
  } catch (err) {
    console.error('Welcome email failed:', err);
  }
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
    
    // Domain Restriction
    const allowedDomains = ['gmail.com', 'hotmail.com', 'zohomail.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!allowedDomains.includes(emailDomain)) {
      return res.status(403).json({ message: 'Registration is restricted to Gmail, Hotmail, and Zohomail only.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      mobile,
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      termsAccepted: true,
      loginCount: 1,
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

    // Send professional welcome email
    sendWelcomeEmail(user);

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
        modeOfSelection: user.modeOfSelection,
        currentZone: user.currentZone,
        currentDivision: user.currentDivision,
        currentStation: user.currentStation,
        payLevel: user.payLevel,
        gradePay: user.gradePay,
        basicPay: user.basicPay,
        category: user.category,
        workplaceRemark: user.workplaceRemark,
        appointmentDate: user.appointmentDate,
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

    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

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
        modeOfSelection: user.modeOfSelection,
        currentZone: user.currentZone,
        currentDivision: user.currentDivision,
        currentStation: user.currentStation,
        payLevel: user.payLevel,
        gradePay: user.gradePay,
        basicPay: user.basicPay,
        category: user.category,
        workplaceRemark: user.workplaceRemark,
        appointmentDate: user.appointmentDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google Login / Signup
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    let googleId, email, name, picture;
    
    try {
      // First try as idToken
      try {
        const ticket = await client.verifyIdToken({
            idToken: token,
        });
        const payload = ticket.getPayload();
        googleId = payload.sub;
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
      } catch (idTokenError) {
        // Fallback: try as access_token
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user info with access token');
        }
        
        const payload = await response.json();
        googleId = payload.sub;
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
      }
    } catch (e) {
      console.error('Google token verification failed', e);
      return res.status(401).json({ message: 'Invalid or expired Google token' });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.verified = true;
        if (!user.profileImage) {
          user.profileImage = picture;
        }
      }
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
    } else {
      // Domain Restriction for new users
      const allowedDomains = ['gmail.com', 'hotmail.com', 'zohomail.com'];
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (!allowedDomains.includes(emailDomain)) {
        return res.status(403).json({ message: 'Registration via Google is restricted to Gmail, Hotmail, and Zohomail accounts.' });
      }

      user = await User.create({
        name,
        email,
        googleId,
        verified: true,
        profileImage: picture || '',
        termsAccepted: true,
        loginCount: 1,
      });
      
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: user._id,
        title: 'Welcome to RailTransfer!',
        message: `Hi ${name.split(' ')[0]}, thank you for joining our platform. Start by posting your transfer request to find a match.`,
        type: 'info',
        link: '/transfers/create'
      });
      
      // Send professional welcome email
      sendWelcomeEmail(user);
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
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
        modeOfSelection: user.modeOfSelection,
        currentZone: user.currentZone,
        currentDivision: user.currentDivision,
        currentStation: user.currentStation,
        payLevel: user.payLevel,
        gradePay: user.gradePay,
        basicPay: user.basicPay,
        category: user.category,
        workplaceRemark: user.workplaceRemark,
        appointmentDate: user.appointmentDate,
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
        modeOfSelection: user.modeOfSelection,
        currentZone: user.currentZone,
        currentDivision: user.currentDivision,
        currentStation: user.currentStation,
        payLevel: user.payLevel,
        gradePay: user.gradePay,
        basicPay: user.basicPay,
        category: user.category,
        workplaceRemark: user.workplaceRemark,
        whatsapp: user.whatsapp,
        appointmentDate: user.appointmentDate,
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
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Use the email as the key for password resets since the user is not authenticated
    otpStore.set(`reset_${email}`, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    try {
      await require('../utils/email')({
        email: user.email,
        subject: 'Password Reset Request - AIMTP',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e293b; text-align: center;">All India Mutual Transfer Portal</h2>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p>Hi ${user.name || 'User'},</p>
            <p>We received a request to reset the password for your AIMTP account.</p>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">Your One-Time Password (OTP)</p>
              <h1 style="margin: 10px 0; font-size: 36px; color: #ef4444; letter-spacing: 4px;">${otp}</h1>
              <p style="margin: 0; font-size: 14px; color: #64748b;">Valid for 10 minutes</p>
            </div>
            <p>If you did not request this, you can safely ignore this email.</p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 40px; text-align: center;">© ${new Date().getFullYear()} All India Mutual Transfer Portal. All rights reserved.</p>
          </div>
        `,
        message: `Your AIMTP password reset OTP is ${otp}. This code is valid for 10 minutes.`
      });
      res.json({ message: 'A password reset OTP has been sent to your email.' });
    } catch (err) {
      console.error(err);
      console.log(`Demo Reset OTP for ${email} is: ${otp}`);
      res.json({ message: 'A password reset OTP has been sent (Check server console if no SMTP).' });
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
    const { name, mobile, whatsapp, sector, department, subDepartment, designation, modeOfSelection, currentZone, currentDivision, currentWorkstation, currentLocation, currentStation, payLevel, gradePay, basicPay, category, workplaceRemark, appointmentDate } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (mobile) user.mobile = mobile;
    if (whatsapp !== undefined) user.whatsapp = whatsapp;
    
    // Update profile fields
    user.sector = sector ?? user.sector;
    user.department = department ?? user.department;
    user.subDepartment = subDepartment ?? user.subDepartment;
    user.designation = designation ?? user.designation;
    user.modeOfSelection = modeOfSelection ?? user.modeOfSelection;
    user.currentZone = currentZone ?? user.currentZone;
    user.currentDivision = currentDivision ?? user.currentDivision;
    user.currentWorkstation = currentWorkstation ?? user.currentWorkstation;
    user.currentLocation = currentLocation ?? user.currentLocation;
    user.currentStation = currentStation ?? currentLocation ?? user.currentStation;
    user.payLevel = payLevel ?? user.payLevel;
    user.gradePay = gradePay ?? user.gradePay;
    user.basicPay = basicPay ?? user.basicPay;
    user.category = category ?? user.category;
    user.workplaceRemark = workplaceRemark ?? user.workplaceRemark;
    user.appointmentDate = appointmentDate ?? user.appointmentDate;

    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Track user session time
// @route   POST /api/auth/track-time
// @access  Private
const trackTime = async (req, res, next) => {
  try {
    const { deltaSeconds } = req.body;
    if (!deltaSeconds || deltaSeconds <= 0 || deltaSeconds > 300) {
      return res.status(400).json({ message: 'Invalid delta time' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.totalTimeSpent = (user.totalTimeSpent || 0) + deltaSeconds;
    // skip pre-save hooks if possible to avoid unnecessary processing, actually pre-save hook for passwordHash checks isModified, so it's perfectly safe
    await user.save();

    res.json({ message: 'Time tracked', totalTimeSpent: user.totalTimeSpent });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, googleAuth, getProfile, updateProfile, refresh, changePassword, sendVerificationOtp, verifyEmailOtp, forgotPassword, resetPassword, uploadProfileImage, updateProfileImage, trackTime };
