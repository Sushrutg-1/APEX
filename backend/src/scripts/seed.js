import bcrypt from 'bcryptjs';

import User from '../models/User.model.js';
import Vehicle from '../models/Vehicle.model.js';
import connectDB from '../db/db.js';

const seed = async () => {
  try {
    await connectDB();

    // Remove old test data
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // Create password hash
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Create user
    const user = await User.create({
      username: 'admin',
      passwordHash,
      vehicleId: 'APEX-01',
      role: 'owner',
    });

    // Create vehicle
    await Vehicle.create({
      vehicleId: 'APEX-01',
      name: 'APEX Rover',
      owner: user._id,
      deviceToken: 'APEX_DEVICE_SECRET_001',
      status: 'offline',
    });

    console.log('=================================');
    console.log('APEX seed completed successfully');
    console.log('=================================');
    console.log('Username : admin');
    console.log('Password : admin123');
    console.log('Vehicle  : APEX-01');
    console.log('=================================');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
