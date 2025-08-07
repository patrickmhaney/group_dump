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
}

interface Rental {
  id: number;
  group_id: number;
  company_id: number;
  size: string;
  duration: number;
  total_cost: number;
  delivery_date: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [groupsResponse, rentalsResponse] = await Promise.all([
        axios.get('/groups'),
        axios.get('/rentals')
      ]);
      
      setGroups(groupsResponse.data);
      setRentals(rentalsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      
      <div className="card">
        <h2>Quick Stats</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h3>{groups.length}</h3>
            <p>Available Groups</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3>{rentals.length}</h3>
            <p>Your Rentals</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Recent Groups</h2>
        {groups.length === 0 ? (
          <p>No groups available. Create one to get started!</p>
        ) : (
          <div className="group-list">
            {groups.slice(0, 3).map((group) => (
              <div key={group.id} className="group-item">
                <h3>{group.name}</h3>
                <p><strong>Address:</strong> {group.address}</p>
                <p><strong>Max Participants:</strong> {group.max_participants}</p>
                <p><strong>Status:</strong> {group.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Your Rentals</h2>
        {rentals.length === 0 ? (
          <p>No rentals yet. Join a group and book a dumpster!</p>
        ) : (
          <div>
            {rentals.map((rental) => (
              <div key={rental.id} className="group-item">
                <h3>Rental #{rental.id}</h3>
                <p><strong>Size:</strong> {rental.size}</p>
                <p><strong>Duration:</strong> {rental.duration} days</p>
                <p><strong>Total Cost:</strong> ${rental.total_cost}</p>
                <p><strong>Delivery Date:</strong> {new Date(rental.delivery_date).toLocaleDateString()}</p>
                <p><strong>Status:</strong> {rental.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;