require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const analyticsMiddleware = require('./middleware/analyticsMiddleware');

// Routes
const authRoutes = require('./routes/auth');
const transferRoutes = require('./routes/transfers');
const matchRoutes = require('./routes/matches');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/admin');
const masterDataRoutes = require('./routes/masterDataRoutes');
const analyticsRoutes = require('./routes/analytics');
const setupCronJobs = require('./utils/cronJobs');

// Connect to MongoDB
connectDB();
// Start Scheduled Tasks
setupCronJobs();

const app = express();
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// -- PRODUCTION READINESS MIDDLEWARE --
// 1. Static security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Response compression (Gzip)
app.use(compression());

// 3. API Rate Limiting (Brute-force protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for dev
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all API routes
app.use('/api', limiter);

app.set('trust proxy', 1);
// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || [
      'http://localhost:5173', 
      'http://localhost:5174', 
      'http://127.0.0.1:5173',
      'http://localhost:3000'
    ],
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// HTTP logger (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Analytics & Hits capture
app.use(analyticsMiddleware);

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'All India Mutual Transfer API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Mutual Transfer API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
