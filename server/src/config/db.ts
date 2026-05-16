import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User';
import { hashPassword } from '../utils/password';

export const connectDB = async (): Promise<void> => {
  let uri = process.env.MONGODB_URI;
  let isInMemory = false;
  
  if (!uri || uri.includes('<user>:<password>')) {
    console.log('⚠️ No valid MONGODB_URI found. Starting temporary IN-MEMORY MongoDB for testing...');
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    isInMemory = true;
  }

  try {
    await mongoose.connect(uri);
    if (isInMemory) {
      console.log('✅ Temporary In-Memory MongoDB connected successfully (Data will be lost on restart)');
    } else {
      console.log('✅ MongoDB Atlas connected successfully! (Data is saved permanently)');
    }

    // Seed sample Project Lead and Quality Reviewer if not exist
    const plCount = await User.countDocuments({ role: 'PROJECT_LEAD' });
    if (plCount === 0) {
      console.log('🌱 Seeding sample Project Lead and Quality Reviewer...');
      const ph = await hashPassword('password123');
      const pl = await User.create({
        fullName: 'Sample Project Lead',
        email: 'lead@ethara.ai',
        passwordHash: ph,
        role: 'PROJECT_LEAD',
        jobTitle: 'Demo Project Manager'
      });
      await User.create({
        fullName: 'Sample Quality Reviewer',
        email: 'reviewer@ethara.ai',
        passwordHash: ph,
        role: 'QUALITY_REVIEWER',
        jobTitle: 'Demo QA',
        projectLeadId: pl._id
      });
    }

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });
};
