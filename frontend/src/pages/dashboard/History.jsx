import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import api from '../../services/api.service';
import { eventsLoaded } from '../../redux/slices/vehicleSlice';
import './Home.css';

function History() {
  const dispatch = useDispatch();
  const vehicle = useSelector((state) => state.auth.vehicle);
  const events = useSelector((state) => state.vehicle.events);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotImages, setSnapshotImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api
      .get('/vehicles/me/history')
      .then(({ data }) => {
        if (!active) {
          return;
        }
        dispatch(eventsLoaded(data.data.events || []));
        setSnapshots(data.data.snapshots || []);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load vehicle history');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dispatch]);

  useEffect(() => {
    let active = true;
    const objectUrls = [];

    Promise.all(
      snapshots.map(async (snapshot) => {
        try {
          const { data } = await api.get(
            `/vehicles/me/snapshots/${snapshot._id}/image`,
            { responseType: 'blob' }
          );
          const url = URL.createObjectURL(data);
          if (!active) {
            URL.revokeObjectURL(url);
            return [snapshot._id, null];
          }
          objectUrls.push(url);
          return [snapshot._id, url];
        } catch {
          return [snapshot._id, null];
        }
      })
    ).then((entries) => {
      if (active) {
        setSnapshotImages(Object.fromEntries(entries));
      }
    });

    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [snapshots]);

  const eventHistory = events.filter((event) => event.type !== 'SNAPSHOT');

  return (
    <main className="dashboard-page apex-history">
      <section className="home-header">
        <div>
          <span className="page-eyebrow">VEHICLE RECORDS</span>
          <h1>History</h1>
          <p>{vehicle?.name || vehicle?.vehicleId || 'Vehicle'} snapshots and events.</p>
        </div>
      </section>

      {error && <p className="apex-history-error" role="alert">{error}</p>}

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <span className="home-section-eyebrow">CAMERA RECORDS</span>
            <h2>Snapshots</h2>
          </div>
        </div>

        {loading ? (
          <p className="apex-history-message">Loading snapshots...</p>
        ) : snapshots.length === 0 ? (
          <p className="apex-history-message">No snapshots have been saved.</p>
        ) : (
          <div className="apex-snapshot-grid">
            {snapshots.map((snapshot) => (
              <article className="apex-snapshot-card" key={snapshot._id}>
                {snapshotImages[snapshot._id] ? (
                  <img src={snapshotImages[snapshot._id]} alt={`Snapshot from ${snapshot.vehicleId}`} />
                ) : (
                  <div className="apex-snapshot-unavailable">Snapshot image unavailable</div>
                )}
                <div className="apex-snapshot-details">
                  <strong>{snapshot.vehicleId}</strong>
                  <time dateTime={snapshot.createdAt}>
                    {new Date(snapshot.createdAt).toLocaleString()}
                  </time>
                  <span>
                    {Number.isFinite(snapshot.latitude) && Number.isFinite(snapshot.longitude)
                      ? `${snapshot.latitude.toFixed(6)}, ${snapshot.longitude.toFixed(6)}`
                      : 'Location unavailable'}
                  </span>
                  {snapshot.detectionStatus === 'AVAILABLE' ? (
                    snapshot.detectedObjects?.length ? (
                      <ul className="apex-snapshot-detections">
                        {snapshot.detectedObjects.map((object, index) => (
                          <li key={`${object.className || object.name || object.class || 'object'}-${index}`}>
                            {(object.className || object.name || object.class || 'Object')
                              .replaceAll('_', ' ')
                              .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                            {Number.isFinite(object.confidence)
                              ? ` — ${Math.round(object.confidence * 100)}%`
                              : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span>No objects detected</span>
                    )
                  ) : (
                    <span>Detection unavailable</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <span className="home-section-eyebrow">VEHICLE EVENTS</span>
            <h2>Events</h2>
          </div>
        </div>

        {loading ? (
          <p className="apex-history-message">Loading events...</p>
        ) : eventHistory.length === 0 ? (
          <p className="apex-history-message">No vehicle events have been recorded.</p>
        ) : (
          <ol className="apex-event-list">
            {eventHistory.map((event) => (
              <li key={event._id}>
                <div>
                  <strong>{event.message}</strong>
                  <span>{event.vehicleId} · {event.type}</span>
                  <time dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleString()}
                  </time>
                </div>
                <span>
                  {Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
                    ? `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`
                    : 'Location unavailable'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

export default History;
