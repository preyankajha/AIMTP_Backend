const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/profiles/'));
  },
  filename: function (req, file, cb) {
    // Generate a secure random filename to prevent collisions and malicious file names
    const randomHex = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-${randomHex}${ext}`);
  }
});

// File filter (Security)
const fileFilter = (req, file, cb) => {
  // Allow only standard image formats
  const allowedMimetypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  
  if (allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'), false);
  }
};

// Initialize multer
const uploadProfile = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB Limit
  }
});

module.exports = {
  uploadProfile
};
