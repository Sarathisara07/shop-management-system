const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const deleteAllCashiers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scrapshop');
    console.log('MongoDB Connected...');

    const result = await User.deleteMany({ role: 'cashier' });
    console.log(`Successfully deleted ${result.deletedCount} cashiers.`);

    process.exit();
  } catch (error) {
    console.error('Error deleting cashiers:', error);
    process.exit(1);
  }
};

deleteAllCashiers();
