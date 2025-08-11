import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

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

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    service_areas: '',
    pricing_tiers: ''
  });
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/companies');
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/companies', formData);
      setCompanies([response.data, ...companies]);
      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        service_areas: '',
        pricing_tiers: ''
      });
      setMessage('Company registered successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Error registering company');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Welcome, {user?.name}!</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : 'Register Company'}
          </button>
          <button
            className="button button-secondary"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>

      {message && (
        <div className={message.includes('Error') ? 'error' : 'success'}>
          {message}
        </div>
      )}

      {showCreateForm && (
        <div className="card">
          <h2>Register New Company</h2>
          <form onSubmit={handleCreateCompany} className="form">
            <input
              type="text"
              name="name"
              placeholder="Company Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              value={formData.phone}
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
            <textarea
              name="service_areas"
              placeholder="Service Areas (comma separated)"
              value={formData.service_areas}
              onChange={handleChange}
              rows={3}
              required
            />
            <textarea
              name="pricing_tiers"
              placeholder="Pricing Information"
              value={formData.pricing_tiers}
              onChange={handleChange}
              rows={3}
              required
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="button">Register Company</button>
              <button type="button" className="button button-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Available Companies</h2>
        {companies.length === 0 ? (
          <p>No companies registered yet. Be the first to register!</p>
        ) : (
          <div className="company-list">
            {companies.map((company) => (
              <div key={company.id} className="company-item">
                <h3>{company.name}</h3>
                <p><strong>Email:</strong> {company.email}</p>
                <p><strong>Phone:</strong> {company.phone}</p>
                <p><strong>Address:</strong> {company.address}</p>
                <p><strong>Service Areas:</strong> {company.service_areas}</p>
                <p><strong>Pricing:</strong> {company.pricing_tiers}</p>
                {company.rating > 0 && (
                  <p><strong>Rating:</strong> {company.rating.toFixed(1)}/5.0</p>
                )}
                <button className="button">Contact Company</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Companies;