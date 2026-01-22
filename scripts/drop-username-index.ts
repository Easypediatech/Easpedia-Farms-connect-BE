import mongoose from 'mongoose';

async function dropIndex() {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb+srv://saintagbukor_db_user:wNKjyav5DaNzKtLH@cluster0.a8wrrqs.mongodb.net/test';

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully!');

    const db = mongoose.connection.db!;
    const collection = db.collection('admins');

    console.log('\nCurrent indexes:');
    const indexes = await collection.indexes();
    indexes.forEach((idx) => {
      console.log(`- ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Check if username_1 index exists
    const hasUsernameIndex = indexes.some((idx) => idx.name === 'username_1');

    if (hasUsernameIndex) {
      console.log('\n✗ Found username_1 index. Dropping...');
      await collection.dropIndex('username_1');
      console.log('✓ Index dropped successfully!');
    } else {
      console.log('\n✓ No username_1 index found. Nothing to drop.');
    }

    console.log('\nRemaining indexes:');
    const remainingIndexes = await collection.indexes();
    remainingIndexes.forEach((idx) => {
      console.log(`- ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    await mongoose.disconnect();
    console.log('\n✓ Done!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

dropIndex();
