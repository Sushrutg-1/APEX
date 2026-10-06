import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';

import '../../styles/auth.css';

function Signup() {
  return (
    <main className="auth-page">
      <div className="auth-container">
        {/* Left */}
        <section className="auth-form-panel">
          <div className="auth-form-content">
            <Link to="/" className="auth-back-link">
              <ArrowLeft size={16} />
              Back to APEX
            </Link>

            <div className="auth-heading">
              <span className="auth-eyebrow">APEX CONTROL PLATFORM</span>

              <h1>Registration unavailable.</h1>

              <p>
                New user registration is currently unavailable while APEX is in prototype
                development.
              </p>
            </div>

            <div className="signup-unavailable">
              <div className="signup-unavailable-icon">
                <UserPlus size={24} />
              </div>

              <h2>Registration is currently unavailable</h2>

              <p>
                APEX is currently being developed and tested as a prototype. New accounts cannot be
                created at this time.
              </p>

              <Link to="/login" className="auth-submit">
                Back to Login
              </Link>
            </div>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </section>

        {/* Right */}
        <section className="auth-visual-panel">
          <div className="auth-visual-content">
            <img
              src="/illustrations/authentication/signup-illustration.svg"
              alt="APEX platform"
              className="auth-illustration"
            />

            <div className="auth-visual-copy">
              <span>APEX PLATFORM</span>

              <h2>
                Built for
                <br />
                controlled access.
              </h2>

              <p>
                APEX is currently available for authorized prototype users while the platform is
                under active development.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Signup;
