// Fix provider location data
db.providers.updateMany(
  { "location.type": { $exists: false } },
  { $set: { "location.type": "Point", "location.coordinates": [0, 0] } }
);

// Show results
print("Updated providers without location.type");
db.providers.find({ "location.type": { $exists: false } }).count();
