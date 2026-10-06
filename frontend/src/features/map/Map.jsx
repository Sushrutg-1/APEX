import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import env from '../../config/env.config';
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

function Map() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const roverMarkerRef = useRef(null);
  const initializedRef = useRef(false);

  const { telemetry, status } = useSelector((state) => state.vehicle);
  const { vehicle } = useSelector((state) => state.auth);

  const latitude = Number(telemetry?.latitude);
  const longitude = Number(telemetry?.longitude);

  const hasValidLocation =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

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
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer(
      `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${env.LOCATIONIQ_TOKEN}`,
      {
        maxZoom: 18,
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
      initializedRef.current = false;
    };
  }, []);

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

      map.setView(position, 16, {
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
  }, [latitude, longitude, hasValidLocation, status, vehicle?.name]);

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
    </div>
  );
}

export default Map;
