import mongoose from 'mongoose';

import Event from '../models/Event.model.js';
import Snapshot from '../models/Snapshot.model.js';
import Vehicle from '../models/Vehicle.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import HTTP_STATUS from '../constants/httpStatus.constant.js';
import env from '../config/env.config.js';
import { runYoloInference } from '../services/yolo.service.js';
import { getControllerSocket } from '../websocket/websocket.manager.js';

const SNAPSHOT_LIMIT_BYTES = 8 * 1024 * 1024;
const AI_UNAVAILABLE_RETRY_MS = 5000;
const detectionStates = new Map();
let lastDetectionStatePruneAt = 0;

const isJpeg = (image) =>
  Buffer.isBuffer(image) &&
  image.length >= 3 &&
  image.length <= SNAPSHOT_LIMIT_BYTES &&
  image[0] === 0xff &&
  image[1] === 0xd8 &&
  image[2] === 0xff;

const sendToController = (vehicleId, message) => {
  const socket = getControllerSocket(vehicleId);

  if (!socket || socket.readyState !== 1) {
    return;
  }

  try {
    socket.send(JSON.stringify(message));
  } catch (error) {
    console.error(`Unable to send AI update for ${vehicleId}:`, error.message);
  }
};

const getDetectionState = (vehicleId) => {
  const now = Date.now();

  if (detectionStates.size >= 100 && now - lastDetectionStatePruneAt >= 60000) {
    lastDetectionStatePruneAt = now;
    for (const [id, state] of detectionStates) {
      if (!state.inFlight && now - state.lastRequestedAt > 5 * 60 * 1000) {
        detectionStates.delete(id);
      }
    }
  }

  if (!detectionStates.has(vehicleId)) {
    detectionStates.set(vehicleId, {
      inFlight: false,
      lastRequestedAt: 0,
      status: 'UNAVAILABLE',
    });
  }

  return detectionStates.get(vehicleId);
};

const getDetectionInterval = () => Math.ceil(1000 / env.YOLO_DETECTION_FPS);

const getLiveDetection = async (req, res, next) => {
  try {
    const image = req.body;

    if (!isJpeg(image)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'A JPEG frame up to 8 MB is required');
    }

    const vehicle = await getOwnedVehicle(req);
    const state = getDetectionState(vehicle.vehicleId);
    const now = Date.now();
    const interval = getDetectionInterval();
    const remainingInterval = Math.max(0, state.lastRequestedAt + interval - now);

    if (state.inFlight || remainingInterval > 0) {
      const retryAfterMs = state.inFlight
        ? Math.max(500, interval)
        : Math.max(100, remainingInterval);

      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          HTTP_STATUS.OK,
          { status: 'BUSY', nextFrameInMs: retryAfterMs },
          'Detection frame deferred'
        )
      );
    }

    state.inFlight = true;
    state.lastRequestedAt = now;

    try {
      const result = await runYoloInference(image);

      if (result?.status === 'BUSY') {
        return res.status(HTTP_STATUS.OK).json(
          new ApiResponse(
            HTTP_STATUS.OK,
            { status: 'BUSY', nextFrameInMs: Math.max(500, interval) },
            'Detection service is busy'
          )
        );
      }

      if (!result) {
        state.status = 'UNAVAILABLE';
        sendToController(vehicle.vehicleId, {
          type: 'AI_STATUS',
          vehicleId: vehicle.vehicleId,
          status: 'UNAVAILABLE',
        });

        return res.status(HTTP_STATUS.OK).json(
          new ApiResponse(
            HTTP_STATUS.OK,
            {
              status: 'UNAVAILABLE',
              nextFrameInMs: AI_UNAVAILABLE_RETRY_MS,
            },
            'Object detection unavailable'
          )
        );
      }

      const timestamp = new Date().toISOString();
      const detectionMessage = {
        type: 'OBJECT_DETECTION',
        vehicleId: vehicle.vehicleId,
        timestamp,
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        detections: result.detections,
      };

      if (state.status !== 'ACTIVE') {
        sendToController(vehicle.vehicleId, {
          type: 'AI_STATUS',
          vehicleId: vehicle.vehicleId,
          status: 'ACTIVE',
        });
      }

      state.status = 'ACTIVE';
      sendToController(vehicle.vehicleId, detectionMessage);

      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          HTTP_STATUS.OK,
          {
            status: 'ACTIVE',
            imageWidth: result.imageWidth,
            imageHeight: result.imageHeight,
            detections: result.detections,
            nextFrameInMs: interval,
          },
          'Object detections received'
        )
      );
    } finally {
      state.inFlight = false;
    }
  } catch (error) {
    next(error);
  }
};

const getOwnedVehicle = async (req) => {
  const vehicle = await Vehicle.findOne({
    vehicleId: req.user.vehicleId,
    owner: req.user.userId,
  });

  if (!vehicle) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Vehicle not found');
  }

  return vehicle;
};

const getVehicle = async (req, res, next) => {
  try {
    const vehicle = await getOwnedVehicle(req);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          vehicleId: vehicle.vehicleId,
          name: vehicle.name,
          status: vehicle.status,
          telemetry: vehicle.telemetry,
          lastTelemetryAt: vehicle.lastTelemetryAt,
          geofence: vehicle.geofence,
        },
        'Vehicle data retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};

const getGeofence = async (req, res, next) => {
  try {
    const vehicle = await getOwnedVehicle(req);

    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, vehicle.geofence, 'Geofence retrieved'));
  } catch (error) {
    next(error);
  }
};

