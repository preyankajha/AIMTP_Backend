const Zone = require('../models/Zone');
const Department = require('../models/Department');
const Sector = require('../models/Sector');
const Category = require('../models/Category');
const PayLevel = require('../models/PayLevel');
const SelectionMode = require('../models/SelectionMode');
const WorkstationType = require('../models/WorkstationType');
const Location = require('../models/Location');

// ──────────────────────────────────────────
// PUBLIC ROUTES
// ──────────────────────────────────────────

// @desc   Get perfectly formatted data for frontend dropdowns
// @route  GET /api/master-data/public
// @access Public
const sortWithOtherLast = (a, b) => {
  const nameA = typeof a === 'string' ? a : a.name;
  const nameB = typeof b === 'string' ? b : b.name;
  const isAOther = nameA?.toLowerCase() === 'other';
  const isBOther = nameB?.toLowerCase() === 'other';
  if (isAOther && !isBOther) return 1;
  if (!isAOther && isBOther) return -1;
  return (nameA || '').localeCompare(nameB || '');
};

const getPublicData = async (req, res, next) => {
  try {
    const [
      dbZones, 
      dbDepartments, 
      dbSectors, 
      dbCategories, 
      dbPayLevels, 
      dbSelectionModes,
      dbWorkstationTypes,
      dbLocations
    ] = await Promise.all([
      Zone.find().lean(),
      Department.find().lean(),
      Sector.find().lean(),
      Category.find().lean(),
      PayLevel.find().sort({ sortOrder: 1 }).lean(),
      SelectionMode.find().lean(),
      WorkstationType.find({ active: true }).lean(),
      Location.find({ active: true }).lean()
    ]);

    const workstationTypes = dbWorkstationTypes.map(w => w.name).sort(sortWithOtherLast);

    // Map DB array into the frontend's legacy object map shape
    const regionData = {};
    dbZones.sort(sortWithOtherLast).forEach(z => {
      const divMap = {};
      z.divisions.sort(sortWithOtherLast).forEach(d => {
        const workstationMap = {};
        workstationTypes.forEach(wt => {
          workstationMap[wt] = [];
        });

        // Map matching locations from flat loads
        const locs = dbLocations.filter(l => l.zone === z.name && l.division === d.name);
        locs.forEach(l => {
          if (workstationMap[l.workstationType]) {
            workstationMap[l.workstationType].push(l.name);
          }
        });

        // Standard with Other logic

        // Standard with Other logic
        Object.keys(workstationMap).forEach(wt => {
          if (workstationMap[wt].length === 0) {
            workstationMap[wt] = ['Other'];
          } else {
            if (!workstationMap[wt].includes('Other')) workstationMap[wt].push('Other');
            workstationMap[wt].sort(sortWithOtherLast);
          }
        });

        divMap[d.name] = workstationMap;
      });
      regionData[z.name] = {
        code: z.code,
        divisions: divMap
      };
    });

    const departmentsData = {};
    dbDepartments.sort(sortWithOtherLast).forEach(d => {
      const subMap = {};
      d.subDepartments.sort(sortWithOtherLast).forEach(sd => {
        const sortedDesignations = sd.designations && sd.designations.length ? [...sd.designations].sort(sortWithOtherLast) : [];
        subMap[sd.name] = sortedDesignations;
      });
      departmentsData[d.name] = {
        subDepartments: subMap
      };
    });

    const sectors = dbSectors.map(s => ({
      group: s.group,
      options: s.options.map(opt => ({
        value: opt.value,
        label: opt.label,
        active: opt.active
      }))
    }));

    const categories = dbCategories.filter(c => c.active).map(c => c.name);
    const payLevels = dbPayLevels.filter(p => p.active).map(p => p.name);
    const modeOfSelection = dbSelectionModes.filter(m => m.active).map(m => ({
      value: m.value,
      label: m.label
    }));

    res.json({ regionData, departments: departmentsData, sectors, categories, payLevels, modeOfSelection, workstationTypes });
  } catch (error) {
    next(error);
  }
};


// ──────────────────────────────────────────
// ADMIN CRUD: ZONES
// ──────────────────────────────────────────

