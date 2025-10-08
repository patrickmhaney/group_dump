import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

interface PlatformOverview {
  total_users: number;
  renter_users: number;
  company_users: number;
  total_groups: number;
  forming_groups: number;
  active_groups: number;
  completed_groups: number;
  total_revenue: number;
  active_subscriptions: number;
}

interface UserListItem {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  user_type: string;
  created_at: string;
}

interface CompanyListItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  city: string;
  state: string;
  zip_code: string;
  website: string;
  created_at: string;
}

const Admin: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.email !== 'service.account.dc@groupdump.com') {
      navigate('/');
      return;
    }

    fetchAllData();
  }, [user, navigate]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewRes, usersRes, companiesRes] = await Promise.all([
        axios.get('/admin/platform-overview'),
        axios.get('/admin/users'),
        axios.get('/admin/companies')
      ]);
      setOverview(overviewRes.data);
      setUsers(usersRes.data);
      setCompanies(companiesRes.data);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError('Failed to load admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#dc3545' }}>{error}</p>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '2px solid #28a745',
        paddingBottom: '15px'
      }}>
        <h1 style={{ margin: 0, color: '#2c3e50' }}>GroupDump Admin Dashboard</h1>
        <div>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Back to Site
          </button>
          <button
            onClick={logout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Platform Overview Cards */}
      <h2 style={{ color: '#495057', marginBottom: '20px' }}>Platform Overview</h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {/* Total Users Card */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '8px' }}>TOTAL USERS</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
            {overview.total_users}
          </div>
          <div style={{ fontSize: '13px', color: '#6c757d' }}>
            <span style={{ color: '#28a745' }}>{overview.renter_users} renters</span>
            {' • '}
            <span style={{ color: '#007bff' }}>{overview.company_users} companies</span>
          </div>
        </div>

        {/* Total Groups Card */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '8px' }}>TOTAL GROUPS</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
            {overview.total_groups}
          </div>
          <div style={{ fontSize: '13px', color: '#6c757d' }}>
            <span style={{ color: '#ffc107' }}>{overview.forming_groups} forming</span>
            {' • '}
            <span style={{ color: '#28a745' }}>{overview.active_groups} active</span>
            {' • '}
            <span style={{ color: '#6c757d' }}>{overview.completed_groups} completed</span>
          </div>
        </div>

        {/* Total Revenue Card */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '8px' }}>TOTAL REVENUE</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745', marginBottom: '10px' }}>
            ${overview.total_revenue.toFixed(2)}
          </div>
          <div style={{ fontSize: '13px', color: '#6c757d' }}>
            Subscriptions + Commissions
          </div>
        </div>

        {/* Active Subscriptions Card */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '8px' }}>ACTIVE SUBSCRIPTIONS</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff', marginBottom: '10px' }}>
            {overview.active_subscriptions}
          </div>
          <div style={{ fontSize: '13px', color: '#6c757d' }}>
            Vendor monthly subscriptions
          </div>
        </div>
      </div>

      {/* Users Section */}
      <h2 style={{ color: '#495057', marginBottom: '20px', marginTop: '40px' }}>Users by Location</h2>
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '40px',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>City</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>State</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>Phone</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontSize: '14px' }}>{u.name}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{u.email}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  <span style={{
                    backgroundColor: u.user_type === 'renter' ? '#d4edda' : '#d1ecf1',
                    color: u.user_type === 'renter' ? '#155724' : '#0c5460',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {u.user_type}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{u.city || '-'}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{u.state || '-'}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{u.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
            No users found
          </div>
        )}
      </div>

      {/* Companies Section */}
      <h2 style={{ color: '#495057', marginBottom: '20px' }}>Companies by Location</h2>
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>City</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>State</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>Phone</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: '#495057' }}>Website</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontSize: '14px' }}>{c.name}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{c.email || '-'}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{c.city}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{c.state}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{c.phone || '-'}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  {c.website ? (
                    <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                      Link
                    </a>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
            No companies found
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