const updateGeofence = async (req, res, next) => {
  try {
    const { enabled, latitude, longitude, radiusMeters } = req.body || {};

    if (typeof enabled !== 'boolean') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Geofence enabled must be a boolean');
    }

    const vehicle = await getOwnedVehicle(req);
    const isValidLatitude = (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
    const isValidLongitude = (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
    const isValidRadius = (value) =>
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0 &&
      value <= 100000;

    if (
      (latitude !== undefined && !isValidLatitude(latitude)) ||
      (longitude !== undefined && !isValidLongitude(longitude)) ||
      (radiusMeters !== undefined && !isValidRadius(radiusMeters))
    ) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Geofence coordinates or radius are invalid');
    }

    const nextLatitude = latitude ?? vehicle.geofence?.latitude;
    const nextLongitude = longitude ?? vehicle.geofence?.longitude;
    const nextRadius = radiusMeters ?? vehicle.geofence?.radiusMeters;

    if (
      enabled &&
      (!isValidLatitude(nextLatitude) ||
        !isValidLongitude(nextLongitude) ||
        !isValidRadius(nextRadius))
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Enabled geofences require valid coordinates and a radius between 0 and 100000 meters'
      );
    }

    const geofence = {
      enabled,
      latitude: nextLatitude ?? null,
      longitude: nextLongitude ?? null,
      radiusMeters: nextRadius ?? null,
      state: 'UNKNOWN',
    };

    vehicle.geofence = geofence;
    await vehicle.save();

    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, geofence, 'Geofence updated'));
  } catch (error) {
    next(error);
  }
};

const removeGeofence = async (req, res, next) => {
  try {
    const vehicle = await getOwnedVehicle(req);
    const geofence = {
      enabled: false,
      latitude: null,
      longitude: null,
      radiusMeters: null,
      state: 'UNKNOWN',
    };

    vehicle.geofence = geofence;
    await vehicle.save();

    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, geofence, 'Geofence removed'));
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const vehicle = await getOwnedVehicle(req);
    const [events, snapshots] = await Promise.all([
      Event.find({ vehicle: vehicle._id }).sort({ createdAt: -1 }).limit(100).lean(),
      Snapshot.find({ vehicle: vehicle._id })
        .select('-image')
        .sort({ createdAt: -1 })
        .limit(24)
        .lean(),
    ]);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, { events, snapshots }, 'Vehicle history retrieved')
    );
  } catch (error) {
    next(error);
  }
};

const createSnapshot = async (req, res, next) => {
  try {
    const image = req.body;

    if (!isJpeg(image)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'A JPEG snapshot up to 8 MB is required');
    }

    const vehicle = await getOwnedVehicle(req);
    const telemetry = vehicle.telemetry || {};
    const locationAvailable =
      telemetry.gpsFix === true &&
      Number.isFinite(telemetry.latitude) &&
      Number.isFinite(telemetry.longitude);
    const detection = await runYoloInference(image, { busyRetries: 8 });
    const detectionAvailable = detection && detection.status !== 'BUSY';

    const snapshot = await Snapshot.create({
      vehicle: vehicle._id,
      vehicleId: vehicle.vehicleId,
      image,
      latitude: locationAvailable ? telemetry.latitude : null,
      longitude: locationAvailable ? telemetry.longitude : null,
      detectedObjects: detectionAvailable ? detection.detections : [],
      detectionStatus: detectionAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
      imageWidth: detectionAvailable ? detection.imageWidth : null,
      imageHeight: detectionAvailable ? detection.imageHeight : null,
      source: 'ESP32-CAM live stream',
    });

    try {
      await Event.create({
        vehicle: vehicle._id,
        vehicleId: vehicle.vehicleId,
        type: 'SNAPSHOT',
        message: 'Camera snapshot saved',
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        details: {
          snapshotId: snapshot._id,
          detectionStatus: snapshot.detectionStatus,
          detectedObjects: snapshot.detectedObjects.map(({ className, confidence }) => ({
            className,
            confidence,
          })),
        },
      });
    } catch (error) {
      await snapshot.deleteOne();
      throw error;
    }

    const snapshotData = snapshot.toObject();
    delete snapshotData.image;

    return res
      .status(HTTP_STATUS.CREATED)
      .json(new ApiResponse(HTTP_STATUS.CREATED, snapshotData, 'Snapshot saved'));
  } catch (error) {
    next(error);
  }
};

const getSnapshotImage = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.snapshotId)) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Snapshot not found');
    }

    const vehicle = await getOwnedVehicle(req);
    const snapshot = await Snapshot.findOne({
      _id: req.params.snapshotId,
      vehicle: vehicle._id,
    }).select('+image');

    if (!snapshot) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Snapshot not found');
    }

    return res.type(snapshot.contentType).send(snapshot.image);
  } catch (error) {
    next(error);
  }
};

export {
  createSnapshot,
  getLiveDetection,
  getGeofence,
  getHistory,
  getSnapshotImage,
  getVehicle,
  removeGeofence,
  updateGeofence,
};
