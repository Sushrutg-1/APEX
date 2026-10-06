import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    deviceToken: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },

    telemetry: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    lastTelemetryAt: {
      type: Date,
      default: null,
    },

    geofence: {
      enabled: {
        type: Boolean,
        default: false,
      },
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
      radiusMeters: {
        type: Number,
        default: null,
      },
      state: {
        type: String,
        enum: ['UNKNOWN', 'INSIDE', 'OUTSIDE'],
        default: 'UNKNOWN',
      },
    },
  },
  {
    timestamps: true,
  }
);

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
