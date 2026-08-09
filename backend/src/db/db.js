import mongoose from 'mongoose';
import env from '../config/env.config.js';

const connectToDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${env.MONGODB_URI}`);
    console.log('MONGO CONNECTED !! DB HOST : ', connectionInstance.connection.host);
  } catch (error) {
    console.error('MONGO DB CONNECTION FAILED : ', error);
    process.exit(1);
  }
};

export default connectToDB;
