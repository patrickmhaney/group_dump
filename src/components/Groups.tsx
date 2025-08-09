import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

interface Group {
  id: number;
  name: string;
  address: string;
  max_participants: number;
  current_participants?: number;
  participants?: Participant[];
  status: string;
  created_by: number;
  created_at: string;
  time_slots?: TimeSlot[];
  vendor_id?: number;
  vendor_name?: string;
}

interface Participant {
  id: number;
  name: string;
  email: string;
  joined_at: string;
}

interface Company {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  service_areas: string;
  pricing_tiers: string;
  rating: number;
}

interface TimeSlot {
  start_date: string;
  end_date: string;
}

interface Invitee {
  name: string;
  email: string;
  phone?: string;
}

const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    max_participants: 5,
    vendor_id: ''
  });
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchGroups();
    fetchCompanies();
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

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/companies');
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const groupData = {
        ...formData,
        time_slots: timeSlots,
        invitees: invitees
      };
      
      if (formData.vendor_id) {
        groupData.vendor_id = parseInt(formData.vendor_id);
      }
      
      const response = await axios.post('/groups', groupData);
      setGroups([response.data, ...groups]);
      setShowCreateForm(false);
      setFormData({ name: '', address: '', max_participants: 5, vendor_id: '' });
      setTimeSlots([]);
      setInvitees([]);
      setMessage('Group created successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail
        : Array.isArray(error.response?.data?.detail)
        ? error.response.data.detail.map((err: any) => err.msg || err).join(', ')
        : 'Error creating group';
      setMessage(errorMessage);
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
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail
        : Array.isArray(error.response?.data?.detail)
        ? error.response.data.detail.map((err: any) => err.msg || err).join(', ')
        : 'Error joining group';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'max_participants' ? parseInt(value) : value
    });
  };

  const addTimeSlot = () => {
    if (timeSlots.length < 5) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const newSlot: TimeSlot = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      };
      setTimeSlots([...timeSlots, newSlot]);
    }
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const updatedSlots = timeSlots.map((slot, i) => {
      if (i === index) {
        const updatedSlot = { ...slot, [field]: value };
        if (field === 'start_date') {
          const startDate = new Date(value);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          updatedSlot.end_date = endDate.toISOString().split('T')[0];
        }
        return updatedSlot;
      }
      return slot;
    });
    setTimeSlots(updatedSlots);
  };

  const addInvitee = () => {
    setInvitees([...invitees, { name: '', email: '', phone: '' }]);
  };

  const removeInvitee = (index: number) => {
    setInvitees(invitees.filter((_, i) => i !== index));
  };

  const updateInvitee = (index: number, field: keyof Invitee, value: string) => {
    const updatedInvitees = invitees.map((invitee, i) => {
      if (i === index) {
        return { ...invitee, [field]: value };
      }
      return invitee;
    });
    setInvitees(updatedInvitees);
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
            <select
              name="vendor_id"
              value={formData.vendor_id}
              onChange={handleChange}
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">Select a Vendor (Optional)</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} - {company.address}
                </option>
              ))}
            </select>
            
            <div className="invitees-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3>Invite People to Group</h3>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={addInvitee}
                >
                  Add Invitee
                </button>
              </div>
              
              {invitees.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic' }}>
                  Add people to automatically send them email invitations when the group is created
                </p>
              ) : (
                <div className="invitees-list">
                  {invitees.map((invitee, index) => (
                    <div key={index} className="invitee-item" style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>
                            Name *
                          </label>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={invitee.name}
                            onChange={(e) => updateInvitee(index, 'name', e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            required
                          />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>
                            Email *
                          </label>
                          <input
                            type="email"
                            placeholder="email@example.com"
                            value={invitee.email}
                            onChange={(e) => updateInvitee(index, 'email', e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            required
                          />
                        </div>
                        <div style={{ flex: '1 1 150px' }}>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>
                            Phone
                          </label>
                          <input
                            type="tel"
                            placeholder="(555) 123-4567"
                            value={invitee.phone}
                            onChange={(e) => updateInvitee(index, 'phone', e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                        </div>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => removeInvitee(index)}
                          style={{ marginTop: '20px', flexShrink: 0 }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="time-slots-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3>Available Time Slots (Choose up to 5)</h3>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={addTimeSlot}
                  disabled={timeSlots.length >= 5}
                >
                  Add Time Slot
                </button>
              </div>
              
              {timeSlots.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic' }}>
                  Add time slots to help coordinate schedules with group members
                </p>
              ) : (
                <div className="time-slots-list">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="time-slot-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>
                            7-day period starting:
                          </label>
                          <input
                            type="date"
                            value={slot.start_date}
                            onChange={(e) => updateTimeSlot(index, 'start_date', e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>
                            Ending:
                          </label>
                          <input
                            type="date"
                            value={slot.end_date}
                            readOnly
                            style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                          />
                        </div>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => removeTimeSlot(index)}
                          style={{ marginTop: '20px' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
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
                <p><strong>Participants:</strong> {group.current_participants || 0} / {group.max_participants}</p>
                <p><strong>Status:</strong> {group.status}</p>
                {group.vendor_name && (
                  <p><strong>Vendor:</strong> {group.vendor_name}</p>
                )}
                <p><strong>Created:</strong> {new Date(group.created_at).toLocaleDateString()}</p>
                {group.participants && group.participants.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <p><strong>Current Members:</strong></p>
                    <div style={{ marginLeft: '15px' }}>
                      {group.participants.map((participant) => (
                        <div key={participant.id} style={{ fontSize: '14px', color: '#666', marginBottom: '3px' }}>
                          {participant.name} ({participant.email})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {group.time_slots && group.time_slots.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <p><strong>Available Time Slots:</strong></p>
                    <div style={{ marginLeft: '15px' }}>
                      {group.time_slots.map((slot, index) => (
                        <div key={index} style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                          {new Date(slot.start_date).toLocaleDateString()} - {new Date(slot.end_date).toLocaleDateString()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {group.created_by !== user?.id && (
                  <div style={{ marginTop: '10px' }}>
                    {(group.current_participants || 0) >= group.max_participants ? (
                      <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Group Full</span>
                    ) : (
                      <button
                        className="button"
                        onClick={() => handleJoinGroup(group.id)}
                      >
                        Join Group ({(group.current_participants || 0)}/{group.max_participants})
                      </button>
                    )}
                  </div>
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