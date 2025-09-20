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
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center'
    }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
        color: 'white',
        padding: '60px 40px',
        borderRadius: '16px',
        marginBottom: '40px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 123, 255, 0.15)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '800px'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: '3.2em',
            margin: '0 0 16px 0',
            fontWeight: '700',
            letterSpacing: '-0.02em'
          }}>
            Group Dump
          </h1>
          <p style={{
            fontSize: '1.25em',
            margin: '0',
            opacity: '0.95',
            fontWeight: '400'
          }}>
            Split dumpster rental costs with your neighbors
          </p>
        </div>
      </div>

      {/* Login Form */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        marginBottom: '40px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '1.75em',
            margin: '0 0 8px 0',
            color: '#2c3e50',
            fontWeight: '600'
          }}>
            Welcome Back
          </h2>
          <p style={{
            color: '#6c757d',
            margin: '0',
            fontSize: '1rem'
          }}>
            Sign in to your account to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
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
          marginTop: '24px',
          paddingTop: '24px',
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
        background: '#f8f9fa',
        padding: '30px',
        borderRadius: '16px',
        marginBottom: '30px',
        border: '1px solid #e9ecef',
        width: '100%',
        maxWidth: '900px'
      }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '25px', textAlign: 'center' }}>
          How Group Dump Works
        </h2>

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
            border: '2px solid #28a745',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '2.5em',
                background: '#28a745',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px auto',
                color: 'white'
              }}>
                👤
              </div>
              <h3 style={{ color: '#28a745', margin: '0', fontSize: '1.2em' }}>Group Creator</h3>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#28a745', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>1.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Create a group</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#28a745', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>2.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Compare vendor prices and services</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#28a745', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>3.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Invite neighbors</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#28a745', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>4.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Book service</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#28a745', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>5.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Get reimbursed</span>
              </div>
              <div style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#28a745', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>6.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Discard your junk</span>
              </div>
            </div>
          </div>

          {/* Flow 2: Join a Group */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid #007bff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '2.5em',
                background: '#007bff',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px auto',
                color: 'white'
              }}>
                👥
              </div>
              <h3 style={{ color: '#007bff', margin: '0', fontSize: '1.2em' }}>Group Member</h3>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#007bff', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>1.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Join a group</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#007bff', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>2.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Reimburse your neighbor</span>
              </div>
              <div style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#007bff', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>3.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Discard your junk</span>
              </div>
            </div>
          </div>

          {/* Flow 3: Dumpster Provider */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid #6610f2',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '2.5em',
                background: '#6610f2',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px auto',
                color: 'white'
              }}>
                🚚
              </div>
              <h3 style={{ color: '#6610f2', margin: '0', fontSize: '1.2em' }}>Dumpster Provider</h3>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#6610f2', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>1.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Register as a verified provider</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#6610f2', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>2.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Provide service and pricing details</span>
              </div>
              <div style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#6610f2', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>3.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Help people discard their junk</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '15px', textAlign: 'center' }}>
            💡 Why Group Dump?
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <strong style={{ color: '#28a745' }}>Save Money:</strong>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                For example, split a $300 dumpster 3 ways = $100 each instead of renting solo
              </p>
            </div>
            <div>
              <strong style={{ color: '#007bff' }}>Easy Coordination:</strong>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                Invite neighbors, schedule delivery, and track who owes what
              </p>
            </div>
            <div>
              <strong style={{ color: '#6610f2' }}>Flexible Payments:</strong>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                Get reimbursed however works best - Venmo, Zelle, cash, Apple Pay
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;