#!/usr/bin/env node
/**
 * Migration script: Create Provider documents for existing provider users
 * Run once to populate Provider collection for users who registered before the fix
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/emergency-gas';

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ MongoDB connected');

    const db = mongoose.connection.db;
    
    // Get all provider users
    const users = await db.collection('users').find({ role: 'provider' }).toArray();
    console.log(`Found ${users.length} provider users`);

    // Get existing providers to avoid duplicates
    const existingProviders = await db.collection('providers').find({}).toArray();
    console.log(`Found ${existingProviders.length} existing provider records`);

    let created = 0;
    for (const user of users) {
      // Check if provider already exists
      const exists = existingProviders.some(p => p.userId.toString() === user._id.toString());
      if (exists) {
        console.log(`⊘ Provider already exists for user ${user.email}`);
        continue;
      }

      // Get user's profile for location
      const profile = await db.collection('profiles').findOne({ userId: user._id });
      
      const providerData = {
        userId: user._id,
        businessName: profile?.fullName || 'Gas Agency',
        businessType: 'LPG',
        location: profile?.location || { type: 'Point', coordinates: [0, 0] },
        address: profile?.address || 'Not specified',
        contactNumber: profile?.phone || '0000000000',
        registrationNumber: `REG-${user._id}`,
        licenseNumber: `LIC-${user._id}`,
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isVerified: false,
        verificationDocument: null,
        operatingHours: { open: '08:00', close: '20:00' },
        availableCylinders: [
          { type: 'LPG', quantity: 20 },
          { type: 'CNG', quantity: 10 },
        ],
        rating: 0,
        totalRatings: 0,
        completedRequests: 0,
        bankDetails: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection('providers').insertOne(providerData);
      console.log(`✓ Created provider for: ${user.email}`);
      created++;
    }

    console.log(`\n✓ Migration complete! Created ${created} new provider records`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
