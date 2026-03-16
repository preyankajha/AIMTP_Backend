const express = require('express');
const router = express.Router();
const {
  getPublicData,
  getZones, addZone, updateZone, removeZone,
  getDepartments, addDepartment, updateDepartment, removeDepartment,
  getSectors, addSector, updateSector, removeSector,
  getCategories, addCategory, updateCategory, removeCategory,
  getPayLevels, addPayLevel, updatePayLevel, removePayLevel,
  getSelectionModes, addSelectionMode, updateSelectionMode, removeSelectionMode,
  seedMasterData
} = require('../controllers/masterDataController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public route for dropdowns
router.get('/public', getPublicData);

// Admin Action - run once to import legacy data
router.post('/seed', protect, adminOnly, seedMasterData);

// Protected Admin Routes
router.use(protect);
router.use(adminOnly);

router.get('/zones', getZones);
router.post('/zones', addZone);
router.put('/zones/:id', updateZone);
router.delete('/zones/:id', removeZone);

router.get('/departments', getDepartments);
router.post('/departments', addDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', removeDepartment);

router.get('/sectors', getSectors);
router.post('/sectors', addSector);
router.put('/sectors/:id', updateSector);
router.delete('/sectors/:id', removeSector);

router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', removeCategory);

router.get('/pay-levels', getPayLevels);
router.post('/pay-levels', addPayLevel);
router.put('/pay-levels/:id', updatePayLevel);
router.delete('/pay-levels/:id', removePayLevel);

router.get('/selection-modes', getSelectionModes);
router.post('/selection-modes', addSelectionMode);
router.put('/selection-modes/:id', updateSelectionMode);
router.delete('/selection-modes/:id', removeSelectionMode);

module.exports = router;
