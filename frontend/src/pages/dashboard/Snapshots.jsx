import { useEffect, useMemo, useState } from 'react';
import { Camera, MapPin, Search } from 'lucide-react';
import { useSelector } from 'react-redux';

import api from '../../services/api.service';
import './Home.css';

function Snapshots() {
  const vehicle = useSelector((state) => state.auth.vehicle);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotImages, setSnapshotImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;

    api
      .get('/vehicles/me/history')
      .then(({ data }) => {
        if (!active) {
          return;
        }

        const historySnapshots = data.data?.snapshots || [];
        setSnapshots(historySnapshots);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load snapshots.');
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
  }, []);

  useEffect(() => {
    let active = true;
    const objectUrls = [];

    Promise.all(
      snapshots.map(async (snapshot) => {
        try {
          const { data } = await api.get(`/vehicles/me/snapshots/${snapshot._id}/image`, {
            responseType: 'blob',
          });
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

  const filteredSnapshots = useMemo(() => {
    const query = search.trim().toLowerCase();

    return snapshots.filter((snapshot) => {
      if (!query) {
        return true;
      }

      const text = [
        snapshot.vehicleId,
        snapshot.detectionStatus,
        snapshot.detectedObjects?.map((object) => object.className || object.name || object.class || '').join(' '),
        snapshot.source,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(query);
    });
  }, [search, snapshots]);

  return (
    <main className="dashboard-page apex-history">
      <section className="home-header">
        <div>
          <span className="page-eyebrow">ROVER IMAGERY</span>
          <h1>Snapshot history</h1>
          <p>{vehicle?.name || vehicle?.vehicleId || 'Vehicle'} recorded imagery and detections.</p>
        </div>
      </section>

      {error && <p className="apex-history-error" role="alert">{error}</p>}

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <span className="home-section-eyebrow">CAMERA RECORDS</span>
            <h2>Saved frames</h2>
          </div>
        </div>

        <div className="apex-event-toolbar apex-event-toolbar-compact">
          <label className="apex-search-field" htmlFor="snapshot-search">
            <Search size={14} />
            <input
              id="snapshot-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search snapshots"
            />
          </label>
        </div>

        {loading ? (
          <p className="apex-history-message">Loading snapshots...</p>
        ) : filteredSnapshots.length === 0 ? (
          <div className="apex-empty-state">
            <Camera size={20} />
            <strong>No snapshots found.</strong>
            <span>Captured rover frames will appear here once the remote camera records them.</span>
          </div>
        ) : (
          <div className="apex-snapshot-grid apex-snapshot-grid-compact">
            {filteredSnapshots.map((snapshot) => (
              <article className="apex-snapshot-card" key={snapshot._id}>
                {snapshotImages[snapshot._id] ? (
                  <button
                    type="button"
                    className="apex-snapshot-image-button"
                    onClick={() => setSelected(snapshot)}
                    aria-label={`Open snapshot from ${snapshot.vehicleId}`}
                  >
                    <img src={snapshotImages[snapshot._id]} alt={`Snapshot from ${snapshot.vehicleId}`} />
                  </button>
                ) : (
                  <div className="apex-snapshot-unavailable">Snapshot image unavailable</div>
                )}

                <div className="apex-snapshot-details">
                  <strong>{snapshot.vehicleId}</strong>
                  <time dateTime={snapshot.createdAt}>
                    {new Date(snapshot.createdAt).toLocaleString()}
                  </time>
                  <span>
                    {snapshot.detectionStatus === 'AVAILABLE'
                      ? snapshot.detectedObjects?.length
                        ? `${snapshot.detectedObjects.length} object(s) detected`
                        : 'No objects detected'
                      : 'Detection unavailable'}
                  </span>
                  <span className="apex-snapshot-meta">
                    <MapPin size={12} />
                    {Number.isFinite(snapshot.latitude) && Number.isFinite(snapshot.longitude)
                      ? `${snapshot.latitude.toFixed(6)}, ${snapshot.longitude.toFixed(6)}`
                      : 'Location unavailable'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="apex-preview-backdrop" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="apex-preview-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="apex-preview-close" onClick={() => setSelected(null)}>
              Close
            </button>
            {snapshotImages[selected._id] && (
              <img src={snapshotImages[selected._id]} alt={`Preview from ${selected.vehicleId}`} />
            )}
            <div className="apex-preview-content">
              <strong>{selected.vehicleId}</strong>
              <time dateTime={selected.createdAt}>{new Date(selected.createdAt).toLocaleString()}</time>
              <span>
                {selected.detectionStatus === 'AVAILABLE' && selected.detectedObjects?.length
                  ? selected.detectedObjects.map((object) => object.className || object.name || object.class || 'Object').join(', ')
                  : 'No detection metadata available'}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Snapshots;
