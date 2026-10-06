import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useDispatch } from 'react-redux';

import api from '../../services/api.service';
import { loginSuccess } from '../../redux/slices/authSlice';

import '../../styles/auth.css';

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');

    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/login', {
        username: username.trim(),
        password,
      });

      const data = response.data.data;

      dispatch(loginSuccess(data));

      navigate('/dashboard');
    } catch (error) {
      const message =
        error.response?.data?.message || 'Unable to sign in. Please check your credentials.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        {/* Form */}
        <section className="auth-form-panel">
          <div className="auth-form-content">
            <Link to="/" className="auth-back-link">
              <ArrowLeft size={16} />
              Back to APEX
            </Link>

            <div className="auth-heading">
              <span className="auth-eyebrow">APEX CONTROL PLATFORM</span>

              <h1>Welcome back.</h1>

              <p>Sign in to access your rover monitoring and control platform.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {/* Username */}
              <div className="auth-field">
                <label htmlFor="username">Username</label>

                <div className="auth-input-wrapper">
                  <User size={18} />

                  <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-field">
                <label htmlFor="password">Password</label>

                <div className="auth-input-wrapper">
                  <Lock size={18} />

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && <div className="auth-error">{error}</div>}

              {/* Submit */}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <p className="auth-switch">
              Don't have an account? <Link to="/signup">Create an account</Link>
            </p>
          </div>
        </section>

        {/* Visual */}
        <section className="auth-visual-panel">
          <div className="auth-visual-content">
            <img
              src="/illustrations/authentication/login-illustration.svg"
              alt="APEX rover monitoring"
              className="auth-illustration"
            />

            <div className="auth-visual-copy">
              <span>MONITOR · CONTROL · RESPOND</span>

              <h2>
                Stay connected
                <br />
                to your rover.
              </h2>

              <p>
                Monitor live telemetry, control your vehicle, track its location, and respond to
                events from one platform.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
