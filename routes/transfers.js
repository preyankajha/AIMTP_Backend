const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createTransfer,
  getMyTransfers,
  getTransferById,
  updateTransfer,
  searchTransfers,
  getPublicTransfers,
  deleteTransfer,
} = require('../controllers/transferController');
const { protect } = require('../middleware/authMiddleware');

const transferValidation = [
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('subDepartment').trim().notEmpty().withMessage('Sub-department is required'),
  body('designation').trim().notEmpty().withMessage('Designation is required'),
  body('modeOfSelection').trim().notEmpty().withMessage('Mode of selection is required'),
  body('basicPay').isNumeric().withMessage('Basic pay must be a number'),
  body('category').isIn(['General', 'SC', 'ST', 'OBC', 'EWS']).withMessage('Invalid category'),
  body('currentZone').trim().notEmpty().withMessage('Current Zone is required'),
  body('currentDivision').trim().notEmpty().withMessage('Current Division is required'),
  body('currentStation').trim().notEmpty().withMessage('Current Station is required'),
  body('workplaceRemark').trim().notEmpty().withMessage('Working condition remarks are required'),
  body('desiredLocations').isArray({ min: 1, max: 4 }).withMessage('You can add a maximum of 4 desired locations')
    .custom((locations) => {
      const priorities = locations.map(loc => parseInt(loc.priority) || 1);
      const uniquePriorities = new Set(priorities);
      if (uniquePriorities.size !== priorities.length) {
        throw new Error('Each desired location must have a unique priority.');
      }
      return true;
    }),
  body('desiredLocations.*.zone').trim().notEmpty().withMessage('Desired Zone is required'),
  body('desiredLocations.*.division').trim().notEmpty().withMessage('Desired Division is required'),
  body('desiredLocations.*.station').trim().notEmpty().withMessage('Desired Station is required')
    .custom((value, { req }) => {
      if (req.body.currentStation && value.toUpperCase() === req.body.currentStation.toUpperCase()) {
        throw new Error('Desired station must be different from current station');
      }
      return true;
    }),
];

router.post('/', protect, transferValidation, createTransfer);
router.get('/my', protect, getMyTransfers);
router.get('/search', protect, searchTransfers);
router.get('/public', getPublicTransfers);
router.get('/:id', protect, getTransferById);
router.put('/:id', protect, transferValidation, updateTransfer);
router.delete('/:id', protect, deleteTransfer);

module.exports = router;
