import React, { useState, useEffect, useContext } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

interface TimeSlot {
  id: number;
  start_date: string;
  end_date: string;
}

interface Group {
  id: number;
  name: string;
  address: string;
  max_participants: number;
  current_participants: number;
  status: string;
  created_at: string;
  time_slots?: TimeSlot[];
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
}

const Join: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useContext(AuthContext);
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);

  useEffect(() => {
    const fetchJoinInfo = async () => {
      try {
        const response = await axios.get(`/join/${token}/info`);
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

  const handleTimeSlotToggle = (timeSlotId: number) => {
    setSelectedTimeSlots(prev => {
      if (prev.includes(timeSlotId)) {
        return prev.filter(id => id !== timeSlotId);
      } else {
        return [...prev, timeSlotId];
      }
    });
    // Clear any previous error when user selects time slots
    if (error) {
      setError('');
    }
  };

  const handleJoin = async () => {
    if (!user || !token) return;
    
    // Only require time slot selection if the group has time slots
    const hasTimeSlots = joinInfo?.group.time_slots && joinInfo.group.time_slots.length > 0;
    if (hasTimeSlots && selectedTimeSlots.length === 0) {
      setError('You must select at least one available time slot');
      return;
    }

    setJoining(true);
    try {
      await axios.post(`/join/${token}`, {
        time_slot_ids: selectedTimeSlots
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
          <Link to="/login" className="button">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="container">
        <div className="card">
          <h2>Successfully Joined!</h2>
          <p>You have successfully joined the group "{joinInfo?.group.name}".</p>
          <Link to="/groups" className="button">View My Groups</Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card">
          <h2>Join Group Invitation</h2>
          {joinInfo && (
            <div>
              <h3>{joinInfo.group.name}</h3>
              <p><strong>Location:</strong> {joinInfo.group.address}</p>
              <p><strong>Created by:</strong> {joinInfo.group.creator.name}</p>
              <p><strong>Participants:</strong> {joinInfo.group.current_participants}/{joinInfo.group.max_participants}</p>
              <p><strong>Invited as:</strong> {joinInfo.invitee.name} ({joinInfo.invitee.email})</p>
            </div>
          )}
          <div className="form-group">
            <p>You need to log in or register to join this group.</p>
            <Link to={`/login?redirect=/join/${token}`} className="button" style={{ marginRight: '10px' }}>Login</Link>
            <Link to={`/register?redirect=/join/${token}`} className="button button-secondary">Register</Link>
          </div>
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
          <Link to={`/login?redirect=/join/${token}`} className="button">Switch Account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Join Group Invitation</h2>
        {joinInfo && (
          <div>
            <h3>{joinInfo.group.name}</h3>
            <p><strong>Location:</strong> {joinInfo.group.address}</p>
            <p><strong>Created by:</strong> {joinInfo.group.creator.name} ({joinInfo.group.creator.email})</p>
            <p><strong>Participants:</strong> {joinInfo.group.current_participants}/{joinInfo.group.max_participants}</p>
            <p><strong>Status:</strong> {joinInfo.group.status}</p>
            
            {joinInfo.group.time_slots && joinInfo.group.time_slots.length > 0 && (
              <div className="form-group" style={{ marginTop: '20px' }}>
                <h4>Available Time Slots</h4>
                <p>Please select at least one time slot that works for you:</p>
                <div style={{ marginBottom: '15px' }}>
                  {joinInfo.group.time_slots.map((slot) => (
                    <div key={slot.id} style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedTimeSlots.includes(slot.id)}
                          onChange={() => handleTimeSlotToggle(slot.id)}
                          style={{ marginRight: '10px' }}
                        />
                        <span>
                          {new Date(slot.start_date).toLocaleDateString()} - {new Date(slot.end_date).toLocaleDateString()}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="form-group">
              <p>You've been invited to join this dumpster sharing group!</p>
              {joinInfo.group.time_slots && joinInfo.group.time_slots.length > 0 && selectedTimeSlots.length === 0 && (
                <p style={{ color: '#dc3545', fontSize: '14px', marginBottom: '10px' }}>
                  Please select at least one time slot before joining.
                </p>
              )}
              <button 
                className="button" 
                onClick={handleJoin}
                disabled={joining || (joinInfo.group.time_slots && joinInfo.group.time_slots.length > 0 && selectedTimeSlots.length === 0)}
              >
                {joining ? 'Joining...' : 'Join Group'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Join;