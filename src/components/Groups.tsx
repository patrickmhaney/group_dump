import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

interface Group {
  id: number;
  name: string;
  address: string;
  max_participants: number;
  status: string;
  created_by: number;
  target_date: string;
  created_at: string;
}

const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    max_participants: 5,
    target_date: ''
  });
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/groups', {
        ...formData,
        target_date: new Date(formData.target_date).toISOString()
      });
      setGroups([response.data, ...groups]);
      setShowCreateForm(false);
      setFormData({ name: '', address: '', max_participants: 5, target_date: '' });
      setMessage('Group created successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Error creating group');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleJoinGroup = async (groupId: number) => {
    try {
      await axios.post(`/groups/${groupId}/join`);
      setMessage('Successfully joined group!');
      setTimeout(() => setMessage(''), 3000);
      fetchGroups(); // Refresh the list
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Error joining group');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'max_participants' ? parseInt(value) : value
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Groups</h1>
        <button
          className="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create Group'}
        </button>
      </div>

      {message && (
        <div className={message.includes('Error') ? 'error' : 'success'}>
          {message}
        </div>
      )}

      {showCreateForm && (
        <div className="card">
          <h2>Create New Group</h2>
          <form onSubmit={handleCreateGroup} className="form">
            <input
              type="text"
              name="name"
              placeholder="Group Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleChange}
              required
            />
            <input
              type="number"
              name="max_participants"
              placeholder="Max Participants"
              value={formData.max_participants}
              onChange={handleChange}
              min="2"
              max="10"
              required
            />
            <input
              type="datetime-local"
              name="target_date"
              value={formData.target_date}
              onChange={handleChange}
              required
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="button">Create Group</button>
              <button type="button" className="button button-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Available Groups</h2>
        {groups.length === 0 ? (
          <p>No groups available. Create the first one!</p>
        ) : (
          <div className="group-list">
            {groups.map((group) => (
              <div key={group.id} className="group-item">
                <h3>{group.name}</h3>
                <p><strong>Address:</strong> {group.address}</p>
                <p><strong>Max Participants:</strong> {group.max_participants}</p>
                <p><strong>Status:</strong> {group.status}</p>
                <p><strong>Target Date:</strong> {new Date(group.target_date).toLocaleDateString()}</p>
                <p><strong>Created:</strong> {new Date(group.created_at).toLocaleDateString()}</p>
                {group.created_by !== user?.id && (
                  <button
                    className="button"
                    onClick={() => handleJoinGroup(group.id)}
                  >
                    Join Group
                  </button>
                )}
                {group.created_by === user?.id && (
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>You created this group</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;