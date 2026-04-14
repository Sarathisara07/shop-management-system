const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const dropIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scrapshop');
    console.log('Connected to MongoDB');
    
    // Drop the old global unique index on "name"
    // Usually named "name_1" by default in MongoDB
    try {
      await mongoose.connection.db.collection('products').dropIndex('name_1');
      console.log('Successfully dropped old global "name_1" index');
    } catch (e) {
      console.log('Global index "name_1" not found or already removed');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error dropping index:', error);
    process.exit(1);
  }
};

dropIndex();
