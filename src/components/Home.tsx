import React, { useState, useContext } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App.tsx';

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
  google_place_id?: string;
  google_rating?: number;
  google_user_ratings_total?: number;
}

interface DumpsterSize {
  cubic_yards: string;
  dimensions?: string;
  starting_price?: string;
  starting_tonnage?: string;
  per_ton_overage_price?: string;
  additional_day_price?: string;
}

const Home: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Company browsing state
  const [zipCode, setZipCode] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [comparisonSize, setComparisonSize] = useState('20');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const tokenResponse = await axios.post('/token', formData);
      const userResponse = await axios.get('/users/me', {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
      });

      login(tokenResponse.data.access_token, userResponse.data);
      setShowLoginModal(false); // Close modal on successful login

      // Check for redirect parameter
      const redirectPath = searchParams.get('redirect');
      if (redirectPath) {
        navigate(redirectPath);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleZipCodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipCode || zipCode.length !== 5) {
      setCompaniesError('Please enter a valid 5-digit ZIP code');
      return;
    }

    setLoadingCompanies(true);
    setCompaniesError('');

    try {
      const response = await axios.get('/companies/public/by-zip', {
        params: { zip_code: zipCode }
      });
      setCompanies(response.data);
      if (response.data.length === 0) {
        setCompaniesError('No dumpster companies found within 50 miles of this ZIP code. Try a different area.');
      }
    } catch (err: any) {
      setCompaniesError('Failed to fetch companies. Please try again.');
      console.error('Error fetching companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center'
    }}>
      {/* Group Dump Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        width: '100%',
        maxWidth: '500px'
      }}>
        <h2 style={{
          fontSize: '1.75em',
          margin: '0',
          color: '#2c3e50',
          fontWeight: '600'
        }}>
          Group Dump
        </h2>
      </div>

      {/* Browse Dumpster Companies Section */}
      <div style={{
        padding: '30px 0',
        marginBottom: '10px',
        width: '100%',
        maxWidth: '900px'
      }}>
        <p style={{
          color: '#6c757d',
          margin: '0 0 25px 0',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          textAlign: 'center'
        }}>
          Enter your ZIP code to start browsing dumpster rental companies and compare services.
        </p>

        {/* ZIP Code Search Form */}
        <form onSubmit={handleZipCodeSearch} style={{ marginBottom: '25px' }}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 200px' }}>
              <input
                type="text"
                placeholder="Enter ZIP Code"
                value={zipCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setZipCode(value);
                }}
                maxLength={5}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loadingCompanies || zipCode.length !== 5}
              style={{
                padding: '12px 24px',
                background: loadingCompanies || zipCode.length !== 5
                  ? '#6c757d'
                  : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loadingCompanies || zipCode.length !== 5 ? 'not-allowed' : 'pointer',
                opacity: loadingCompanies || zipCode.length !== 5 ? 0.7 : 1
              }}
            >
              {loadingCompanies ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        <p style={{
          color: '#6c757d',
          margin: '0 0 25px 0',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          textAlign: 'center'
        }}>
          <span
            onClick={() => setShowLoginModal(true)}
            style={{
              color: '#007bff',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: '600'
            }}
          >
            Login
          </span>
          {' '}to create and manage your group.
        </p>

        {companiesError && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            color: '#721c24',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {companiesError}
          </div>
        )}

        {/* Companies Display */}
        {companies.length > 0 && (
          <div>
            {/* Dumpster Size Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#2c3e50' }}>
                Select Dumpster Size to Compare:
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['10', '15', '20', '30', '40'].map(size => (
                  <button
                    key={size}
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
                      transition: 'all 0.3s ease',
                      minWidth: '85px'
                    }}
                  >
                    {size} Yards
                  </button>
                ))}
              </div>
            </div>

            {/* Companies Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '15px'
            }}>
              {companies.map(company => {
                const matchingSize = company.dumpster_sizes?.find(size => size.cubic_yards === comparisonSize);
                const isSelected = selectedCompanyId === company.id;
                return (
                  <div
                    key={company.id}
                    onClick={() => setSelectedCompanyId(isSelected ? null : company.id)}
                    style={{
                      border: `2px solid ${isSelected ? '#007bff' : '#e9ecef'}`,
                      borderRadius: '8px',
                      padding: '15px',
                      backgroundColor: isSelected ? '#f8f9ff' : '#ffffff',
                      boxShadow: isSelected ? '0 4px 8px rgba(0,123,255,0.25)' : '0 2px 4px rgba(0,0,0,0.05)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#007bff';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,123,255,0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e9ecef';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                      }
                    }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <h4 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '16px', fontWeight: 'bold' }}>
                        {company.name}
                      </h4>
                      <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#666' }}>
                        {company.city}, {company.state}
                      </p>
                      {company.google_rating && company.google_rating > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f4b400' }}>
                            ⭐ {company.google_rating.toFixed(1)}
                          </span>
                          <span style={{ color: '#666', fontSize: '12px' }}>
                            ({company.google_user_ratings_total} reviews)
                          </span>
                        </div>
                      )}
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#007bff',
                            fontSize: '12px',
                            textDecoration: 'none',
                            display: 'inline-block',
                            marginTop: '5px'
                          }}
                        >
                          Visit Website →
                        </a>
                      )}
                    </div>

                    {matchingSize ? (
                      <div>
                        {matchingSize.starting_price ? (
                          <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#28a745',
                            marginBottom: '8px'
                          }}>
                            {matchingSize.starting_price.startsWith('$') ? matchingSize.starting_price : `$${matchingSize.starting_price}`}
                          </div>
                        ) : (
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontStyle: 'italic', color: '#666', fontWeight: 'bold' }}>
                            Price not available - contact for quote
                          </p>
                        )}
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                          {comparisonSize} yards • {matchingSize.starting_tonnage || 'NA'} tons included
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {matchingSize.per_ton_overage_price ? `+${matchingSize.per_ton_overage_price.startsWith('$') ? matchingSize.per_ton_overage_price : `$${matchingSize.per_ton_overage_price}`}/extra ton` : '+NA/extra ton'}
                          {' • '}
                          {matchingSize.additional_day_price ? `+${matchingSize.additional_day_price.startsWith('$') ? matchingSize.additional_day_price : `$${matchingSize.additional_day_price}`}/extra day` : '+NA/extra day'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#666', fontStyle: 'italic', fontSize: '14px', padding: '20px 0' }}>
                        {comparisonSize} yard size not available from this provider
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Service Details Section - Shows when a company is selected */}
            {selectedCompanyId !== null && (() => {
              const selectedCompany = companies.find(c => c.id === selectedCompanyId);
              if (!selectedCompany) return null;

              return (
                <div style={{
                  marginTop: '20px',
                  padding: '25px',
                  border: '2px solid #28a745',
                  borderRadius: '8px',
                  backgroundColor: '#f8fff8'
                }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginTop: '0', color: '#28a745', marginBottom: '10px' }}>
                      Service Levels from {selectedCompany.name}
                    </h3>
                    {selectedCompany.google_rating && selectedCompany.google_rating > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f4b400' }}>
                          ⭐ {selectedCompany.google_rating.toFixed(1)}
                        </span>
                        <span style={{ color: '#666', fontSize: '13px' }}>
                          ({selectedCompany.google_user_ratings_total} reviews on Google)
                        </span>
                      </div>
                    )}
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                      {selectedCompany.city}, {selectedCompany.state}
                      {selectedCompany.website && (
                        <>
                          {' • '}
                          <a
                            href={selectedCompany.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#007bff', textDecoration: 'none' }}
                          >
                            Visit Website →
                          </a>
                        </>
                      )}
                    </p>
                  </div>

                  {!selectedCompany.dumpster_sizes?.length ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                      This company hasn't configured their dumpster sizes yet.
                    </p>
                  ) : (
                    <>
                      <label style={{ display: 'block', fontSize: '16px', marginBottom: '15px', fontWeight: 'bold', color: '#155724' }}>
                        Available Dumpster Sizes:
                      </label>
                      <div style={{ display: 'grid', gap: '15px' }}>
                        {selectedCompany.dumpster_sizes.map((size, index) => (
                          <div
                            key={index}
                            style={{
                              border: '3px solid #dee2e6',
                              borderRadius: '12px',
                              padding: '20px',
                              backgroundColor: '#ffffff',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                              <div>
                                <h4 style={{ margin: '0 0 5px 0', color: '#155724', fontSize: '20px', fontWeight: 'bold' }}>
                                  {size.cubic_yards} Cubic Yards
                                </h4>
                                {size.dimensions && (
                                  <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                                    Dimensions: {size.dimensions}
                                  </p>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                {size.starting_price ? (
                                  <>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                                      ${size.starting_price}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                      starting price
                                    </div>
                                  </>
                                ) : (
                                  <p style={{ margin: '0', fontSize: '12px', fontStyle: 'italic', color: '#666', fontWeight: 'bold' }}>
                                    Price not available. Provider may require quote.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                              gap: '10px',
                              marginTop: '15px',
                              paddingTop: '15px',
                              borderTop: '1px solid #e9ecef'
                            }}>
                              <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
                                  {size.starting_tonnage || 'NA'} tons
                                </div>
                                <div style={{ fontSize: '11px', color: '#6c757d' }}>included</div>
                              </div>
                              <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
                                  {size.per_ton_overage_price ? `$${size.per_ton_overage_price}` : 'NA'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6c757d' }}>per extra ton</div>
                              </div>
                              <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
                                  {size.additional_day_price ? `$${size.additional_day_price}` : 'NA'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6c757d' }}>per extra day</div>
                              </div>
                              <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#e8f5e8', borderRadius: '6px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#155724' }}>
                                  7 days
                                </div>
                                <div style={{ fontSize: '11px', color: '#155724' }}>rental period</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{
                        padding: '12px 15px',
                        backgroundColor: '#f0f8ff',
                        border: '1px solid #b8d4f1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#1e4d7b',
                        marginTop: '15px'
                      }}>
                        💡 <strong>NA</strong> = Information not given by provider or available on their company website. For overage charges, this sometimes indicates a flat rate. Check provider website directly if curious to learn more.
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0', fontSize: '13px', color: '#495057' }}>
                💡 <strong>NA</strong> = Information not available. Contact provider directly for details.
                <br />
                <strong>Ready to book?</strong> <Link to="/register" style={{ color: '#007bff', fontWeight: '600' }}>Create an account</Link> to start a group rental and split costs with neighbors!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div
          onClick={() => setShowLoginModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '25px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '2px solid #dee2e6',
              width: '100%',
              maxWidth: '500px',
              margin: '20px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5em' }}>Sign In</h2>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <p style={{
                color: '#6c757d',
                margin: '0',
                fontSize: '1rem'
              }}>
                Sign in to lighten your load
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              width: '100%'
            }}>
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: '2px solid #e9ecef',
                    borderRadius: '12px',
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#007bff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e9ecef';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: '2px solid #e9ecef',
                    borderRadius: '12px',
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#007bff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e9ecef';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {error && (
                <div style={{
                  color: '#dc3545',
                  backgroundColor: '#f8d7da',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #f5c6cb',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading
                    ? '#6c757d'
                    : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  boxShadow: loading
                    ? 'none'
                    : '0 4px 12px rgba(0, 123, 255, 0.3)',
                  opacity: loading ? '0.7' : '1'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
                  }
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e9ecef'
            }}>
              <p style={{
                color: '#6c757d',
                margin: '0',
                fontSize: '15px'
              }}>
                Don't have an account?{' '}
                <Link
                  to={`/register${searchParams.get('redirect') ? `?redirect=${searchParams.get('redirect')}` : ''}`}
                  style={{
                    color: '#007bff',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Create one here
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{
        padding: '10px 30px 30px 30px',
        marginBottom: '30px',
        width: '100%',
        maxWidth: '900px'
      }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '12px', textAlign: 'center', fontSize: '1.5em', fontWeight: '600' }}>
          How It Works
        </h2>
        <p style={{
          color: '#6c757d',
          margin: '0 0 25px 0',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          textAlign: 'center'
        }}>
          Browse local companies to find the best price and service fit • Split dumpster rental costs with your neighbors • Coordinate and book service • Dump your junk
        </p>
        <h3 style={{
          color: '#2c3e50',
          margin: '0 0 20px 0',
          fontSize: '1.2em',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          Who's Involved and What Do They Need To Do
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '25px',
          marginBottom: '30px'
        }}>
          {/* Flow 1: Create a Group */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '2.5em',
                margin: '0 auto 10px auto'
              }}>
                👤
              </div>
              <h3 style={{ color: '#2c3e50', margin: '0', fontSize: '1.2em' }}>Group Creator</h3>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>1.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Create a group</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>2.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Compare vendor prices and services</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>3.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Invite neighbors</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>4.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Book service</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>5.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Get reimbursed</span>
              </div>
              <div style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>6.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Discard your junk</span>
              </div>
            </div>
          </div>

          {/* Flow 2: Join a Group */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '2.5em',
                margin: '0 auto 10px auto'
              }}>
                👥
              </div>
              <h3 style={{ color: '#2c3e50', margin: '0', fontSize: '1.2em' }}>Group Member</h3>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>1.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Join a group</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>2.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Reimburse your neighbor</span>
              </div>
              <div style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>3.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Discard your junk</span>
              </div>
            </div>
          </div>

          {/* Flow 3: Dumpster Provider */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '8px',
            border: '2px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '2.5em',
                margin: '0 auto 10px auto'
              }}>
                🚚
              </div>
              <h3 style={{ color: '#2c3e50', margin: '0', fontSize: '1.2em' }}>Dumpster Provider</h3>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>1.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Register as a verified provider</span>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>2.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Provide service and pricing details</span>
              </div>
              <div style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: '#2c3e50', fontWeight: 'bold', marginRight: '8px', minWidth: '20px' }}>3.</span>
                <span style={{ color: '#2c3e50', fontSize: '0.9em' }}>Help people discard their junk</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer style={{
        width: '100%',
        maxWidth: '900px',
        borderTop: '1px solid #dee2e6',
        paddingTop: '30px',
        marginTop: '20px',
        paddingBottom: '30px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '30px',
          marginBottom: '25px'
        }}>
          {/* About */}
          <div>
            <h4 style={{ color: '#2c3e50', marginBottom: '12px', fontSize: '1em', fontWeight: '600' }}>
              About
            </h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>About Us</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>How It Works</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Pricing</a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ color: '#2c3e50', marginBottom: '12px', fontSize: '1em', fontWeight: '600' }}>
              Support
            </h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Contact Us</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>FAQ</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Help Center</a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ color: '#2c3e50', marginBottom: '12px', fontSize: '1em', fontWeight: '600' }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Privacy Policy</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Terms of Service</a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '0.9em' }}>Cookie Policy</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media */}
        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          paddingBottom: '20px',
          borderTop: '1px solid #dee2e6'
        }}>
          <h4 style={{ color: '#2c3e50', marginBottom: '12px', fontSize: '1em', fontWeight: '600' }}>
            Follow Us
          </h4>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '1.5em' }}>
              📘
            </a>
            <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '1.5em' }}>
              🐦
            </a>
            <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '1.5em' }}>
              📷
            </a>
            <a href="#" style={{ color: '#6c757d', textDecoration: 'none', fontSize: '1.5em' }}>
              💼
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px solid #dee2e6'
        }}>
          <p style={{ color: '#6c757d', margin: '0', fontSize: '0.85em' }}>
            © 2025 Group Dump. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
