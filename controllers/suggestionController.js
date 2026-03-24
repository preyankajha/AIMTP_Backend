const Suggestion = require('../models/Suggestion');
const Notification = require('../models/Notification');

// @desc    Submit a master data suggestion
// @route   POST /api/master-data/suggestions
// @access  Private
const submitSuggestion = async (req, res, next) => {
  try {
    const { type, details } = req.body;
    
    if (!type || !details || (!details.name && !details.division)) {
      return res.status(400).json({ message: 'Type and name are required' });
    }

    const suggestion = await Suggestion.create({
      userId: req.user._id,
      type,
      details,
      status: 'pending'
    });

    res.status(201).json({ message: 'Suggestion submitted successfully', suggestion });
  } catch (error) {
    next(error);
  }
};

// @desc    Get suggestions (Admin can see all, user can see their own)
// @route   GET /api/master-data/suggestions
// @access  Private
const getSuggestions = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }
    
    const suggestions = await Suggestion.find(query)
      .populate('userId', 'name email mobile')
      .sort({ createdAt: -1 });
    
    res.json(suggestions);
  } catch (error) {
    next(error);
  }
};

// @desc    Update suggestion record (Admin Only)
// @route   PUT /api/master-data/suggestions/:id
// @access  Private/Admin
const updateSuggestion = async (req, res, next) => {
  try {
    const { type, details } = req.body;
    const suggestion = await Suggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    if (type) suggestion.type = type;
    if (details) suggestion.details = { ...suggestion.details, ...details };
    
    await suggestion.save();
    res.json({ message: 'Suggestion updated', suggestion });
  } catch (error) {
    next(error);
  }
};

// @desc    Update suggestion status (Admin Only)
// @route   PATCH /api/master-data/suggestions/:id
// @access  Private/Admin
const updateSuggestionStatus = async (req, res, next) => {
  try {
    const { status, adminRemark } = req.body;
    const suggestion = await Suggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    // Logic to add to Master Data if approved
    if (status === 'approved' && suggestion.status !== 'approved') {
      const { type, details } = suggestion;
      const Zone = require('../models/Zone');
      const Department = require('../models/Department');
      const LocationModel = require('../models/Location');
      const WorkstationType = require('../models/WorkstationType');

      if (['Zone', 'Division', 'Location'].includes(type)) {
        if (type === 'Zone') {
           const existing = await Zone.findOne({ name: details.name });
           if (!existing) {
             await Zone.create({ name: details.name, code: details.name.substring(0, 3).toUpperCase() });
           }
        } else if (type === 'Division') {
           const zone = await Zone.findOne({ name: details.zone });
           if (zone) {
             const divExists = zone.divisions?.some(d => d.name === details.name);
             if (!divExists) {
               zone.divisions.push({ name: details.name });
               await zone.save();
             }
           }
        } else if (type === 'Location') {
           // Ensure it doesn't already exist to avoid mongo unique index errors
           const existing = await LocationModel.findOne({ 
             zone: details.zone, division: details.division, workstationType: details.workstationType, name: details.name 
           });
           if (!existing) {
             await LocationModel.create({
               name: details.name,
               zone: details.zone,
               division: details.division,
               workstationType: details.workstationType,
               active: true
             });
           }
        }
      } else if (['Department', 'SubDepartment', 'Designation'].includes(type)) {
         let dept = await Department.findOne({ name: details.department || details.name });
         
         if (type === 'Department') {
            if (!dept) {
              await Department.create({ name: details.name, subDepartments: [] });
            }
         } else if (type === 'SubDepartment') {
            if (dept) {
               const subExists = dept.subDepartments?.find(sd => sd.name === details.name);
               if (!subExists) {
                 dept.subDepartments.push({ name: details.name, designations: [] });
                 await dept.save();
               }
            } else {
               // If dept doesn't exist, create it with the sub-dept
               await Department.create({
                 name: details.department,
                 subDepartments: [{ name: details.name, designations: [] }]
               });
            }
         } else if (type === 'Designation') {
            if (!dept) {
               // Create the whole chain
               await Department.create({
                 name: details.department,
                 subDepartments: [{ name: details.subDepartment, designations: [details.name] }]
               });
            } else {
               let sub = dept.subDepartments?.find(sd => sd.name === details.subDepartment);
               if (!sub) {
                  dept.subDepartments.push({ name: details.subDepartment, designations: [details.name] });
                  await dept.save();
               } else {
                  if (!sub.designations.includes(details.name)) {
                     sub.designations.push(details.name);
                     await dept.save();
                  }
               }
            }
         }
      } else if (type === 'WorkstationType') {
         const existing = await WorkstationType.findOne({ name: details.name });
         if (!existing) {
            await WorkstationType.create({ name: details.name, active: true });
         }
      }
    }

    suggestion.status = status;
    if (adminRemark) suggestion.adminRemark = adminRemark;
    await suggestion.save();

    // Notify the user
    await Notification.create({
      userId: suggestion.userId,
      title: `Suggestion Update: ${suggestion.type}`,
      message: `Your request to add "${suggestion.details.name}" has been ${status}. ${adminRemark ? `Remark: ${adminRemark}` : ''}`,
      type: status === 'approved' ? 'success' : 'info',
      link: '/settings'
    });

    res.json({ message: `Suggestion ${status}`, suggestion });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitSuggestion,
  getSuggestions,
  updateSuggestion,
  updateSuggestionStatus
};
