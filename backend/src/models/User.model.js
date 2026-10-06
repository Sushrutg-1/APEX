import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    vehicleId: {
      type: String,
      required: true,
      unique: true,
    },

    role: {
      type: String,
      default: 'owner',
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
