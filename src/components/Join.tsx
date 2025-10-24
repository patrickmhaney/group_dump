import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App.tsx';
import { formatDateDisplay } from '../utils/dateUtils.ts';

interface DropoffDate {
  id: number;
  date: string;
}

interface Group {
  id: number;
  name: string;
  address: string;
  max_participants: number;
  current_participants: number;
  status: string;
  created_at: string;
  dropoff_dates?: DropoffDate[];
  price_per_person?: number;
  creator: {
    name: string;
    email: string;
  };
}

interface Invitee {
  name: string;
  email: string;
}

interface JoinInfo {
  group: Group;
  invitee: Invitee;
  other_invitees: Invitee[];
}

const Join: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useContext(AuthContext);
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [selectedDropoffDates, setSelectedDropoffDates] = useState<number[]>([]);

  useEffect(() => {
    const fetchJoinInfo = async () => {
      try {
        // Create axios instance without auth headers for public endpoint
        const unauthenticatedAxios = axios.create({
          baseURL: axios.defaults.baseURL,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await unauthenticatedAxios.get(`/join/${token}/info`);
        setJoinInfo(response.data);
      } catch (error: any) {
        setError(error.response?.data?.detail || 'Invalid or expired invitation link');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchJoinInfo();
    }
  }, [token]);

  const handleDropoffDateToggle = (timeSlotId: number) => {
    setSelectedDropoffDates(prev => {
      if (prev.includes(timeSlotId)) {
        return prev.filter(id => id !== timeSlotId);
      } else {
        return [...prev, timeSlotId];
      }
    });
    // Clear any previous error when user selects time dates
    if (error) {
      setError('');
    }
  };

  const handleJoinGroup = async () => {
    if (!token) return;

    // Only require dropoff date selection if the group has dropoff dates
    const hasDropoffDates = joinInfo?.group.dropoff_dates && joinInfo.group.dropoff_dates.length > 0;
    if (hasDropoffDates && selectedDropoffDates.length === 0) {
      setError('Please select at least one available pickup date');
      return;
    }

    setError('');
    setJoining(true);

    try {
      // Join the group directly without requiring authentication
      // Create a new axios instance without the global Authorization header
      const unauthenticatedAxios = axios.create({
        baseURL: axios.defaults.baseURL,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await unauthenticatedAxios.post(`/join/${token}`, {
        dropoff_date_ids: selectedDropoffDates
      });
      setJoined(true);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Loading invitation...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2>Invitation Error</h2>
          <p className="error">{error}</p>
          <Link to="/home" className="button">Go to Home</Link>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="container">
        <div className="card">
          <h2>🎉 Welcome to the Group!</h2>

          <div style={{
            padding: '20px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#155724' }}>
              <strong>You've successfully joined "{joinInfo?.group.name}"!</strong>
            </p>
            <p style={{ margin: '0', fontSize: '14px', color: '#155724' }}>
              You'll receive updates about the dumpster rental via email.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p><strong>📍 Location:</strong> {joinInfo?.group.address}</p>
            <p><strong>👤 Organized by:</strong> {joinInfo?.group.creator.name} ({joinInfo?.group.creator.email})</p>
            {selectedDropoffDates.length > 0 && joinInfo?.group.dropoff_dates && (
              <div>
                <p><strong>📅 Your selected dates:</strong></p>
                <ul style={{ paddingLeft: '20px' }}>
                  {joinInfo.group.dropoff_dates
                    .filter(date => selectedDropoffDates.includes(date.id))
                    .map(date => (
                      <li key={date.id}>{formatDateDisplay(date.date)}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          <div style={{
            padding: '15px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: '0', fontSize: '14px', color: '#495057' }}>
              <strong>What's next?</strong> The group organizer will coordinate the final details and notify everyone when the dumpster is ordered. Keep an eye on your email for updates!
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link
              to={`/register?email=${encodeURIComponent(joinInfo?.invitee.email || '')}`}
              className="button"
              style={{ marginRight: '10px' }}
            >
              Create Account (Optional)
            </Link>
            <Link to="/" className="button button-secondary">
              Learn More About Dumpster Sharing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card">
          <h2>Group Dump Invitation</h2>

          <div style={{
            padding: '20px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>What is dumpster sharing?</h4>
            <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
              Split the cost of a dumpster rental with your neighbors! Perfect for home renovations, cleanouts, or large projects. Everyone saves money and coordinates pickup schedules together.
            </p>
          </div>

          {joinInfo && (
            <div>
              <h3 style={{ color: '#28a745', marginBottom: '15px' }}>{joinInfo.group.name}</h3>
              <div style={{ marginBottom: '20px' }}>
                <p><strong>📍 Drop-off Location:</strong> {joinInfo.group.address}</p>
                <p><strong>👤 Organized by:</strong> {joinInfo.group.creator.name}</p>
                <p><strong>👥 Target Group Size:</strong> {joinInfo.group.max_participants}</p>
                {joinInfo.group.price_per_person && (
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ margin: '0 0 5px 0' }}><strong>💰 Price per person:</strong> ${joinInfo.group.price_per_person.toFixed(2)}</p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>
                      *Estimate based on price listed on vendor's website. Does not include additional charges for weight overages or extra rental days.
                    </p>
                  </div>
                )}
                <p><strong>✉️ You're invited as:</strong> {joinInfo.invitee.name} ({joinInfo.invitee.email})</p>
                {joinInfo.other_invitees && joinInfo.other_invitees.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: '0 0 5px 0' }}><strong>👋 Other Invited Members:</strong></p>
                    <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#6c757d' }}>
                      {joinInfo.other_invitees.map((invitee, index) => (
                        <li key={index} style={{ marginBottom: '2px' }}>
                          {invitee.name} ({invitee.email})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>


              {joinInfo.group.dropoff_dates && joinInfo.group.dropoff_dates.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <div style={{
                    padding: '15px',
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '6px',
                    marginBottom: '20px'
                  }}>
                    <p style={{ margin: '0', fontSize: '14px', color: '#155724' }}>
                      <strong>📋 Select your available dates:</strong><br/>
                      Choose all dates when you could be available for pickup. You can change these later if needed.
                    </p>
                  </div>

                  <div className="form-group">
                    {joinInfo.group.dropoff_dates.map((date) => (
                      <div key={date.id} style={{ marginBottom: '12px' }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          padding: '12px',
                          border: selectedDropoffDates.includes(date.id) ? '2px solid #28a745' : '1px solid #dee2e6',
                          borderRadius: '6px',
                          backgroundColor: selectedDropoffDates.includes(date.id) ? '#d4edda' : '#ffffff'
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedDropoffDates.includes(date.id)}
                            onChange={() => handleDropoffDateToggle(date.id)}
                            style={{ marginRight: '15px', transform: 'scale(1.2)' }}
                          />
                          <span style={{ fontSize: '16px', fontWeight: selectedDropoffDates.includes(date.id) ? 'bold' : 'normal' }}>
                            {formatDateDisplay(date.date)}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>

                  {selectedDropoffDates.length === 0 && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffeaa7',
                      borderRadius: '6px',
                      marginBottom: '15px'
                    }}>
                      <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
                        Please select at least one date to continue
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div style={{
                padding: '15px',
                backgroundColor: '#d1ecf1',
                border: '1px solid #bee5eb',
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>Ready to join?</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#0c5460' }}>
                  Click "Join Group" below to select your available dates and confirm your place in the group! The group creator will request payment after booking the service.
                </p>
              </div>

              <div className="form-group">
                <button
                  className="button"
                  style={{
                    fontSize: '16px',
                    padding: '15px 30px',
                    marginBottom: '15px',
                    width: '100%'
                  }}
                  onClick={handleJoinGroup}
                  disabled={joining || (joinInfo.group.dropoff_dates && joinInfo.group.dropoff_dates.length > 0 && selectedDropoffDates.length === 0)}
                >
                  {joining ? 'Joining Group...' : 'Join Group'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                  <p style={{ fontSize: '13px', color: '#6c757d', margin: '0 0 10px 0' }}>
                    Already have an account?
                  </p>
                  <Link
                    to={`/home?redirect=/join/${token}`}
                    className="button button-secondary"
                    style={{ marginRight: '10px', fontSize: '14px', padding: '8px 16px' }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to={`/register?redirect=/join/${token}`}
                    className="button button-secondary"
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // User is logged in, check if their email matches the invitation
  if (user.email !== joinInfo?.invitee.email) {
    return (
      <div className="container">
        <div className="card">
          <h2>Invitation Mismatch</h2>
          <p>This invitation is for {joinInfo?.invitee.email}, but you are logged in as {user.email}.</p>
          <p>Please log in with the correct account or contact the group creator.</p>
          <Link to={`/home?redirect=/join/${token}`} className="button">Switch Account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>🗑️ Join Group Invitation</h2>
        {joinInfo && (
          <div>
            <h3 style={{ color: '#28a745', marginBottom: '15px' }}>{joinInfo.group.name}</h3>
            <div style={{ marginBottom: '20px' }}>
              <p><strong>📍 Location:</strong> {joinInfo.group.address}</p>
              <p><strong>👤 Created by:</strong> {joinInfo.group.creator.name} ({joinInfo.group.creator.email})</p>
              <p><strong>👥 Participants:</strong> {joinInfo.group.current_participants}/{joinInfo.group.max_participants}</p>
              <p><strong>📊 Status:</strong> {joinInfo.group.status}</p>
            </div>

            {joinInfo.group.dropoff_dates && joinInfo.group.dropoff_dates.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{
                  padding: '15px',
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '6px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0', fontSize: '14px', color: '#155724' }}>
                    <strong>📋 Select your available dates:</strong><br/>
                    Choose all dates when you could be available for pickup. You can change these later if needed.
                  </p>
                </div>

                <div className="form-group">
                  {joinInfo.group.dropoff_dates.map((date) => (
                    <div key={date.id} style={{ marginBottom: '12px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '12px',
                        border: selectedDropoffDates.includes(date.id) ? '2px solid #28a745' : '1px solid #dee2e6',
                        borderRadius: '6px',
                        backgroundColor: selectedDropoffDates.includes(date.id) ? '#d4edda' : '#ffffff'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedDropoffDates.includes(date.id)}
                          onChange={() => handleDropoffDateToggle(date.id)}
                          style={{ marginRight: '15px', transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontSize: '16px', fontWeight: selectedDropoffDates.includes(date.id) ? 'bold' : 'normal' }}>
                          {formatDateDisplay(date.date)}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                {selectedDropoffDates.length === 0 && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '6px',
                    marginBottom: '15px'
                  }}>
                    <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
                      Please select at least one date to continue
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '6px',
                marginBottom: '15px'
              }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#721c24' }}>
                  {error}
                </p>
              </div>
            )}

            <div className="form-group">
              <button
                className="button"
                style={{
                  fontSize: '16px',
                  padding: '15px 30px',
                  width: '100%'
                }}
                onClick={handleJoinGroup}
                disabled={joining || (joinInfo.group.dropoff_dates && joinInfo.group.dropoff_dates.length > 0 && selectedDropoffDates.length === 0)}
              >
                {joining ? 'Joining Group...' : 'Join Group'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Join;
