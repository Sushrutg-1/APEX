import express, { Router } from 'express';

import authMiddleware from '../middlewares/auth.middleware.js';
import {
  createSnapshot,
  getDeviceProvisioning,
  getLiveDetection,
  getGeofence,
  getHistory,
  getSnapshotImage,
  getVehicle,
  removeGeofence,
  rotateDeviceToken,
  updateGeofence,
} from '../controllers/vehicle.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', getVehicle);
router.get('/me/provisioning', getDeviceProvisioning);
router.post('/me/provisioning/token', rotateDeviceToken);
router.get('/me/geofence', getGeofence);
router.put('/me/geofence', updateGeofence);
router.delete('/me/geofence', removeGeofence);
router.get('/me/history', getHistory);
router.post('/me/detections', express.raw({ type: 'image/jpeg', limit: '8mb' }), getLiveDetection);
router.post('/me/snapshots', express.raw({ type: 'image/jpeg', limit: '8mb' }), createSnapshot);
router.get('/me/snapshots/:snapshotId/image', getSnapshotImage);

export default router;
