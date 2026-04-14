const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const fixEmailIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scrapshop');
    console.log('MongoDB Connected...');

    // Access the raw collection to drop the old index
    const collection = mongoose.connection.collection('users');
    
    console.log('Dropping existing email index...');
    try {
      await collection.dropIndex('email_1');
      console.log('Old index dropped successfully.');
    } catch (e) {
      console.log('Old index not found or already dropped.');
    }

    console.log('The Mongoose model will recreate the index with { sparse: true } on next start.');
    process.exit();
  } catch (error) {
    console.error('Error fixing index:', error);
    process.exit(1);
  }
};

fixEmailIndex();
