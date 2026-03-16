const express = require('express');
const router = express.Router();
const { getMyMatches, revealContact } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

router.get('/my', protect, getMyMatches);
router.post('/reveal-contact', protect, revealContact);

module.exports = router;
