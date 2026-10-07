import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, ShieldAlert } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';

import api from '../../services/api.service';
import { eventsLoaded } from '../../redux/slices/vehicleSlice';
import './Home.css';

const FILTERS = ['ALL', 'CRITICAL', 'WARNING', 'INFO'];

const getSeverity = (event) => {
  if (!event) {
    return 'INFO';
  }

  const type = String(event.type || '').toUpperCase();
  const message = String(event.message || '').toUpperCase();

  if (type.includes('FIRE') || type.includes('OBSTACLE') || message.includes('FIRE')) {
    return 'CRITICAL';
  }

  if (type.includes('GEOFENCE') || message.includes('GEOFENCE') || message.includes('LOW BATTERY')) {
    return 'WARNING';
  }

  return 'INFO';
};

function Events() {
  const dispatch = useDispatch();
  const vehicle = useSelector((state) => state.auth.vehicle);
  const events = useSelector((state) => state.vehicle.events);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    api
      .get('/vehicles/me/history')
      .then(({ data }) => {
        if (active) {
          dispatch(eventsLoaded(data.data?.events || []));
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load event history.');
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

  const eventHistory = useMemo(() => {
    return events
      .filter((event) => event.type !== 'SNAPSHOT')
      .filter((event) => {
        const severity = getSeverity(event);
        return filter === 'ALL' ? true : severity === filter;
      })
      .filter((event) => {
        const query = search.trim().toLowerCase();
        if (!query) {
          return true;
        }

        const text = [event.message, event.type, event.vehicleId, event.details?.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return text.includes(query);
      });
  }, [events, filter, search]);

  return (
    <main className="dashboard-page apex-history">
      <section className="home-header">
        <div>
          <span className="page-eyebrow">VEHICLE ALERTS</span>
          <h1>Event history</h1>
          <p>{vehicle?.name || vehicle?.vehicleId || 'Vehicle'} event log and monitoring timeline.</p>
        </div>
      </section>

      {error && <p className="apex-history-error" role="alert">{error}</p>}

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <span className="home-section-eyebrow">EVENT RECORDS</span>
            <h2>Recent activity</h2>
          </div>
        </div>

        <div className="apex-event-toolbar">
          <div className="apex-event-filters" aria-label="Event filters">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                className={filter === value ? 'is-active' : ''}
                onClick={() => setFilter(value)}
              >
                {value}
              </button>
            ))}
          </div>

          <label className="apex-search-field" htmlFor="event-search">
            <Search size={14} />
            <input
              id="event-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events"
            />
          </label>
        </div>

        {loading ? (
          <p className="apex-history-message">Loading events...</p>
        ) : eventHistory.length === 0 ? (
          <div className="apex-empty-state">
            <ShieldAlert size={20} />
            <strong>No events matched the current filter.</strong>
            <span>New rover activity will appear here as events are detected.</span>
          </div>
        ) : (
          <ol className="apex-event-list apex-event-list-detailed">
            {eventHistory.map((event) => {
              const severity = getSeverity(event);
              const createdAt = event.createdAt ? new Date(event.createdAt) : null;
              return (
                <li key={event._id || `${event.type}-${event.createdAt}`}>
                  <div className="apex-event-main">
                    <div className="apex-event-meta">
                      <span className={`apex-event-badge ${severity.toLowerCase()}`}>{severity}</span>
                      <span>{event.type}</span>
                    </div>
                    <strong>{event.message}</strong>
                    <span className="apex-event-subtext">
                      {event.vehicleId} · {createdAt ? createdAt.toLocaleString() : 'Timestamp unavailable'}
                    </span>
                  </div>

                  <div className="apex-event-side">
                    <span className="apex-event-location">
                      {Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
                        ? `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`
                        : 'Location unavailable'}
                    </span>
                    <span className="apex-event-status">
                      <AlertTriangle size={12} />
                      {severity}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}

export default Events;