const getZones = async (req, res, next) => {
  try {
    const zones = await Zone.find().lean();
    zones.sort(sortWithOtherLast);
    zones.forEach(z => {
      if (z.divisions) {
        z.divisions.sort(sortWithOtherLast);
        z.divisions.forEach(d => {
          if (d.stations) d.stations.sort(sortWithOtherLast);
        });
      }
    });
    res.json(zones);
  } catch (error) { next(error); }
};

const addZone = async (req, res, next) => {
  try {
    const zone = new Zone(req.body);
    await zone.save();
    res.status(201).json(zone);
  } catch (error) { next(error); }
};

const updateZone = async (req, res, next) => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    res.json(zone);
  } catch (error) { next(error); }
};

const removeZone = async (req, res, next) => {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    res.json({ message: 'Zone removed' });
  } catch (error) { next(error); }
};

// ──────────────────────────────────────────
// ADMIN CRUD: DEPARTMENTS
// ──────────────────────────────────────────

const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().lean();
    departments.sort(sortWithOtherLast);
    departments.forEach(d => {
      if (d.subDepartments) {
        d.subDepartments.sort(sortWithOtherLast);
        d.subDepartments.forEach(sd => {
          if (sd.designations) sd.designations.sort(sortWithOtherLast);
        });
      }
    });
    res.json(departments);
  } catch (error) { next(error); }
};

const addDepartment = async (req, res, next) => {
  try {
    const dept = new Department(req.body);
    await dept.save();
    res.status(201).json(dept);
  } catch (error) { next(error); }
};

const updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (error) { next(error); }
};

const removeDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department removed' });
  } catch (error) { next(error); }
};

// ──────────────────────────────────────────
// ADMIN CRUD: SECTORS
// ──────────────────────────────────────────

const getSectors = async (req, res, next) => {
  try {
    const sectors = await Sector.find().lean();
    res.json(sectors);
  } catch (error) { next(error); }
};

const addSector = async (req, res, next) => {
  try {
    const sector = new Sector(req.body);
    await sector.save();
    res.status(201).json(sector);
  } catch (error) { next(error); }
};

const updateSector = async (req, res, next) => {
  try {
    const sector = await Sector.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sector) return res.status(404).json({ message: 'Sector not found' });
    res.json(sector);
  } catch (error) { next(error); }
};

const removeSector = async (req, res, next) => {
  try {
    const sector = await Sector.findByIdAndDelete(req.params.id);
    if (!sector) return res.status(404).json({ message: 'Sector not found' });
    res.json({ message: 'Sector removed' });
  } catch (error) { next(error); }
};

// ──────────────────────────────────────────
// ADMIN CRUD: CATEGORIES
// ──────────────────────────────────────────

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().lean();
    res.json(categories);
  } catch (error) { next(error); }
};

const addCategory = async (req, res, next) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) { next(error); }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) { next(error); }
};

const removeCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category removed' });
  } catch (error) { next(error); }
};

// ──────────────────────────────────────────
// ADMIN CRUD: PAY LEVELS
// ──────────────────────────────────────────

const getPayLevels = async (req, res, next) => {
  try {
    const payLevels = await PayLevel.find().sort({ sortOrder: 1 }).lean();
    res.json(payLevels);
  } catch (error) { next(error); }
};

const addPayLevel = async (req, res, next) => {
  try {
    const payLevel = new PayLevel(req.body);
    await payLevel.save();
    res.status(201).json(payLevel);
  } catch (error) { next(error); }
};

const updatePayLevel = async (req, res, next) => {
  try {
    const payLevel = await PayLevel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!payLevel) return res.status(404).json({ message: 'Pay Level not found' });
    res.json(payLevel);
  } catch (error) { next(error); }
};

const removePayLevel = async (req, res, next) => {
  try {
    const payLevel = await PayLevel.findByIdAndDelete(req.params.id);
    if (!payLevel) return res.status(404).json({ message: 'Pay Level not found' });
    res.json({ message: 'Pay Level removed' });
  } catch (error) { next(error); }
};

// ──────────────────────────────────────────
// ADMIN CRUD: SELECTION MODES
// ──────────────────────────────────────────

const getSelectionModes = async (req, res, next) => {
  try {
    const modes = await SelectionMode.find().lean();
    res.json(modes);
  } catch (error) { next(error); }
};

const addSelectionMode = async (req, res, next) => {
  try {
    const mode = new SelectionMode(req.body);
    await mode.save();
    res.status(201).json(mode);
  } catch (error) { next(error); }
};

