import React, { useState, useEffect, useContext } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

interface Group {
  id: number;
  name: string;
  address: string;
  max_participants: number;
  current_participants: number;
  status: string;
  created_at: string;
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

  const handleJoin = async () => {
    if (!user || !token) return;

    setJoining(true);
    try {
      await axios.post(`/join/${token}`);
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
            <Link to="/login" className="button" style={{ marginRight: '10px' }}>Login</Link>
            <Link to="/register" className="button button-secondary">Register</Link>
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
          <Link to="/login" className="button">Switch Account</Link>
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
            
            <div className="form-group">
              <p>You've been invited to join this dumpster sharing group!</p>
              <button 
                className="button" 
                onClick={handleJoin}
                disabled={joining}
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