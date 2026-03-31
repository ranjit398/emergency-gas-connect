// Switch to correct database and fix indexes
db = db.getSiblingDB("emergency-gas");

print("Current indexes on emergency_requests:");
db.emergency_requests.getIndexes().forEach(idx => {
  print(JSON.stringify(idx, null, 2));
});

print("\n--- Dropping all indexes except _id ---");
db.emergency_requests.dropIndexes();

print("\n--- Recreating single 2dsphere index ---");
db.emergency_requests.createIndex({ location: "2dsphere" });
db.emergency_requests.createIndex({ seekerId: 1, createdAt: -1 });
db.emergency_requests.createIndex({ helperId: 1 });
db.emergency_requests.createIndex({ providerId: 1 });
db.emergency_requests.createIndex({ status: 1, createdAt: -1 });
db.emergency_requests.createIndex({ status: 1, priorityScore: -1 });
db.emergency_requests.createIndex({ priorityLevel: 1, status: 1 });

print("\nIndexes recreated successfully!");
print("\nFinal indexes:");
db.emergency_requests.getIndexes().forEach(idx => {
  print("- " + JSON.stringify(idx.key));
});
