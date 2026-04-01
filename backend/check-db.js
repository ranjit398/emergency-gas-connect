const mongoose = require('mongoose');
require('dotenv').config();

async function checkDB() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected\n');
    
    const db = mongoose.connection.db;
    
    // Get all providers
    const providers = await db.collection('providers').find({}).toArray();
    console.log('=== PROVIDERS ===');
    console.log('Total:', providers.length);
    providers.forEach((p, i) => {
      console.log('\nProvider ' + (i + 1) + ':');
      console.log(JSON.stringify(p, null, 2));
    });
    
    // Get all users
    const users = await db.collection('users').find({}).toArray();
    console.log('\n\n=== USERS ===');
    console.log('Total:', users.length);
    
    // Get collections summary
    const collections = await db.listCollections().toArray();
    console.log('\n\n=== DATABASE SUMMARY ===');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(col.name + ':', count);
    }
    
    await mongoose.connection.close();
    console.log('\n✓ Database check complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkDB();