const updateSelectionMode = async (req, res, next) => {
  try {
    const mode = await SelectionMode.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!mode) return res.status(404).json({ message: 'Selection Mode not found' });
    res.json(mode);
  } catch (error) { next(error); }
};

const removeSelectionMode = async (req, res, next) => {
  try {
    const mode = await SelectionMode.findByIdAndDelete(req.params.id);
    if (!mode) return res.status(404).json({ message: 'Selection Mode not found' });
    res.json({ message: 'Selection Mode removed' });
  } catch (error) { next(error); }
};
const seedMasterData = async (req, res, next) => {
  try {
    const { regionData } = require('../zonesData.js');
    const { departments } = require('../departments.js');

    await Zone.deleteMany({});
    await Department.deleteMany({});
    await Sector.deleteMany({});
    await Category.deleteMany({});
    await PayLevel.deleteMany({});
    await SelectionMode.deleteMany({});

    const zonesToInsert = [];
    for (const [zName, zObj] of Object.entries(regionData)) {
      const divisions = [];
      for (const [dName, dStations] of Object.entries(zObj.divisions)) {
        divisions.push({ name: dName, stations: dStations });
      }
      zonesToInsert.push({ name: zName, code: zObj.code, divisions });
    }
    await Zone.insertMany(zonesToInsert);

    const deptsToInsert = [];
    for (const [dName, dObj] of Object.entries(departments)) {
      const subDepartments = [];
      for (const [sdName, designations] of Object.entries(dObj.subDepartments)) {
        subDepartments.push({ name: sdName, designations });
      }
      deptsToInsert.push({ name: dName, subDepartments });
    }
    await Department.insertMany(deptsToInsert);

    // Seed Sectors
    const initialSectors = [
      { group: 'Transport Sector', options: [
        { value: 'Railway', label: '🚆 Indian Railways', active: true },
        { value: 'RoadTransport', label: 'Road Transport Services', active: false },
        { value: 'Aviation', label: 'Aviation Sector', active: false },
        { value: 'Shipping', label: 'Shipping / Ports', active: false },
      ]},
      { group: 'Government Sector', options: [
        { value: 'CentralGovt', label: 'Central Government', active: false },
        { value: 'StateGovt', label: 'State Government', active: false },
        { value: 'PSU', label: 'Public Sector Undertakings (PSU)', active: false },
        { value: 'PublicAdmin', label: 'Public Administration', active: false },
        { value: 'Municipal', label: 'Municipal / Urban Development', active: false },
      ]},
      { group: 'Defense & Security', options: [
        { value: 'Defense', label: 'Defense / Armed Forces', active: false },
        { value: 'Paramilitary', label: 'Paramilitary Forces', active: false },
        { value: 'Police', label: 'Police / Law Enforcement', active: false },
      ]},
      { group: 'Education Sector', options: [
        { value: 'SchoolEducation', label: 'School Education / Teachers', active: false },
        { value: 'University', label: 'Universities & Colleges', active: false },
        { value: 'TechnicalEdu', label: 'Technical Education', active: false },
      ]},
      { group: 'Healthcare Sector', options: [
        { value: 'Medical', label: 'Medical / Healthcare', active: false },
        { value: 'GovtHospital', label: 'Government Hospitals', active: false },
        { value: 'Nursing', label: 'Nursing Staff', active: false },
        { value: 'AYUSH', label: 'AYUSH / Health Services', active: false },
      ]},
      { group: 'Financial Sector', options: [
        { value: 'Banking', label: 'Banking Sector', active: false },
        { value: 'Insurance', label: 'Insurance Sector', active: false },
        { value: 'FinancialInst', label: 'Financial Institutions', active: false },
      ]},
      { group: 'Infrastructure & Utilities', options: [
        { value: 'Power', label: 'Power / Electricity Sector', active: false },
        { value: 'OilGas', label: 'Oil & Gas Sector', active: false },
        { value: 'Telecom', label: 'Telecom Sector', active: false },
      ]},
      { group: 'Technology Sector', options: [
        { value: 'IT', label: 'Information Technology (IT)', active: false },
        { value: 'Cyber', label: 'Digital / Cyber Services', active: false },
      ]},
      { group: 'Public Services', options: [
        { value: 'Postal', label: 'Postal Services', active: false },
        { value: 'Agriculture', label: 'Agriculture Department', active: false },
        { value: 'Environment', label: 'Environmental Services', active: false },
        { value: 'Research', label: 'Research & Scientific Organizations', active: false },
      ]},
      { group: 'Private Sector', options: [
        { value: 'PrivateCompany', label: 'Private Companies', active: false },
        { value: 'Corporate', label: 'Corporate Organizations', active: false },
      ]},
      { group: 'Other', options: [
        { value: 'Other', label: 'Other', active: false },
      ]},
    ];
    await Sector.insertMany(initialSectors);

    // Seed Categories
    const initialCategories = [
      { name: 'General' }, { name: 'OBC' }, { name: 'SC' }, { name: 'ST' }, { name: 'EWS' }
    ];
    await Category.insertMany(initialCategories);

    // Seed Pay Levels
    const initialPayLevels = [
      "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7", 
      "Level 8", "Level 9", "Level 10", "Level 11", "Level 12", "Level 13", 
      "Level 13A", "Level 14", "Level 15", "Level 16", "Level 17", "Level 18"
    ].map((name, index) => ({ name, sortOrder: index }));
    await PayLevel.insertMany(initialPayLevels);

    // Seed Selection Modes
    const initialModes = [
      { value: 'RRB', label: 'RRB (Railway Recruitment Board)' },
      { value: 'GDCE', label: 'GDCE / Departmental' },
      { value: 'OTHER', label: 'Other' },
    ];
    await SelectionMode.insertMany(initialModes);

    const WorkstationType = require('../models/WorkstationType');
    const staticWorkstations = [
      "Station", "Workshop", "Loco Shed", "Hospital", "Health Unit", 
      "Office (Divisional/Zonal)", "Goods Shed", "Freight Terminal", "Parcel Office", 
      "Container Depot", "Coaching Depot", "Wagon Depot", "Sick Line", "Pit Line", 
      "Traction Substation", "TRD Depot", "Power House", "Train Lighting Depot", 
      "Signal Cabin", "Relay Room", "Telecom Office", "Track (P-Way)", "PWI Office", 
      "Gang Hut", "Bridge Site", "Crew Lobby", "Running Room", "Rest House", 
      "Railway Colony", "RPF Post", "GRP Station"
    ];
    await WorkstationType.deleteMany({});
    await WorkstationType.insertMany(staticWorkstations.map(name => ({ name })));

    res.json({ message: 'Master Data successfully seeded' });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────
// ADMIN CRUD: WORKSTATION TYPES
// ──────────────────────────────────────────

const getWorkstationTypes = async (req, res, next) => {
  try {
    const list = await WorkstationType.find().lean();
    res.json(list);
  } catch (error) { next(error); }
};

const addWorkstationType = async (req, res, next) => {
  try {
    const item = new WorkstationType(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) { next(error); }
};

const updateWorkstationType = async (req, res, next) => {
  try {
    const item = await WorkstationType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) { next(error); }
};

const removeWorkstationType = async (req, res, next) => {
  try {
    await WorkstationType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Workstation Type removed' });
  } catch (error) { next(error); }
};

// ──────────────────────────────────────────
// ADMIN CRUD: LOCATIONS
// ──────────────────────────────────────────

const getLocations = async (req, res, next) => {
  try {
    const list = await Location.find().lean();
    res.json(list);
  } catch (error) { next(error); }
};

const addLocation = async (req, res, next) => {
  try {
    const item = new Location(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) { next(error); }
};

const updateLocation = async (req, res, next) => {
  try {
    const item = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) { next(error); }
};

const removeLocation = async (req, res, next) => {
  try {
    await Location.findByIdAndDelete(req.params.id);
    res.json({ message: 'Location removed' });
  } catch (error) { next(error); }
};


module.exports = {
  getPublicData,
  getZones, addZone, updateZone, removeZone,
  getDepartments, addDepartment, updateDepartment, removeDepartment,
  getSectors, addSector, updateSector, removeSector,
  getCategories, addCategory, updateCategory, removeCategory,
  getPayLevels, addPayLevel, updatePayLevel, removePayLevel,
  getSelectionModes, addSelectionMode, updateSelectionMode, removeSelectionMode,
  seedMasterData,
  getWorkstationTypes, addWorkstationType, updateWorkstationType, removeWorkstationType,
  getLocations, addLocation, updateLocation, removeLocation
};
