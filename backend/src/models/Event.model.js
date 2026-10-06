import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    vehicleId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'GEOFENCE_VIOLATION',
        'SNAPSHOT',
        'FIRE_DETECTED',
        'OBSTACLE_DETECTED',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ vehicle: 1, createdAt: -1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
