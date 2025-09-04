import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

interface DumpsterSize {
  cubic_yards: string;
  dimensions: string;
  starting_price: string;
  starting_tonnage: string;
  per_ton_overage_price: string;
  additional_day_price: string;
}

interface Company {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
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

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
              required
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
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
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
                      required
                    />
                    <input
                      type="text"
                      placeholder="Starting Price ($)"
                      value={dumpsterSize.starting_price}
                      onChange={(e) => handleDumpsterSizeChange(index, 'starting_price', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Starting Tonnage"
                      value={dumpsterSize.starting_tonnage}
                      onChange={(e) => handleDumpsterSizeChange(index, 'starting_tonnage', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Per Ton Overage Price ($)"
                      value={dumpsterSize.per_ton_overage_price}
                      onChange={(e) => handleDumpsterSizeChange(index, 'per_ton_overage_price', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Additional Day Price ($)"
                      value={dumpsterSize.additional_day_price}
                      onChange={(e) => handleDumpsterSizeChange(index, 'additional_day_price', e.target.value)}
                      required
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
                {company.website && (
                  <p><strong>Website:</strong> <a href={company.website} target="_blank" rel="noopener noreferrer">{company.website}</a></p>
                )}
                <p><strong>Service Areas:</strong> {company.service_areas}</p>
                {company.rating > 0 && (
                  <p><strong>Rating:</strong> {company.rating.toFixed(1)}/5.0</p>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
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
  );
};

export default Companies;