import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

interface DumpsterSize {
  cubic_yards: string;
  dimensions?: string;
  starting_price?: string;
  starting_tonnage?: string;
  per_ton_overage_price?: string;
  additional_day_price?: string;
}

interface Company {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  website?: string;
  service_areas: string;
  dumpster_sizes: DumpsterSize[];
  rating: number;
}

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [message, setMessage] = useState('');
  const [proximityFilter, setProximityFilter] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    website: '',
    service_areas: '',
    dumpster_sizes: [{
      cubic_yards: '',
      dimensions: '',
      starting_price: '',
      starting_tonnage: '',
      per_ton_overage_price: '',
      additional_day_price: ''
    }]
  });
  const { user, logout } = useContext(AuthContext);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompanies();
  }, [proximityFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          proximity_filter: proximityFilter
        }
      });
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
      const response = await axios.post('/companies', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCompanies([response.data, ...companies]);
      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        website: '',
        service_areas: '',
        dumpster_sizes: [{
          cubic_yards: '',
          dimensions: '',
          starting_price: '',
          starting_tonnage: '',
          per_ton_overage_price: '',
          additional_day_price: ''
        }]
      });
      setMessage('Company registered successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Error registering company';
      if (error.response?.data) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.msg) return err.msg;
            return JSON.stringify(err);
          }).join(', ');
        } else if (error.response.data.detail) {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    try {
      const response = await axios.put(`/companies/${editingCompany.id}`, formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCompanies(companies.map(company => 
        company.id === editingCompany.id ? response.data : company
      ));
      setEditingCompany(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        website: '',
        service_areas: '',
        dumpster_sizes: [{
          cubic_yards: '',
          dimensions: '',
          starting_price: '',
          starting_tonnage: '',
          per_ton_overage_price: '',
          additional_day_price: ''
        }]
      });
      setMessage('Company updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Error updating company';
      if (error.response?.data) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.msg) return err.msg;
            return JSON.stringify(err);
          }).join(', ');
        } else if (error.response.data.detail) {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const startEditing = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      zip_code: company.zip_code,
      website: company.website || '',
      service_areas: company.service_areas,
      dumpster_sizes: company.dumpster_sizes
    });
    setShowCreateForm(false);
  };

  const cancelEditing = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      website: '',
      service_areas: '',
      dumpster_sizes: [{
        cubic_yards: '',
        dimensions: '',
        starting_price: '',
        starting_tonnage: '',
        per_ton_overage_price: '',
        additional_day_price: ''
      }]
    });
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!window.confirm(`Are you sure you want to delete "${company.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await axios.delete(`/companies/${company.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCompanies(companies.filter(c => c.id !== company.id));
      setMessage('Company deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Delete error:', error);
      let errorMessage = 'Error deleting company';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      setMessage(errorMessage);
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

  const handleDumpsterSizeChange = (index: number, field: string, value: string) => {
    const newDumpsterSizes = [...formData.dumpster_sizes];
    newDumpsterSizes[index] = {
      ...newDumpsterSizes[index],
      [field]: value
    };
    setFormData({
      ...formData,
      dumpster_sizes: newDumpsterSizes
    });
  };

  const addDumpsterSize = () => {
    setFormData({
      ...formData,
      dumpster_sizes: [...formData.dumpster_sizes, {
        cubic_yards: '',
        dimensions: '',
        starting_price: '',
        starting_tonnage: '',
        per_ton_overage_price: '',
        additional_day_price: ''
      }]
    });
  };

  const removeDumpsterSize = (index: number) => {
    if (formData.dumpster_sizes.length > 1) {
      const newDumpsterSizes = formData.dumpster_sizes.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        dumpster_sizes: newDumpsterSizes
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Site Title - Top Left */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#000',
          margin: 0,
          padding: '8px'
        }}>
          Group Dump
        </h1>
      </div>

      {/* User Area - Top Right */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        zIndex: 1000
      }}>
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {user?.name?.split(' ')[0] || 'User'}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ marginLeft: '6px' }}
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </button>

          {showUserDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              minWidth: '140px',
              zIndex: 1001
            }}>
              <Link
                to="/profile"
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: '#333',
                  textDecoration: 'none',
                  borderBottom: '1px solid #eee'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => setShowUserDropdown(false)}
              >
                Edit Profile
              </Link>
              <button
                onClick={() => {
                  logout();
                  setShowUserDropdown(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  color: '#333',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px'
        }}>
          {user?.user_type === 'renter' && (
            <button
              className={`button ${proximityFilter ? '' : 'button-secondary'}`}
              onClick={() => setProximityFilter(!proximityFilter)}
              style={{
                fontSize: '14px',
                padding: '8px 16px',
                minHeight: 'auto'
              }}
            >
              {proximityFilter ? 'Show All Companies' : 'Show Nearby Only'}
            </button>
          )}
          {user?.user_type === 'company' && (
            <button
              className="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                fontSize: '14px',
                padding: '8px 16px',
                minHeight: 'auto'
              }}
            >
              {showCreateForm ? 'Cancel' : 'Register Company'}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: '80px' }}>
      {message && (
        <div className={message.includes('Error') ? 'error' : 'success'}>
          {message}
        </div>
      )}

      {(showCreateForm || editingCompany) && (
        <div className="card">
          <h2>{editingCompany ? 'Edit Company' : 'Register New Company'}</h2>
          <form onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany} className="form">
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
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              value={formData.phone}
              onChange={handleChange}
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
              type="text"
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="state"
              placeholder="State"
              value={formData.state}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="zip_code"
              placeholder="Zip Code"
              value={formData.zip_code}
              onChange={handleChange}
              required
            />
            <input
              type="url"
              name="website"
              placeholder="Website (optional)"
              value={formData.website}
              onChange={handleChange}
            />
            <textarea
              name="service_areas"
              placeholder="Service Areas (comma separated)"
              value={formData.service_areas}
              onChange={handleChange}
              rows={3}
            />
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Dumpster Size Options</h3>
                <button 
                  type="button" 
                  className="button" 
                  onClick={addDumpsterSize}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Add Size Option
                </button>
              </div>
              
              {formData.dumpster_sizes.map((dumpsterSize, index) => (
                <div key={index} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '4px', 
                  padding: '15px', 
                  marginBottom: '15px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0 }}>Size Option {index + 1}</h4>
                    {formData.dumpster_sizes.length > 1 && (
                      <button 
                        type="button" 
                        className="button button-secondary" 
                        onClick={() => removeDumpsterSize(index)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Cubic Yards"
                      value={dumpsterSize.cubic_yards}
                      onChange={(e) => handleDumpsterSizeChange(index, 'cubic_yards', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Dimensions (e.g., 12' X 8' X 4')"
                      value={dumpsterSize.dimensions}
                      onChange={(e) => handleDumpsterSizeChange(index, 'dimensions', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Starting Price ($)"
                      value={dumpsterSize.starting_price}
                      onChange={(e) => handleDumpsterSizeChange(index, 'starting_price', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Starting Tonnage"
                      value={dumpsterSize.starting_tonnage}
                      onChange={(e) => handleDumpsterSizeChange(index, 'starting_tonnage', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Per Ton Overage Price ($)"
                      value={dumpsterSize.per_ton_overage_price}
                      onChange={(e) => handleDumpsterSizeChange(index, 'per_ton_overage_price', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Additional Day Price ($)"
                      value={dumpsterSize.additional_day_price}
                      onChange={(e) => handleDumpsterSizeChange(index, 'additional_day_price', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="button">
                {editingCompany ? 'Update Company' : 'Register Company'}
              </button>
              <button type="button" className="button button-secondary" onClick={editingCompany ? cancelEditing : () => setShowCreateForm(false)}>
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
                <p><strong>City:</strong> {company.city}</p>
                <p><strong>State:</strong> {company.state}</p>
                <p><strong>Zip Code:</strong> {company.zip_code}</p>
                {company.website && (
                  <p><strong>Website:</strong> <a href={company.website} target="_blank" rel="noopener noreferrer">{company.website}</a></p>
                )}
                <p><strong>Service Areas:</strong> {company.service_areas}</p>
                {company.rating > 0 && (
                  <p><strong>Rating:</strong> {company.rating.toFixed(1)}/5.0</p>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '15px', flexWrap: 'wrap' }}>
                  <button className="button">Contact Company</button>
                  {user?.user_type === 'company' && (
                    <>
                      <button 
                        className="button button-secondary"
                        onClick={() => startEditing(company)}
                      >
                        Edit
                      </button>
                      <button 
                        className="button"
                        style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
                        onClick={() => handleDeleteCompany(company)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Companies;