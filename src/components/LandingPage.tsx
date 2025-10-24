import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CompanyList, { Company } from './CompanyList.tsx';
import { savePreselection } from '../utils/preselection.ts';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [zipCode, setZipCode] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [comparisonSize, setComparisonSize] = useState('20'); // Default to 20 yards

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate zipcode
    if (!zipCode || zipCode.length !== 5 || !/^\d{5}$/.test(zipCode)) {
      setError('Please enter a valid 5-digit US ZIP code');
      return;
    }

    setLoading(true);
    setSearchPerformed(true);

    try {
      const response = await axios.get('/companies/public', {
        params: { zip_code: zipCode }
      });

      setCompanies(response.data);

      if (response.data.length === 0) {
        setError('No dumpster companies found within 50 miles of this ZIP code. Please try a different area.');
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Invalid ZIP code');
      } else if (err.response?.status === 429) {
        setError('Too many requests. Please try again in a few minutes.');
      } else {
        setError('Failed to load companies. Please try again.');
      }
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (companyId: number) => {
    // Save preselection to localStorage
    savePreselection({
      preselectedCompanyId: companyId,
      zipCode: zipCode
    });

    // Redirect to registration
    navigate('/register');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Hero Section */}
      <div style={{
        backgroundColor: '#007bff',
        color: 'white',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '20px',
          marginTop: 0
        }}>
          Compare Dumpster Rental Prices
        </h1>
        <p style={{
          fontSize: '24px',
          marginBottom: '40px',
          opacity: 0.9
        }}>
          Find the best deal in your area - No login required
        </p>

        {/* Zipcode Search Form */}
        <form onSubmit={handleSearch} style={{
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          gap: '10px',
          justifyContent: 'center'
        }}>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="Enter ZIP Code (e.g., 90210)"
            maxLength={5}
            style={{
              padding: '16px 24px',
              fontSize: '18px',
              border: 'none',
              borderRadius: '8px',
              flex: '1',
              maxWidth: '300px'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#218838';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#28a745';
            }}
          >
            {loading ? 'Searching...' : 'See Companies'}
          </button>
        </form>

        {error && (
          <p style={{
            color: '#fff',
            backgroundColor: 'rgba(220, 53, 69, 0.8)',
            padding: '12px 20px',
            borderRadius: '6px',
            marginTop: '20px',
            maxWidth: '600px',
            margin: '20px auto 0'
          }}>
            {error}
          </p>
        )}
      </div>

      {/* Results Section */}
      {searchPerformed && !loading && companies.length > 0 && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 20px'
        }}>
          <h2 style={{
            fontSize: '32px',
            marginBottom: '10px',
            color: '#333'
          }}>
            Available Dumpster Companies
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '30px'
          }}>
            Found {companies.length} companies serving ZIP code {zipCode}. Select a size to compare pricing:
          </p>

          {/* Size Selector */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333' }}>
              Select Dumpster Size to Compare
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '10px',
              maxWidth: '800px'
            }}>
              {['10', '15', '20', '25', '30', '40'].map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setComparisonSize(size)}
                  style={{
                    padding: '12px 16px',
                    border: `2px solid ${comparisonSize === size ? '#007bff' : '#dee2e6'}`,
                    borderRadius: '6px',
                    backgroundColor: comparisonSize === size ? '#f8f9ff' : '#ffffff',
                    color: comparisonSize === size ? '#007bff' : '#666',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (comparisonSize !== size) {
                      e.currentTarget.style.borderColor = '#007bff';
                      e.currentTarget.style.backgroundColor = '#f8f9ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (comparisonSize !== size) {
                      e.currentTarget.style.borderColor = '#dee2e6';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }
                  }}
                >
                  {size} Yards
                </button>
              ))}
            </div>
          </div>

          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '20px'
          }}>
            Click on a company to select them and continue to registration.
          </p>

          {/* Company List */}
          <CompanyList
            companies={companies}
            comparisonSize={comparisonSize}
            onCompanySelect={handleCompanySelect}
            showPreselectionBadge={false}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#666'
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '10px'
          }}>
            🔍 Searching for dumpster companies...
          </div>
          <p>Finding the best deals in your area</p>
        </div>
      )}

      {/* Empty State - Before Search */}
      {!searchPerformed && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#333' }}>
            How It Works
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px',
            textAlign: 'left'
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>1️⃣</div>
              <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#007bff' }}>
                Enter Your ZIP Code
              </h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                We'll find all dumpster companies serving your area within a 50-mile radius.
              </p>
            </div>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>2️⃣</div>
              <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#007bff' }}>
                Compare Prices
              </h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                See transparent pricing, ratings, and services from multiple providers side-by-side.
              </p>
            </div>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>3️⃣</div>
              <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#007bff' }}>
                Select & Save
              </h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Choose your provider, create a group, and split costs with neighbors to save even more.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
