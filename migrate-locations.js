const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const Zone = require('./models/Zone');
    const Location = require('./models/Location');
    
    const zones = await Zone.find({});
    let count = 0;
    
    for (const z of zones) {
      if (!z.divisions) continue;
      
      for (const d of z.divisions) {
        if (d.stations) {
          for (const st of d.stations) {
            try {
              await Location.updateOne(
                { zone: z.name, division: d.name, workstationType: 'Station', name: st },
                { $set: { active: true } },
                { upsert: true }
              );
              count++;
            } catch(e) { console.error(e); }
          }
        }
        
        if (d.workshops) {
          for (const ws of d.workshops) {
            try {
              await Location.updateOne(
                { zone: z.name, division: d.name, workstationType: 'Workshop', name: ws },
                { $set: { active: true } },
                { upsert: true }
              );
              count++;
            } catch(e) { console.error(e); }
          }
        }
        
        if (d.otherLocations && d.otherLocations instanceof Map) {
          for (const [wt, locs] of d.otherLocations.entries()) {
            for (const loc of locs) {
              try {
                await Location.updateOne(
                  { zone: z.name, division: d.name, workstationType: wt, name: loc },
                  { $set: { active: true } },
                  { upsert: true }
                );
                count++;
              } catch(e) { console.error(e); }
            }
          }
        } else if (d.otherLocations) {
          // If plain object
          for (const [wt, locs] of Object.entries(d.otherLocations)) {
            if (Array.isArray(locs)) {
              for (const loc of locs) {
                try {
                  await Location.updateOne(
                    { zone: z.name, division: d.name, workstationType: wt, name: loc },
                    { $set: { active: true } },
                    { upsert: true }
                  );
                  count++;
                } catch(e) { console.error(e); }
              }
            }
          }
        }
      }
    }
    
    console.log(`Migrated ${count} locations successfully to the Location collection.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
});
