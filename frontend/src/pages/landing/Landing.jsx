import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import LandingNavbar from '../../components/layout/LandingNavbar';

const features = [
  {
    image: '/illustrations/features/feature-live-monitoring.svg',
    title: 'Live Rover Monitoring',
    description: 'Monitor rover status, connectivity and telemetry from one centralized platform.',
  },
  {
    image: '/illustrations/features/feature-remote-control.svg',
    title: 'Remote Vehicle Control',
    description:
      'Control rover movement and camera direction remotely through the APEX control center.',
  },
  {
    image: '/illustrations/features/feature-gps-tracking.svg',
    title: 'GPS Tracking',
    description: "View the rover's GPS position and configured geofence on the dashboard map.",
  },
  {
    image: '/illustrations/features/feature-live-camera.svg',
    title: 'Live Camera',
    description: 'View the rover camera stream and observe the environment in real time.',
  },
  {
    image: '/illustrations/features/feature-event-detection.svg',
    title: 'Event Detection',
    description: 'Review recorded flame, obstacle and geofence alerts from the rover.',
  },
  {
    image: '/illustrations/features/feature-snapshot-history.svg',
    title: 'Snapshot History',
    description: 'Save rover camera snapshots and review saved images and vehicle events.',
  },
];

function Landing() {
  return (
    <div className="landing-page">
      <LandingNavbar />

      <main>
        {/* =========================================
            HERO
        ========================================= */}
        <section className="landing-hero">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Intelligent Rover Monitoring Platform
            </div>

            <h1>
              Monitor.
              <br />
              Control.
              <br />
              <span>Respond.</span>
            </h1>

            <p>
              APEX brings rover telemetry, remote control, GPS tracking, camera access and event
              history together in one platform.
            </p>

            <div className="hero-actions">
              <Button href="/signup">
                Get Started
                <ArrowRight size={17} />
              </Button>

              <Button href="#platform" variant="secondary">
                Explore Platform
              </Button>
            </div>

            <div className="hero-trust">
              <div>
                <CheckCircle2 size={15} />
                Live monitoring
              </div>

              <div>
                <CheckCircle2 size={15} />
                GPS tracking
              </div>

              <div>
                <CheckCircle2 size={15} />
                Remote control
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-wrapper">
              <div className="hero-product-overview">
                <span>APEX platform</span>
                <img
                  src="/illustrations/features/feature-live-monitoring.svg"
                  alt=""
                />
                <h2>Rover operations, together.</h2>
                <p>
                  Product illustration. Live readings are available in the dashboard when a rover
                  is connected.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            PLATFORM INTRO
        ========================================= */}
        <section className="platform-intro" id="platform">
          <div>
            <span className="section-label">APEX PLATFORM</span>

            <h2>
              One platform for your
              <br />
              entire rover operation.
            </h2>
          </div>

          <p>
            From rover telemetry and GPS tracking to remote vehicle control, camera access and
            recorded events, APEX brings connected rover operations into one interface.
          </p>
        </section>

        {/* =========================================
            FEATURES
        ========================================= */}
        <section className="landing-features" id="features">
          <div className="section-heading">
            <span className="section-label">CORE CAPABILITIES</span>

            <h2>Built around the way you operate.</h2>

            <p>
              A connected monitoring and control system designed for real-world rover operations.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-image">
                  <img src={feature.image} alt="" />
                </div>

                <div className="feature-content">
                  <h3>{feature.title}</h3>

                  <p>{feature.description}</p>

                </div>
              </article>
            ))}
          </div>
        </section>

        {/* =========================================
            DASHBOARD PREVIEW
        ========================================= */}
        <section className="landing-product">
          <div className="product-copy">
            <span className="section-label">COMMAND CENTER</span>

            <h2>
              Everything visible.
              <br />
              Everything connected.
            </h2>

            <p>
              Access rover status, live camera feeds, GPS information, telemetry and control tools
              from one professional command center.
            </p>

            <Button href="/signup">
              Get Started
              <ArrowRight size={17} />
            </Button>
          </div>

          <div className="product-preview">
            <div className="product-preview-header">
              <strong>APEX platform</strong>
              <span>Connected rover capabilities</span>
            </div>
            <div className="product-preview-grid">
              {features.slice(0, 4).map((feature) => (
                <div className="product-preview-capability" key={feature.title}>
                  <img src={feature.image} alt="" />
                  <span>{feature.title}</span>
                </div>
              ))}
            </div>
            <p>
              Illustrative overview. Live readings are shown in the dashboard when a rover is
              connected.
            </p>
          </div>
        </section>

        {/* =========================================
            FINAL CTA
        ========================================= */}
        <section className="landing-cta">
          <div>
            <span className="section-label">START WITH APEX</span>

            <h2>Ready to connect your rover?</h2>

            <p>Build, monitor and control your rover through one unified platform.</p>
          </div>

          <Button href="/signup">
            Create Account
            <ArrowRight size={17} />
          </Button>
        </section>

        {/* =========================================
            FOOTER
        ========================================= */}
        <footer className="landing-footer">
          <div className="footer-main">
            <div className="footer-brand">
              <img src="/brand/logo.svg" alt="APEX" />

              <p>Advanced Platform for Event Intelligence and Execution.</p>
            </div>

            <div className="footer-links">
              <div>
                <span>Platform</span>
                <a href="#features">Features</a>
                <a href="#platform">Overview</a>
              </div>

              <div>
                <span>Account</span>
                <a href="/login">Login</a>
                <a href="/signup">Signup</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 APEX. All rights reserved.</span>

            <span>Advanced Platform for Event Intelligence and Execution</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default Landing;
