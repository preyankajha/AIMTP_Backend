const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WorkstationType = require('./models/WorkstationType');

dotenv.config();

const workstationTypes = [
  "Station", "Workshop", "Loco Shed", "Hospital", "Health Unit",
  "Office (Divisional/Zonal)", "Goods Shed", "Freight Terminal", "Parcel Office",
  "Container Depot", "Coaching Depot", "Wagon Depot", "Sick Line", "Pit Line",
  "Traction Substation", "TRD Depot", "Power House", "Train Lighting Depot",
  "Signal Cabin", "Relay Room", "Telecom Office", "Track (P-Way)", "PWI Office",
  "Gang Hut", "Bridge Site", "Crew Lobby", "Running Room", "Rest House",
  "Railway Colony", "RPF Post", "GRP Station"
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');

    // Get existing names so we don't duplicate
    const existing = await WorkstationType.find().lean();
    const existingNames = existing.map(w => w.name);

    const toInsert = workstationTypes
      .filter(name => !existingNames.includes(name))
      .map(name => ({ name, active: true }));

    if (toInsert.length === 0) {
      console.log('✅ All workstation types already exist in DB. Nothing to insert.');
    } else {
      await WorkstationType.insertMany(toInsert);
      console.log(`✅ Inserted ${toInsert.length} new workstation types:`);
      toInsert.forEach(w => console.log(`   • ${w.name}`));
    }

    console.log(`\n📊 Total workstation types in DB: ${existing.length + toInsert.length}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
