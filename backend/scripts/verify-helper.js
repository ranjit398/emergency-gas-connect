#!/usr/bin/env node
/**
 * Verify a helper account by updating verificationStatus
 * Usage: node scripts/verify-helper.js <userId>
 */

require('dotenv').config({ path: '../.env' });
const { MongoClient, ObjectId } = require('mongodb');

async function verifyHelper(userId) {
  const mongoDB = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency-gas';
  const client = new MongoClient(mongoDB);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db();
    const profilesCollection = db.collection('profiles');

    // Convert userId string to ObjectId
    const userObjectId = new ObjectId(userId);

    // Update the profile
    const result = await profilesCollection.findOneAndUpdate(
      { userId: userObjectId },
      { $set: { verificationStatus: 'verified' } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      console.log('✗ Profile not found for userId:', userId);
      process.exit(1);
    }

    console.log('✓ Helper verified successfully!');
    console.log('  Name:', result.value.fullName);
    console.log('  Verification Status:', result.value.verificationStatus);
    console.log('\n  Refresh the dashboard to see the change!');
    
    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Get userId from command line argument
const userId = process.argv[2];
if (!userId) {
  console.log('Usage: node scripts/verify-helper.js <userId>');
  console.log('\nExample:');
  console.log('  node scripts/verify-helper.js 65a1b2c3d4e5f6g7h8i9j0k1');
  console.log('\nFind your userId:');
  console.log('  1. Open browser console (F12)');
  console.log('  2. Go to Application > LocalStorage');
  console.log('  3. Find "user" key in localhost:5173');
  console.log('  4. Copy the "id" field');
  process.exit(1);
}

verifyHelper(userId);
