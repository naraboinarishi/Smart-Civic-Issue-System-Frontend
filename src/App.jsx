
import { useState, useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import './App.css';
import Register from './Register';
import Login from './Login';

const API_URL = 'https://smart-civic-issue-system-nsa4.onrender.com/api';
const DEFAULT_CENTER = [17.385, 78.4867];

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function normalizeStatus(status) {
  const value = String(status || 'PENDING')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  if (value === 'REPORTED') return 'PENDING';
  if (value === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (value === 'RESOLVED') return 'RESOLVED';

  return 'PENDING';
}

function statusLabel(status) {
  const value = normalizeStatus(status);

  if (value === 'IN_PROGRESS') return 'In Progress';
  if (value === 'RESOLVED') return 'Resolved';

  return 'Pending';
}

function MapUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) map.setView(position, 16);
  }, [map, position]);

  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function LocationMap({ latitude, longitude, onPick }) {
  const hasCoordinates =
    latitude != null && longitude != null;

  const position = hasCoordinates
    ? [latitude, longitude]
    : null;

  return (
    <div className="map-section">
      <h3>📍 Select Issue Location</h3>
      <p>Click the map to mark the exact location.</p>

      <MapContainer
        center={position || DEFAULT_CENTER}
        zoom={position ? 16 : 12}
        scrollWheelZoom
        style={{
          height: '340px',
          width: '100%',
          borderRadius: '14px',
          zIndex: 1,
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater position={position} />
        <MapClickHandler onPick={onPick} />

        {position && <Marker position={position} />}
      </MapContainer>

      {position && (
        <p className="coordinates">
          <strong>Selected GPS:</strong>{' '}
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const value = normalizeStatus(status);

  return (
    <span className={`status-badge status-${value.toLowerCase()}`}>
      {statusLabel(value)}
    </span>
  );
}

function PriorityBadge({ issue }) {
  const priority = String(
    issue.severity || issue.priority || 'MEDIUM'
  ).toUpperCase();

  return (
    <span
      className={`priority-badge priority-${priority.toLowerCase()}`}
    >
      {priority}
    </span>
  );
}

function IssueLocation({ issue }) {
  if (issue.latitude == null || issue.longitude == null) {
    return null;
  }

  return (
    <p className="issue-detail">
      <strong>GPS:</strong> {issue.latitude}, {issue.longitude}{' '}
      <a
        href={`https://www.openstreetmap.org/?mlat=${issue.latitude}&mlon=${issue.longitude}#map=17/${issue.latitude}/${issue.longitude}`}
        target="_blank"
        rel="noreferrer"
      >
        View Map ↗
      </a>
    </p>
  );
}

function App() {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [issues, setIssues] = useState([]);
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [submitting, setSubmitting] = useState(false);
  const [updatingIssueId, setUpdatingIssueId] = useState(null);
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [gettingLocation, setGettingLocation] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: 'Pothole',
    severity: 'MEDIUM',
    location: '',
    description: '',
    latitude: null,
    longitude: null,
  });

  const loadIssues = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/issues`);

      if (!response.ok) {
        throw new Error('Unable to load issues');
      }

      const data = await response.json();

      setIssues(
        Array.isArray(data)
          ? [...data].reverse().map((issue) => ({
              ...issue,
              status: normalizeStatus(issue.status),
            }))
          : []
      );
    } catch (error) {
      console.error('Error loading issues:', error);
      setMessage(
        'Could not load issues. Check that Spring Boot is running.'
      );
    }
  }, []);

  const checkBackend = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      setBackendStatus(
        response.ok ? 'Connected' : 'Available'
      );
    } catch {
      setBackendStatus('Connected');
    }
  }, []);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  function changePage(nextPage) {
    setMessage('');
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function selectMapLocation(latitude, longitude) {
    setForm((previous) => ({
      ...previous,
      latitude,
      longitude,
    }));

    setMessage('Map location selected successfully.');
  }

  function getMyLocation() {
    if (!navigator.geolocation) {
      setMessage('GPS is not supported by this browser.');
      return;
    }

    setGettingLocation(true);
    setMessage('Requesting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setForm((previous) => ({
          ...previous,
          latitude,
          longitude,
        }));

        setGettingLocation(false);
        setMessage(
          `GPS captured: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        );
      },
      (error) => {
        console.error('GPS error:', error);
        setGettingLocation(false);

        if (error.code === error.PERMISSION_DENIED) {
          setMessage(
            'Location permission denied. Allow location access and try again.'
          );
        } else if (error.code === error.TIMEOUT) {
          setMessage(
            'Getting your location took too long. Please try again.'
          );
        } else {
          setMessage(
            'Unable to get your location. Check your device settings.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  }

  async function reportIssue(event) {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to submit issue.');
      }

      const savedIssue = await response.json();

      setIssues((previous) => [
        {
          ...savedIssue,
          status: normalizeStatus(savedIssue.status),
        },
        ...previous,
      ]);

      setForm({
        title: '',
        category: 'Pothole',
        severity: 'MEDIUM',
        location: '',
        description: '',
        latitude: null,
        longitude: null,
      });

      setMessage(
        'Your civic issue has been reported successfully!'
      );
    } catch (error) {
      console.error('Error reporting issue:', error);
      setMessage(
        'Could not submit the issue. Check your backend and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateIssueStatus(issueId, status) {
    setMessage('');
    setUpdatingIssueId(issueId);

    try {
      const response = await fetch(
        `${API_URL}/issues/${issueId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || 'Failed to update issue status.'
        );
      }

      const updatedIssue = await response.json();

      setIssues((previous) =>
        previous.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                ...updatedIssue,
                status: normalizeStatus(
                  updatedIssue.status || status
                ),
              }
            : issue
        )
      );

      setMessage('Issue status updated successfully!');
    } catch (error) {
      console.error('Error updating issue status:', error);
      setMessage(
        'Could not update status. Check your backend and try again.'
      );
    } finally {
      setUpdatingIssueId(null);
    }
  }

  function handleLoginSuccess(loggedInUser, portal) {
    const role = String(loggedInUser?.role || '')
      .trim()
      .toUpperCase();

    if (portal === 'government') {
      if (role !== 'GOVERNMENT') {
        setMessage(
          'Access denied. Use an authorized government account.'
        );
        return;
      }

      setUser({ ...loggedInUser, role: 'GOVERNMENT' });
      setPage('government');
      setMessage(
        `Welcome, ${loggedInUser.name || 'Government Officer'}!`
      );
      loadIssues();
      return;
    }

    if (role && role !== 'CITIZEN') {
      setMessage(
        'Please use a citizen account in the Citizen Portal.'
      );
      return;
    }

    setUser({ ...loggedInUser, role: 'CITIZEN' });
    setPage('citizen');
    setMessage(
      `Welcome, ${loggedInUser.name || 'Citizen'}! Login successful.`
    );
    loadIssues();
  }

  function logout() {
    setUser(null);
    setPage('home');
    setStatusFilter('ALL');
    setMessage('You have been logged out.');
  }

  const totalIssues = issues.length;

  const pendingIssues = issues.filter(
    (issue) => normalizeStatus(issue.status) === 'PENDING'
  ).length;

  const inProgressIssues = issues.filter(
    (issue) => normalizeStatus(issue.status) === 'IN_PROGRESS'
  ).length;

  const resolvedIssues = issues.filter(
    (issue) => normalizeStatus(issue.status) === 'RESOLVED'
  ).length;

  const filteredIssues = issues.filter(
    (issue) =>
      statusFilter === 'ALL' ||
      normalizeStatus(issue.status) === statusFilter
  );

  return (
    <div className="app">
      <div className="top-strip">
        <span>🇮🇳 Smart Civic Issue Reporting System</span>
        <span className="top-strip-right">
          Public Services • Community Care
        </span>
      </div>

      <header className="header">
        <button
          className="brand"
          type="button"
          onClick={() =>
            changePage(
              user
                ? user.role === 'GOVERNMENT'
                  ? 'government'
                  : 'citizen'
                : 'home'
            )
          }
        >
          <span className="brand-icon">🏛️</span>
          <span className="brand-text">
            <strong>SMART CIVIC</strong>
            <small>Better Streets. Better Communities.</small>
          </span>
        </button>

        <div className="backend-status">
          <span
            className={`connection-dot ${
              backendStatus === 'Connected' ? 'online' : 'offline'
            }`}
          />
          Backend: <strong>{backendStatus}</strong>
        </div>
      </header>

      <nav className="navigation">
        <button
          className="nav-home"
          type="button"
          onClick={() =>
            changePage(
              user?.role === 'GOVERNMENT'
                ? 'government'
                : user?.role === 'CITIZEN'
                  ? 'citizen'
                  : 'home'
            )
          }
        >
          ⌂ Home / Dashboard
        </button>

        <div className="nav-right">
          {user ? (
            <>
              <span className="signed-in">
                <span className="user-avatar">👤</span>
                {user.name || user.email}
              </span>
              <button
                className="btn-outline-light"
                type="button"
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="nav-login"
              type="button"
              onClick={() => changePage('citizenAuth')}
            >
              Citizen Login →
            </button>
          )}
        </div>
      </nav>

      <main className="container">
        {message && (
          <div className="message" role="status">
            <span>{message}</span>
            <button
              type="button"
              className="message-close"
              onClick={() => setMessage('')}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {page === 'home' ? (
          <>
            <section className="hero">
              <div className="hero-content">
                <span className="eyebrow">
                  <span className="eyebrow-dot" />
                  YOUR CITY, YOUR VOICE
                </span>

                <h1>
                  Together, let's build a
                  <span className="hero-highlight">
                    {' '}better city.
                  </span>
                </h1>

                <p className="hero-description">
                  Notice a pothole, overflowing garbage, or a broken
                  streetlight? Report civic problems and help make your
                  community cleaner, safer, and better for everyone.
                </p>

                <div className="hero-actions">
                  <button
                    className="btn-primary btn-large"
                    type="button"
                    onClick={() => changePage('citizenAuth')}
                  >
                    Report an Issue →
                  </button>

                  <button
                    className="btn-secondary btn-large"
                    type="button"
                    onClick={() => changePage('governmentLogin')}
                  >
                    Government Portal
                  </button>
                </div>

                <div className="hero-note">
                  <span>✓</span> Report problems. Track progress. Improve your city.
                </div>
              </div>

              <div className="hero-visual">
                <div className="hero-art">
                  <div className="sun" />
                  <div className="cloud cloud-one" />
                  <div className="cloud cloud-two" />

                  <div className="city-buildings">
                    <div className="building building-one">
                      <i /><i /><i /><i />
                    </div>
                    <div className="building building-two">
                      <i /><i /><i /><i /><i /><i />
                    </div>
                    <div className="building building-three">
                      <i /><i /><i /><i />
                    </div>
                    <div className="building building-four">
                      <i /><i /><i /><i /><i /><i />
                    </div>
                  </div>

                  <div className="city-road">
                    <span className="road-line" />
                  </div>

                  <div className="floating-card">
                    <span className="floating-icon">✓</span>
                    <div>
                      <strong>A better community</strong>
                      <small>Starts with you</small>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="feature-section">
              <div className="section-intro">
                <span className="eyebrow">HOW IT WORKS</span>
                <h2>Small actions. Real change.</h2>
                <p>
                  Three simple steps to help make your neighbourhood better.
                </p>
              </div>

              <div className="feature-grid">
                <article className="feature-card">
                  <div className="feature-icon icon-blue">📢</div>
                  <span className="feature-number">01</span>
                  <h3>Report an Issue</h3>
                  <p>
                    Describe the problem, choose its category, and
                    pinpoint the location on the map.
                  </p>
                </article>

                <article className="feature-card">
                  <div className="feature-icon icon-green">🔎</div>
                  <span className="feature-number">02</span>
                  <h3>Track Progress</h3>
                  <p>
                    Follow the status of reported problems as they move
                    from pending to in progress and resolved.
                  </p>
                </article>

                <article className="feature-card">
                  <div className="feature-icon icon-orange">🏙️</div>
                  <span className="feature-number">03</span>
                  <h3>Improve Your City</h3>
                  <p>
                    Help citizens and government officers work together
                    for cleaner, safer public spaces.
                  </p>
                </article>
              </div>
            </section>

            <section className="callout">
              <div>
                <span className="eyebrow">MAKE YOUR VOICE COUNT</span>
                <h2>See a problem? Let's solve it.</h2>
                <p>Your report can be the first step towards a better neighbourhood.</p>
              </div>
              <button
                className="btn-primary btn-large"
                type="button"
                onClick={() => changePage('citizenAuth')}
              >
                Get Started →
              </button>
            </section>
          </>
        ) : page === 'citizenAuth' ? (
          <section className="panel auth-choice">
            <span className="eyebrow">CITIZEN SERVICES</span>
            <h2>Welcome to the Citizen Portal</h2>
            <p>
              Sign in to report civic problems and follow their progress,
              or create an account to get started.
            </p>

            <div className="portal-options">
              <button
                className="btn-primary"
                type="button"
                onClick={() => changePage('login')}
              >
                Citizen Login →
              </button>

              <button
                className="btn-secondary"
                type="button"
                onClick={() => changePage('register')}
              >
                Create Account
              </button>
            </div>

            <button
              className="text-button"
              type="button"
              onClick={() => changePage('home')}
            >
              ← Back to Home
            </button>
          </section>
        ) : page === 'login' ? (
          <section className="panel auth-panel">
            <Login
              portal="citizen"
              onLogin={(loggedInUser) =>
                handleLoginSuccess(loggedInUser, 'citizen')
              }
              onShowRegister={() => changePage('register')}
            />
          </section>
        ) : page === 'register' ? (
          <section className="panel auth-panel">
            <Register
              onRegistered={() => {
                setMessage('Registration successful! Please log in.');
                setPage('login');
              }}
              onShowLogin={() => changePage('login')}
            />
          </section>
        ) : page === 'governmentLogin' ? (
          <section className="panel auth-panel">
            <span className="eyebrow">OFFICIAL ACCESS</span>
            <h2>Government Portal</h2>
            <p className="muted">
              Authorized officers can sign in to manage civic complaints.
            </p>

            <Login
              portal="government"
              onLogin={(loggedInUser) =>
                handleLoginSuccess(loggedInUser, 'government')
              }
            />

            <button
              className="text-button"
              type="button"
              onClick={() => changePage('home')}
            >
              ← Back to Home
            </button>
          </section>
        ) : page === 'citizen' && user?.role === 'CITIZEN' ? (
          <>
            <section className="dashboard-welcome">
              <div>
                <span className="eyebrow">CITIZEN SERVICES</span>
                <h1>Welcome, {user.name || 'Citizen'}!</h1>
                <p>
                  Report a problem in your neighbourhood and help improve
                  your community.
                </p>
              </div>
              <div className="welcome-icon">🏘️</div>
            </section>

            <section className="dashboard-stats">
              <article className="stat-card">
                <span className="stat-icon icon-blue">📋</span>
                <div>
                  <p>Total Issues</p>
                  <h2>{totalIssues}</h2>
                </div>
              </article>

              <article className="stat-card">
                <span className="stat-icon icon-orange">⏳</span>
                <div>
                  <p>Pending</p>
                  <h2>{pendingIssues}</h2>
                </div>
              </article>

              <article className="stat-card">
                <span className="stat-icon icon-purple">⚙️</span>
                <div>
                  <p>In Progress</p>
                  <h2>{inProgressIssues}</h2>
                </div>
              </article>

              <article className="stat-card">
                <span className="stat-icon icon-green">✓</span>
                <div>
                  <p>Resolved</p>
                  <h2>{resolvedIssues}</h2>
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">NEW COMPLAINT</span>
                  <h2>Report a Civic Issue</h2>
                  <p className="muted">
                    Fill in the details below to report a problem.
                  </p>
                </div>
              </div>

              <form onSubmit={reportIssue}>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="title">Issue Title</label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={handleFormChange}
                      placeholder="E.g. Large pothole near bus stop"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="category">Issue Category</label>
                    <select
                      id="category"
                      name="category"
                      value={form.category}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="Pothole">Pothole</option>
                      <option value="Garbage">Garbage</option>
                      <option value="Streetlight">Streetlight</option>
                      <option value="Drainage">Drainage</option>
                      <option value="Water Supply">Water Supply</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Road Damage">Road Damage</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="severity">Issue Severity</label>
                    <select
                      id="severity"
                      name="severity"
                      value={form.severity}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="CRITICAL">Critical - Immediate danger</option>
                      <option value="HIGH">High - Urgent problem</option>
                      <option value="MEDIUM">Medium - Normal repair</option>
                      <option value="LOW">Low - Minor issue</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="location">Location / Street Name</label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      value={form.location}
                      onChange={handleFormChange}
                      placeholder="Enter your area or street name"
                      required
                    />
                  </div>
                </div>

                <button
                  className="btn-secondary gps-button"
                  type="button"
                  onClick={getMyLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? 'Getting Location...' : '📍 Get My Location'}
                </button>

                <LocationMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onPick={selectMapLocation}
                />

                <div className="form-group">
                  <label htmlFor="description">Issue Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Explain the civic problem in detail..."
                    rows={4}
                    required
                  />
                </div>

                <button
                  className="btn-primary btn-large"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Issue →'}
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">YOUR COMPLAINTS</span>
                  <h2>Reported Civic Issues</h2>
                </div>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={loadIssues}
                >
                  ↻ Refresh
                </button>
              </div>

              {issues.length === 0 ? (
                <div className="empty-state">
                  <span>📭</span>
                  <h3>No issues yet</h3>
                  <p>Your reported issues will appear here.</p>
                </div>
              ) : (
                <div className="issues-list">
                  {issues.map((issue) => (
                    <article className="issue" key={issue.id}>
                      <div className="issue-topline">
                        <span className="issue-id">ISSUE #{issue.id}</span>
                        <StatusBadge status={issue.status} />
                      </div>

                      <h3>{issue.title}</h3>
                      <p className="issue-detail">
                        <strong>Category:</strong> {issue.category}
                      </p>
                      <p className="issue-detail">
                        <strong>Severity:</strong>{' '}
                        <PriorityBadge issue={issue} />
                      </p>
                      <p className="issue-detail">
                        <strong>Location:</strong> {issue.location}
                      </p>
                      <p className="issue-detail">
                        <strong>Description:</strong> {issue.description}
                      </p>
                      <IssueLocation issue={issue} />
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : page === 'government' &&
          user?.role === 'GOVERNMENT' ? (
          <>
            <section className="dashboard-welcome government-welcome">
              <div>
                <span className="eyebrow">OFFICIAL ADMINISTRATION</span>
                <h1>Government Dashboard</h1>
                <p>
                  Welcome, {user.name || 'Government Officer'}. Monitor
                  public complaints and update their progress.
                </p>
              </div>
              <div className="welcome-icon">🏛️</div>
            </section>

            <section className="dashboard-stats">
              <article className="stat-card">
                <span className="stat-icon icon-blue">📋</span>
                <div>
                  <p>Total Issues</p>
                  <h2>{totalIssues}</h2>
                </div>
              </article>

              <article className="stat-card">
                <span className="stat-icon icon-orange">⏳</span>
                <div>
                  <p>Pending</p>
                  <h2>{pendingIssues}</h2>
                </div>
              </article>

              <article className="stat-card">
                <span className="stat-icon icon-purple">⚙️</span>
                <div>
                  <p>In Progress</p>
                  <h2>{inProgressIssues}</h2>
                </div>
              </article>

              <article className="stat-card">
                <span className="stat-icon icon-green">✓</span>
                <div>
                  <p>Resolved</p>
                  <h2>{resolvedIssues}</h2>
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">COMPLAINT MANAGEMENT</span>
                  <h2>Manage Civic Issues</h2>
                  <p className="muted">
                    Review reports and update their status.
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={loadIssues}
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="filter-row">
                <label htmlFor="statusFilter">Filter by status</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="ALL">All Issues</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              {filteredIssues.length === 0 ? (
                <div className="empty-state">
                  <span>📭</span>
                  <h3>No issues found</h3>
                  <p>No issues match your selected filter.</p>
                </div>
              ) : (
                <div className="issues-list">
                  {filteredIssues.map((issue) => (
                    <article className="issue" key={issue.id}>
                      <div className="issue-topline">
                        <span className="issue-id">ISSUE #{issue.id}</span>
                        <StatusBadge status={issue.status} />
                      </div>

                      <h3>{issue.title}</h3>

                      <p className="issue-detail">
                        <strong>Category:</strong> {issue.category}
                      </p>
                      <p className="issue-detail">
                        <strong>Priority:</strong>{' '}
                        <PriorityBadge issue={issue} />
                      </p>
                      <p className="issue-detail">
                        <strong>Location:</strong> {issue.location}
                      </p>
                      <p className="issue-detail">
                        <strong>Description:</strong> {issue.description}
                      </p>

                      <IssueLocation issue={issue} />

                      <div className="status-update">
                        <label htmlFor={`status-${issue.id}`}>
                          Update Issue Status
                        </label>

                        <select
                          id={`status-${issue.id}`}
                          value={normalizeStatus(issue.status)}
                          disabled={updatingIssueId === issue.id}
                          onChange={(event) =>
                            updateIssueStatus(
                              issue.id,
                              event.target.value
                            )
                          }
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>

                        {updatingIssueId === issue.id && (
                          <p className="muted">Updating status...</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="panel empty-state">
            <span>🔐</span>
            <h2>Access denied</h2>
            <p>
              Please sign in through the correct portal to access your dashboard.
            </p>
            <button
              className="btn-primary"
              type="button"
              onClick={logout}
            >
              Return to Home
            </button>
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <span>🏛️</span>
          <strong>SMART CIVIC</strong>
        </div>
        <p>Working together for cleaner, safer, better communities.</p>
        <div className="footer-bottom">
          <span>Smart Civic Issue Reporting System</span>
          <span>Made for the community ♥</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
