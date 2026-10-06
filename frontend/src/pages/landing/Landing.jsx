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
    description: 'Track the rover location and movement with live GPS information and route data.',
  },
  {
    image: '/illustrations/features/feature-live-camera.svg',
    title: 'Live Camera',
    description: 'View the rover camera stream and observe the environment in real time.',
  },
  {
    image: '/illustrations/features/feature-event-detection.svg',
    title: 'Event Detection',
    description: 'Detect important events and provide useful information for faster response.',
  },
  {
    image: '/illustrations/features/feature-snapshot-history.svg',
    title: 'Snapshot History',
    description: 'Save important camera captures and review previous events whenever required.',
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
              APEX brings live rover monitoring, remote control, GPS tracking, camera streaming and
              event management together in one platform.
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
              <img src="/images/hero/hero-rover-field.jpg" alt="APEX monitoring rover" />

              <div className="hero-image-overlay" />

              <div className="hero-status-card">
                <div className="status-card-header">
                  <span className="status-live-dot" />
                  Rover Online
                </div>

                <strong>APEX Rover 01</strong>

                <div className="status-card-data">
                  <div>
                    <span>Speed</span>
                    <strong>1.4 m/s</strong>
                  </div>

                  <div>
                    <span>Battery</span>
                    <strong>82%</strong>
                  </div>
                </div>
              </div>

              <div className="hero-live-label">
                <span />
                LIVE MONITORING
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
            From live camera monitoring and GPS tracking to remote vehicle control and event
            history, APEX provides the tools required to operate and monitor your rover from a
            single interface.
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

                  <span className="feature-link">
                    Learn more
                    <ArrowRight size={15} />
                  </span>
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
            <img src="/images/monitoring/dashboard-mockup.png" alt="APEX command center" />
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
