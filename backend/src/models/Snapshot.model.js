import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema(
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
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    image: {
      type: Buffer,
      required: true,
      select: false,
    },
    contentType: {
      type: String,
      enum: ['image/jpeg'],
      default: 'image/jpeg',
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    detectedObjects: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    detectionStatus: {
      type: String,
      enum: ['AVAILABLE', 'UNAVAILABLE'],
      default: 'UNAVAILABLE',
    },
    imageWidth: {
      type: Number,
      default: null,
    },
    imageHeight: {
      type: Number,
      default: null,
    },
    source: {
      type: String,
      default: 'ESP32-CAM',
    },
  },
  {
    timestamps: true,
  }
);

snapshotSchema.index({ vehicle: 1, createdAt: -1 });
snapshotSchema.index({ isDeleted: 1, createdAt: -1 });
snapshotSchema.index({ vehicle: 1, isDeleted: 1, createdAt: -1 });

const Snapshot = mongoose.model('Snapshot', snapshotSchema);

export default Snapshot;
