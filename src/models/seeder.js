import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const admin = await User.findOne({ email: 'admin@stackit.dev' });
if (!admin) {
  await User.create({
    name: 'Admin One',
    email: 'admin@stackit.dev',
    password: 'SuperSecret123',
    role: 'admin'
  });
  console.log('Admin seeded');
}
process.exit();
