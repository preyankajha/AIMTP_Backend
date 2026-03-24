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
  seedMasterData,
  getWorkstationTypes, addWorkstationType, updateWorkstationType, removeWorkstationType,
  getLocations, addLocation, updateLocation, removeLocation,
  getDuplicates, removeDuplicates
} = require('../controllers/masterDataController');
const { 
  submitSuggestion, 
  getSuggestions, 
  updateSuggestionStatus 
} = require('../controllers/suggestionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public route for dropdowns
router.get('/public', getPublicData);

// Admin Action - run once to import legacy data
router.post('/seed', protect, adminOnly, seedMasterData);

// Protected Admin Routes
router.use(protect);

// User & Admin Suggestions
router.post('/suggestions', submitSuggestion);
router.get('/suggestions', getSuggestions);
router.put('/suggestions/:id', protect, adminOnly, (req, res, next) => {
  // We'll define updateSuggestion in controller
  const { updateSuggestion } = require('../controllers/suggestionController');
  updateSuggestion(req, res, next);
});

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

router.get('/workstation-types', getWorkstationTypes);
router.post('/workstation-types', addWorkstationType);
router.put('/workstation-types/:id', updateWorkstationType);
router.delete('/workstation-types/:id', removeWorkstationType);

router.get('/locations', getLocations);
router.post('/locations', addLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', removeLocation);

router.get('/duplicates', getDuplicates);
router.post('/remove-duplicates', removeDuplicates);

// Admin-only suggestion management
router.patch('/suggestions/:id', updateSuggestionStatus);

module.exports = router;
