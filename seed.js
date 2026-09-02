const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/userModel');

dotenv.config();

const seedAdmin = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (adminExists) {
      console.log('Admin user already exists!');
    console.log('Admin user processing completed.');
    }

    const adminUser = new User({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      phone: process.env.ADMIN_PHONE,
      role: 'admin',
      status: 'active'
    });

    await adminUser.save();

  }
};

seedAdmin();
