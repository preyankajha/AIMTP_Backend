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
  body('desiredZone').trim().notEmpty().withMessage('Desired Zone is required'),
  body('desiredDivision').trim().notEmpty().withMessage('Desired Division is required'),
  body('desiredStation').trim().notEmpty().withMessage('Desired Station is required'),
  body('desiredStation').custom((value, { req }) => {
    if (value.toUpperCase() === req.body.currentStation?.toUpperCase()) {
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
