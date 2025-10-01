import React, { useState, useContext } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const tokenResponse = await axios.post('/token', formData);
      const userResponse = await axios.get('/users/me', {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
      });

      login(tokenResponse.data.access_token, userResponse.data);
      
      // Check for redirect parameter
      const redirectPath = searchParams.get('redirect');
      if (redirectPath) {
        navigate(redirectPath);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center'
    }}>
      {/* Group Dump Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        width: '100%',
        maxWidth: '500px'
      }}>
        <h2 style={{
          fontSize: '1.75em',
          margin: '0',
          color: '#2c3e50',
          fontWeight: '600'
        }}>
          Group Dump
        </h2>
      </div>

      {/* Login Form */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '25px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '2px solid #dee2e6',
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <p style={{
            color: '#6c757d',
            margin: '0',
            fontSize: '1rem'
          }}>
            Sign in to lighten your load
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          width: '100%'
        }}>
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '16px 20px',
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '16px 20px',
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#dc3545',
              backgroundColor: '#f8d7da',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #f5c6cb',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? '#6c757d'
                : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxShadow: loading
                ? 'none'
                : '0 4px 12px rgba(0, 123, 255, 0.3)',
              opacity: loading ? '0.7' : '1'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
              }
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #e9ecef'
        }}>
          <p style={{
            color: '#6c757d',
            margin: '0',
            fontSize: '15px'
          }}>
            Don't have an account?{' '}
            <Link
              to={`/register${searchParams.get('redirect') ? `?redirect=${searchParams.get('redirect')}` : ''}`}
              style={{
                color: '#007bff',
                textDecoration: 'none',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                e.target.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.target.style.textDecoration = 'none';
              }}
            >
              Create one here
            </Link>
          </p>
        </div>
      </div>

      <div style={{
        padding: '10px 30px 30px 30px',
        marginBottom: '30px',
        width: '100%',
        maxWidth: '900px'
      }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '12px', textAlign: 'center', fontSize: '1.5em', fontWeight: '600' }}>
          How It Works
        </h2>
        <p style={{
          color: '#6c757d',
          margin: '0 0 25px 0',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          textAlign: 'center'
        }}>
          Browse local companies to find the best price and service fit • Split dumpster rental costs with your neighbors • Coordinate and book service • Dump your junk
        </p>
        <h3 style={{
          color: '#2c3e50',
          margin: '0 0 20px 0',
          fontSize: '1.2em',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          Who's Involved and What Do They Need To Do
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '25px',
          marginBottom: '30px'
        }}>
          {/* Flow 1: Create a Group */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '2.5em',
                margin: '0 auto 10px auto'
              }}>
                👤
              </div>
              <h3 style={{ color: '#2c3e50', margin: '0', fontSize: '1.2em' }}>Group Creator</h3>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>1.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Create a group</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>2.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Compare vendor prices and services</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>3.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Invite neighbors</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>4.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Book service</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>5.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Get reimbursed</span>
              </div>
              <div style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>6.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Discard your junk</span>
              </div>
            </div>
          </div>

          {/* Flow 2: Join a Group */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '2.5em',
                margin: '0 auto 10px auto'
              }}>
                👥
              </div>
              <h3 style={{ color: '#2c3e50', margin: '0', fontSize: '1.2em' }}>Group Member</h3>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>1.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Join a group</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>2.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Reimburse your neighbor</span>
              </div>
              <div style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>3.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Discard your junk</span>
              </div>
            </div>
          </div>

          {/* Flow 3: Dumpster Provider */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '2.5em',
                margin: '0 auto 10px auto'
              }}>
                🚚
              </div>
              <h3 style={{ color: '#2c3e50', margin: '0', fontSize: '1.2em' }}>Dumpster Provider</h3>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>1.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Register as a verified provider</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>2.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Provide service and pricing details</span>
              </div>
              <div style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>3.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Help people discard their junk</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer style={{
        width: '100%',
        maxWidth: '900px',
        borderTop: '1px solid #dee2e6',
        paddingTop: '30px',
        marginTop: '20px',
        paddingBottom: '30px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '30px',
          marginBottom: '25px'
        }}>
          {/* About */}
          <div>
            <h4 style={{ color: '#2c3e50', marginBottom: '12px', fontSize: '1em', fontWeight: '600' }}>
              About
            </h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>About Us</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>How It Works</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Pricing</a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ color: '#2c3e50', marginBottom: '12px', fontSize: '1em', fontWeight: '600' }}>
              Support
            </h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Contact Us</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>FAQ</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Help Center</a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ color: '#2c3e50', marginBottom: '12px', fontSize: '1em', fontWeight: '600' }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Privacy Policy</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Terms of Service</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Cookie Policy</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media */}
        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          paddingBottom: '20px',
          borderTop: '1px solid #dee2e6'
        }}>
          <h4 style={{ color: '#2c3e50', marginBottom: '12px', fontSize: '1em', fontWeight: '600' }}>
            Follow Us
          </h4>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '1.5em' }}>
              📘
            </a>
            <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '1.5em' }}>
              🐦
            </a>
            <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '1.5em' }}>
              📷
            </a>
            <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '1.5em' }}>
              💼
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px solid #dee2e6'
        }}>
          <p style={{ color: '#6c757d', margin: '0', fontSize: '0.85em' }}>
            © 2025 Group Dump. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Login;