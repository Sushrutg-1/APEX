import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import env from '../../config/env.config';
import { distanceBetweenMeters, isValidCoordinates } from '../../utils/geography';
import './Map.css';

const createRoverIcon = () =>
  L.divIcon({
    className: 'apex-rover-marker-wrapper',
    html: `
      <div class="apex-rover-marker">
        <div class="apex-rover-marker-pulse"></div>
        <div class="apex-rover-marker-icon">
          <span></span>
        </div>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });

function Map({ onGeofenceSelect, geofencePreview = null }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const roverMarkerRef = useRef(null);
  const geofenceCircleRef = useRef(null);
  const geofenceViewKeyRef = useRef(null);
  const geofencePreviewRef = useRef(null);
  const geofencePreviewCenterRef = useRef(null);
  const initializedRef = useRef(false);

  const { telemetry, status, geofence } = useSelector((state) => state.vehicle);
  const { vehicle } = useSelector((state) => state.auth);

  const latitude = telemetry?.latitude;
  const longitude = telemetry?.longitude;

  const hasValidLocation =
    telemetry?.gpsFix === true &&
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    isValidCoordinates(latitude, longitude);

  const geofenceStatus =
    !geofence?.enabled ||
    !isValidCoordinates(geofence.latitude, geofence.longitude) ||
    !Number.isFinite(geofence.radiusMeters) ||
    geofence.radiusMeters <= 0
      ? null
      : !hasValidLocation
        ? 'GPS Unavailable'
        : distanceBetweenMeters(
              latitude,
              longitude,
              geofence.latitude,
              geofence.longitude
            ) <= geofence.radiusMeters
          ? 'Inside Geofence'
          : 'Outside Geofence';

  useEffect(() => {
    if (!mapContainerRef.current || initializedRef.current) {
      return;
    }

    if (!env.LOCATIONIQ_TOKEN) {
      return;
    }

    initializedRef.current = true;

    const defaultCenter = [20.5937, 78.9629];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 5,
      maxZoom: 20,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer(
      `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${env.LOCATIONIQ_TOKEN}`,
      {
        maxNativeZoom: 18,
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://locationiq.com/" target="_blank" rel="noreferrer">LocationIQ</a> | &copy; OpenStreetMap contributors',
      }
    ).addTo(map);

    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      roverMarkerRef.current = null;
      geofenceCircleRef.current = null;
      geofenceViewKeyRef.current = null;
      geofencePreviewRef.current = null;
      geofencePreviewCenterRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onGeofenceSelect) {
      return;
    }

    const selectPoint = (event) => {
      onGeofenceSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    };

    map.on('click', selectPoint);
    map.getContainer().classList.add('apex-map-selectable');

    return () => {
      map.off('click', selectPoint);
      map.getContainer().classList.remove('apex-map-selectable');
    };
  }, [onGeofenceSelect]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !hasValidLocation) {
      return;
    }

    const position = [latitude, longitude];

    if (!roverMarkerRef.current) {
      roverMarkerRef.current = L.marker(position, {
        icon: createRoverIcon(),
        zIndexOffset: 1000,
      }).addTo(map);

      roverMarkerRef.current.bindTooltip(
        `
          <div class="apex-rover-tooltip">
            <div class="apex-rover-tooltip-header">
              <span class="apex-rover-tooltip-dot"></span>
              <strong>${vehicle?.name || 'APEX Rover'}</strong>
            </div>

            <div class="apex-rover-tooltip-status">
              ${status === 'online' ? 'Online' : 'Offline'}
            </div>

            <div class="apex-rover-tooltip-location">
              <span>${latitude.toFixed(6)}</span>
              <span>${longitude.toFixed(6)}</span>
            </div>
          </div>
        `,
        {
          direction: 'top',
          offset: [0, -20],
          className: 'apex-rover-tooltip-container',
          opacity: 1,
        }
      );

      map.setView(position, geofence?.enabled ? map.getZoom() : 16, {
        animate: true,
      });

      return;
    }

    roverMarkerRef.current.setLatLng(position);

    roverMarkerRef.current.setTooltipContent(
      `
        <div class="apex-rover-tooltip">
          <div class="apex-rover-tooltip-header">
            <span class="apex-rover-tooltip-dot"></span>
            <strong>${vehicle?.name || 'APEX Rover'}</strong>
          </div>

          <div class="apex-rover-tooltip-status">
            ${status === 'online' ? 'Online' : 'Offline'}
          </div>

          <div class="apex-rover-tooltip-location">
            <span>${latitude.toFixed(6)}</span>
            <span>${longitude.toFixed(6)}</span>
          </div>
        </div>
      `
    );

    map.panTo(position, {
      animate: true,
      duration: 0.5,
    });
  }, [latitude, longitude, hasValidLocation, status, vehicle?.name, geofence?.enabled]);

  useEffect(() => {
    const map = mapRef.current;
    const geofenceLatitude = Number(geofence?.latitude);
    const geofenceLongitude = Number(geofence?.longitude);
    const radiusMeters = Number(geofence?.radiusMeters);
    const hasNumericGeofenceValues = [geofence?.latitude, geofence?.longitude, geofence?.radiusMeters]
      .every((value) => value !== null && value !== undefined && value !== '');
    const hasValidGeofence =
      geofence?.enabled === true &&
      hasNumericGeofenceValues &&
      Number.isFinite(geofenceLatitude) &&
      geofenceLatitude >= -90 &&
      geofenceLatitude <= 90 &&
      Number.isFinite(geofenceLongitude) &&
      geofenceLongitude >= -180 &&
      geofenceLongitude <= 180 &&
      Number.isFinite(radiusMeters) &&
      radiusMeters > 0;

    if (!map) {
      return;
    }

    if (!hasValidGeofence) {
      if (geofenceCircleRef.current) {
        geofenceCircleRef.current.remove();
        geofenceCircleRef.current = null;
      }
      geofenceViewKeyRef.current = null;
      return;
    }

    const center = [geofenceLatitude, geofenceLongitude];
    if (!geofenceCircleRef.current) {
      geofenceCircleRef.current = L.circle(center, {
        radius: radiusMeters,
        color: '#dc2626',
        weight: 2,
        opacity: 0.9,
        fillColor: '#dc2626',
        fillOpacity: 0.18,
      }).addTo(map);
    } else {
      geofenceCircleRef.current.setLatLng(center);
      geofenceCircleRef.current.setRadius(radiusMeters);
      geofenceCircleRef.current.setStyle({
        color: '#dc2626',
        weight: 2,
        opacity: 0.9,
        fillColor: '#dc2626',
        fillOpacity: 0.18,
      });
    }
    geofenceCircleRef.current.bringToFront();

    const viewKey = [
      geofenceLatitude,
      geofenceLongitude,
      radiusMeters,
      hasValidLocation,
    ].join(':');

    if (geofenceViewKeyRef.current !== viewKey) {
      const visibleBounds = geofenceCircleRef.current.getBounds();
      if (hasValidLocation) {
        visibleBounds.extend([latitude, longitude]);
      }
      map.fitBounds(visibleBounds, {
        padding: [24, 24],
        maxZoom: 20,
        animate: false,
      });
      geofenceViewKeyRef.current = viewKey;
    }
  }, [geofence, hasValidLocation, latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    const hasValidPreview =
      Number.isFinite(geofencePreview?.latitude) &&
      geofencePreview.latitude >= -90 &&
      geofencePreview.latitude <= 90 &&
      Number.isFinite(geofencePreview?.longitude) &&
      geofencePreview.longitude >= -180 &&
      geofencePreview.longitude <= 180 &&
      Number.isFinite(geofencePreview?.radiusMeters) &&
      geofencePreview.radiusMeters > 0;

    if (!map || !hasValidPreview) {
      if (geofencePreviewRef.current) {
        geofencePreviewRef.current.remove();
        geofencePreviewRef.current = null;
      }
      if (geofencePreviewCenterRef.current) {
        geofencePreviewCenterRef.current.remove();
        geofencePreviewCenterRef.current = null;
      }
      return;
    }

    const center = [geofencePreview.latitude, geofencePreview.longitude];
    if (!geofencePreviewRef.current) {
      geofencePreviewRef.current = L.circle(center, {
        radius: geofencePreview.radiusMeters,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        dashArray: '6 6',
      }).addTo(map);
    } else {
      geofencePreviewRef.current.setLatLng(center);
      geofencePreviewRef.current.setRadius(geofencePreview.radiusMeters);
    }

    if (!geofencePreviewCenterRef.current) {
      geofencePreviewCenterRef.current = L.circleMarker(center, {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 1,
      }).addTo(map);
    } else {
      geofencePreviewCenterRef.current.setLatLng(center);
    }
  }, [geofencePreview]);

  if (!env.LOCATIONIQ_TOKEN) {
    return (
      <div className="apex-map apex-map-unavailable">
        <div className="apex-map-message">
          <strong>Map unavailable</strong>
          <span>LocationIQ token is not configured.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="apex-map">
      <div ref={mapContainerRef} className="apex-map-container" />

      {!hasValidLocation && (
        <div className="apex-map-overlay">
          <div className="apex-map-message">
            <strong>Waiting for GPS</strong>
            <span>Rover location is currently unavailable.</span>
          </div>
        </div>
      )}

      <div className="apex-map-live-indicator">
        <span className={status === 'online' ? 'online' : 'offline'} />
        <span>{status === 'online' ? 'LIVE GPS' : 'GPS OFFLINE'}</span>
      </div>
      {geofenceStatus && (
        <div
          className={`apex-map-geofence-status ${
            geofenceStatus === 'Outside Geofence'
              ? 'outside'
              : geofenceStatus === 'Inside Geofence'
                ? 'inside'
                : ''
          }`}
          role="status"
        >
          {geofenceStatus}
        </div>
      )}
    </div>
  );
}

export default Map;
