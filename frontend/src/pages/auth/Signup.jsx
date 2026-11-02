import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../services/api.service';
import '../../styles/auth.css';

const validate = (values) => {
  const errors = {};
  if (!/^[\p{L}][\p{L}' -]{1,79}$/u.test(values.fullName.trim())) {
    errors.fullName = 'Enter a valid name between 2 and 80 characters.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (
    values.password.length < 8 ||
    values.password.length > 128 ||
    !/[A-Z]/.test(values.password) ||
    !/[a-z]/.test(values.password) ||
    !/\d/.test(values.password)
  ) {
    errors.password = 'Use 8-128 characters with upper, lower, and numeric characters.';
  }
  if (!values.confirmPassword || values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords must match.';
  }
  return errors;
};

function Signup() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const errors = validate(values);

  const updateField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/register', {
        ...values,
        fullName: values.fullName.trim(),
        email: values.email.trim().toLowerCase(),
      });
      setSuccess('Account created. Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, icon, type = 'text', options = {}) => (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <div className="auth-input-wrapper">
        {icon}
        <input
          id={name}
          name={name}
          type={type}
          value={values[name]}
          onChange={(event) => updateField(name, event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, [name]: true }))}
          autoComplete={options.autoComplete}
          aria-invalid={Boolean(touched[name] && errors[name])}
          aria-describedby={touched[name] && errors[name] ? `${name}-error` : undefined}
          {...options}
        />
        {name === 'password' && (
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {touched[name] && errors[name] && (
        <span id={`${name}-error`} className="auth-field-error">
          {errors[name]}
        </span>
      )}
    </div>
  );

  return (
    <main className="auth-page">
      <div className="auth-container">
        <section className="auth-form-panel">
          <div className="auth-form-content">
            <Link to="/" className="auth-back-link">
              <ArrowLeft size={16} />
              Back to APEX
            </Link>
            <div className="auth-heading">
              <span className="auth-eyebrow">APEX CONTROL PLATFORM</span>
              <h1>Create your account.</h1>
              <p>Register to access your rover monitoring and control platform.</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {field('fullName', 'Full name', <User size={18} />, 'text', {
                placeholder: 'Enter your full name',
                autoComplete: 'name',
              })}
              {field('email', 'Email address', <Mail size={18} />, 'email', {
                placeholder: 'you@example.com',
                autoComplete: 'email',
              })}
              {field('password', 'Password', <Lock size={18} />, showPassword ? 'text' : 'password', {
                placeholder: 'Create a strong password',
                autoComplete: 'new-password',
              })}
              {field(
                'confirmPassword',
                'Confirm password',
                <Lock size={18} />,
                showPassword ? 'text' : 'password',
                { placeholder: 'Repeat your password', autoComplete: 'new-password' }
              )}
              {error && <div className="auth-error" role="alert">{error}</div>}
              {success && <div className="auth-success" role="status">{success}</div>}
              <button type="submit" className="auth-submit" disabled={loading || Boolean(success)}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </section>
        <section className="auth-visual-panel">
          <div className="auth-visual-content">
            <img
              src="/illustrations/authentication/signup-illustration.svg"
              alt="APEX platform"
              className="auth-illustration"
            />
            <div className="auth-visual-copy">
              <span>APEX PLATFORM</span>
              <h2>Built for<br />controlled access.</h2>
              <p>Monitor, control, and respond from one local-first platform.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Signup;
