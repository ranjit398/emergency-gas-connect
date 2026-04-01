/**
 * MongoDB Indexes Migration Script
 * Creates all necessary indexes for optimal query performance
 * Run: node create-indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;

    // Emergency Requests Indexes
    console.log('📑 Creating Emergency Requests indexes...');
    await db.collection('emergency_requests').createIndex({ providerId: 1, createdAt: -1 });
    console.log('  ✓ providerId + createdAt (for provider requests pagination)');
    
    await db.collection('emergency_requests').createIndex({ providerId: 1, status: 1, createdAt: -1 });
    console.log('  ✓ providerId + status + createdAt (for status filtering)');
    
    await db.collection('emergency_requests').createIndex({ createdAt: -1 });
    console.log('  ✓ createdAt (for analytics date range queries)');
    
    await db.collection('emergency_requests').createIndex({ status: 1 });
    console.log('  ✓ status (for status aggregations)');

    // Providers Indexes
    console.log('\n📑 Creating Providers indexes...');
    await db.collection('providers').createIndex({ 'location.coordinates': '2dsphere' });
    console.log('  ✓ location.coordinates 2dsphere (for geospatial queries)');
    
    await db.collection('providers').createIndex({ businessType: 1, isVerified: 1 });
    console.log('  ✓ businessType + isVerified (for provider filtering)');
    
    await db.collection('providers').createIndex({ rating: -1 });
    console.log('  ✓ rating descending (for top providers sorting)');

    // Ratings Indexes
    console.log('\n📑 Creating Ratings indexes...');
    await db.collection('ratings').createIndex({ providerId: 1, createdAt: -1 });
    console.log('  ✓ providerId + createdAt (for provider ratings history)');
    
    await db.collection('ratings').createIndex({ seekerId: 1 });
    console.log('  ✓ seekerId (for user ratings lookup)');

    // Messages Indexes
    console.log('\n📑 Creating Messages indexes...');
    await db.collection('messages').createIndex({ conversationId: 1, createdAt: -1 });
    console.log('  ✓ conversationId + createdAt (for chat pagination)');
    
    await db.collection('messages').createIndex({ senderId: 1, createdAt: -1 });
    console.log('  ✓ senderId + createdAt (for user message history)');

    // Users Indexes
    console.log('\n📑 Creating Users indexes...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('  ✓ email unique (for authentication)');
    
    await db.collection('users').createIndex({ role: 1 });
    console.log('  ✓ role (for role-based queries)');

    // Notifications Indexes
    console.log('\n📑 Creating Notifications indexes...');
    await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 });
    console.log('  ✓ userId + createdAt (for notification pagination)');
    
    await db.collection('notifications').createIndex({ isRead: 1 });
    console.log('  ✓ isRead (for unread notification count)');

    console.log('\n✅ All indexes created successfully!\n');

    // Show index stats
    console.log('📊 Index Statistics:');
    const eqIndexes = await db.collection('emergency_requests').getIndexes();
    console.log(`  Emergency Requests: ${Object.keys(eqIndexes).length} indexes`);
    
    const provIndexes = await db.collection('providers').getIndexes();
    console.log(`  Providers: ${Object.keys(provIndexes).length} indexes`);
    
    const ratingIndexes = await db.collection('ratings').getIndexes();
    console.log(`  Ratings: ${Object.keys(ratingIndexes).length} indexes`);
    
    const msgIndexes = await db.collection('messages').getIndexes();
    console.log(`  Messages: ${Object.keys(msgIndexes).length} indexes`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createIndexes();
