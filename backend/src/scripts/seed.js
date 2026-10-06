import bcrypt from 'bcryptjs';

import User from '../models/User.model.js';
import Vehicle from '../models/Vehicle.model.js';
import connectDB from '../db/db.js';
import env from '../config/env.config.js';

const seed = async () => {
  try {
    if (!env.DEVICE_TOKEN) {
      throw new Error('DEVICE_TOKEN must be configured before seeding');
    }
    if (!env.SEED_ADMIN_PASSWORD) {
      throw new Error('SEED_ADMIN_PASSWORD must be configured before seeding');
    }

    await connectDB();

    // Remove old test data
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // Create password hash
    const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);

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
      deviceToken: env.DEVICE_TOKEN,
      status: 'offline',
    });

    console.log('=================================');
    console.log('APEX seed completed successfully');
    console.log('=================================');
    console.log('Username : admin');
    console.log('Vehicle  : APEX-01');
    console.log('=================================');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
