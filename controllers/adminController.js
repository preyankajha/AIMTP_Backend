const User = require('../models/User');
const TransferRequest = require('../models/TransferRequest');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const VisitorLog = require('../models/VisitorLog');
const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────
// OVERVIEW STATS
// ──────────────────────────────────────────

// @desc   Get platform overview stats
// @route  GET /api/admin/stats
// @access Private/Admin
const getStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsersToday,
      totalTransfers,
      activeTransfers,
      totalMatches,
      newUsersToday,
      newTransfersToday,
      totalHits,
      hitsToday,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ updatedAt: { $gte: todayStart } }),
      TransferRequest.countDocuments(),
      TransferRequest.countDocuments({ status: 'active' }),
      Match.countDocuments(),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      TransferRequest.countDocuments({ createdAt: { $gte: todayStart } }),
      VisitorLog.countDocuments(),
      VisitorLog.countDocuments({ timestamp: { $gte: todayStart } }),
    ]);

    res.json({
      totalUsers,
      activeUsersToday,
      totalTransfers,
      activeTransfers,
      totalMatches,
      newUsersToday,
      newTransfersToday,
      totalHits,
      hitsToday,
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────
// ANALYTICS (30-day time series)
// ──────────────────────────────────────────

// @desc   Get 30-day daily analytics
// @route  GET /api/admin/analytics
// @access Private/Admin
const getAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const userTimeSeries = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const transferTimeSeries = await TransferRequest.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const matchTimeSeries = await Match.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Merge into a map by date for easy charting
    const dateMap = {};
    const iterDate = new Date(startDate);
    while (iterDate <= new Date()) {
      const key = iterDate.toISOString().split('T')[0];
      dateMap[key] = { date: key, users: 0, transfers: 0, matches: 0 };
      iterDate.setDate(iterDate.getDate() + 1);
    }

    userTimeSeries.forEach(({ _id, count }) => {
      if (dateMap[_id]) dateMap[_id].users = count;
    });
    transferTimeSeries.forEach(({ _id, count }) => {
      if (dateMap[_id]) dateMap[_id].transfers = count;
    });
    matchTimeSeries.forEach(({ _id, count }) => {
      if (dateMap[_id]) dateMap[_id].matches = count;
    });

    // Zone distribution
    const zoneDistribution = await TransferRequest.aggregate([
      { $group: { _id: '$currentZone', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Category distribution
    const categoryDistribution = await TransferRequest.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    res.json({
      timeSeries: Object.values(dateMap),
      zoneDistribution,
      categoryDistribution,
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────
// USER MANAGEMENT
// ──────────────────────────────────────────

// @desc   Get all users (paginated, filterable)
// @route  GET /api/admin/users
// @access Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, zone, division } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .select('-passwordHash');

    const total = await User.countDocuments(query);

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

// @desc   Get visitor logs (hits/device/location)
// @route  GET /api/admin/visitor-logs
// @access Private/Admin
const getVisitorLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await VisitorLog.find()
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    const total = await VisitorLog.countDocuments();
    
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single user detail
// @route  GET /api/admin/users/:id
// @access Private/Admin
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const transfers = await TransferRequest.find({ userId: user._id }).sort({ createdAt: -1 });
    const matches = await Match.find({
      $or: [{ userA: user._id }, { userB: user._id }],
    }).limit(5);

    res.json({ user, transfers, matches });
  } catch (error) {
    next(error);
  }
};

// @desc   Suspend user (toggle verified flag)
// @route  PATCH /api/admin/users/:id/suspend
// @access Private/Admin
const suspendUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot suspend admin users' });

    user.verified = !user.verified;
    await user.save();

    res.json({ message: `User ${user.verified ? 'activated' : 'suspended'} successfully`, verified: user.verified });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete a user and their data
// @route  DELETE /api/admin/users/:id
// @access Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin accounts' });

    // cascade delete user data
    await Promise.all([
      TransferRequest.deleteMany({ userId: user._id }),
      Notification.deleteMany({ userId: user._id }),
      Match.deleteMany({ $or: [{ userA: user._id }, { userB: user._id }] }),
      User.findByIdAndDelete(user._id),
    ]);

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────
// TRANSFER MANAGEMENT
// ──────────────────────────────────────────

// @desc   Get all transfer requests
// @route  GET /api/admin/transfers
// @access Private/Admin
const getAllTransfers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, zone, status } = req.query;
    const query = {};

    if (zone) query.currentZone = zone;
    if (status) query.status = status;

    const transfers = await TransferRequest.find(query)
      .populate('userId', 'name email mobile')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await TransferRequest.countDocuments(query);

    res.json({ transfers, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete a transfer request
// @route  DELETE /api/admin/transfers/:id
// @access Private/Admin
const deleteTransfer = async (req, res, next) => {
  try {
    const transfer = await TransferRequest.findByIdAndDelete(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    res.json({ message: 'Transfer request deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────
// MATCH MANAGEMENT
// ──────────────────────────────────────────

// @desc   Get all matches
// @route  GET /api/admin/matches
// @access Private/Admin
const getAllMatches = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const matches = await Match.find()
      .populate('userA', 'name email')
      .populate('userB', 'name email')
      .populate('requestA', 'currentZone currentStation desiredZone desiredStation designation')
      .populate('requestB', 'currentZone currentStation desiredZone desiredStation designation')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Match.countDocuments();

    res.json({ matches, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete a match
// @route  DELETE /api/admin/matches/:id
// @access Private/Admin
const deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc   Get recent activity feed
// @route  GET /api/admin/activity
// @access Private/Admin
const getRecentActivity = async (req, res, next) => {
  try {
    const [users, transfers, matches] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt'),
      TransferRequest.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name')
        .select('userId currentStation desiredStation designation createdAt'),
      Match.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userA', 'name')
        .populate('userB', 'name')
        .select('userA userB createdAt'),
    ]);

    const feed = [
      ...users.map(u => ({ type: 'user', message: `${u.name} registered`, time: u.createdAt })),
      ...transfers.map(t => ({
        type: 'transfer',
        message: `${t.userId?.name || 'Someone'} posted a request: ${t.currentStation} → ${t.desiredStation}`,
        time: t.createdAt,
      })),
      ...matches.map(m => ({
        type: 'match',
        message: `${m.userA?.name} matched with ${m.userB?.name}`,
        time: m.createdAt,
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 20);

    res.json({ feed });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────

// @desc   Get system settings
// @route  GET /api/admin/settings
// @access Private/Admin
const getSettings = async (req, res, next) => {
  try {
    res.json({
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: process.env.SMTP_PORT || '587',
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || '',
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update system settings
// @route  PUT /api/admin/settings
// @access Private/Admin
const updateSettings = async (req, res, next) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
    
    // Update process.env in memory immediately so we don't have to bounce the server
    if (smtpHost !== undefined) process.env.SMTP_HOST = smtpHost;
    if (smtpPort !== undefined) process.env.SMTP_PORT = smtpPort;
    if (smtpUser !== undefined) process.env.SMTP_USER = smtpUser;
    if (smtpPass !== undefined) process.env.SMTP_PASS = smtpPass;

    // Persist to .env safely
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    try {
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
    } catch (e) {
      console.warn("Could not read .env file", e);
    }

    // Helper to replace or append
    const setEnvValue = (key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    };

    if (smtpHost !== undefined) setEnvValue('SMTP_HOST', smtpHost);
    if (smtpPort !== undefined) setEnvValue('SMTP_PORT', smtpPort);
    if (smtpUser !== undefined) setEnvValue('SMTP_USER', smtpUser);
    if (smtpPass !== undefined) setEnvValue('SMTP_PASS', smtpPass);

    fs.writeFileSync(envPath, envContent.trim() + '\n');
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getAnalytics,
  getAllUsers,
  getVisitorLogs,
  getUserById,
  suspendUser,
  deleteUser,
  getAllTransfers,
  deleteTransfer,
  getAllMatches,
  deleteMatch,
  getRecentActivity,
  getSettings,
  updateSettings,
};
