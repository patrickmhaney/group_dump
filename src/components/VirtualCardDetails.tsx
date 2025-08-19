import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StripeCardElement from './StripeCardElement.tsx';
import { useCardSecurity, useSecurityMonitoring } from './CardSecurityProvider.tsx';

interface Group {
  id: number;
  name: string;
  address: string;
  virtual_card_id?: string;
  card_spending_limit?: number;
  card_status?: string;
  service_fee_collected?: number;
  total_collected_amount?: number;
  vendor_website?: string;
  vendor_name?: string;
}

interface CardTransaction {
  id: string;
  amount: number;
  merchant_name: string;
  status: string;
  created_at: string;
  authorization_code?: string;
}

interface VirtualCardDetailsProps {
  groupId: string;
}

const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';

export const VirtualCardDetails: React.FC<VirtualCardDetailsProps> = ({ groupId }) => {
  const [cardRevealed, setCardRevealed] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [cardFrozen, setCardFrozen] = useState(false);
  
  // Security hooks
  const security = useCardSecurity();
  const { logSecurityEvent } = useSecurityMonitoring(groupId);

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/groups/${groupId}/virtual-card-details`);
      setGroup(response.data);
      
      if (response.data.virtual_card_id) {
        fetchTransactions();
        checkCardStatus();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`/groups/${groupId}/card-transactions`);
      setTransactions(response.data);
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const checkCardStatus = async () => {
    try {
      const response = await axios.get(`/groups/${groupId}/card-status`);
      setCardFrozen(response.data.status === 'frozen');
    } catch (err: any) {
      console.error('Failed to check card status:', err);
    }
  };

  const handleRevealCard = async () => {
    setCardLoading(true);
    setError('');
    
    try {
      // Check if access is blocked due to too many attempts
      if (security.isAccessBlocked()) {
        const remainingAttempts = security.maxAccessAttempts - security.accessAttempts;
        throw new Error(`Too many failed access attempts. Please wait 30 minutes before trying again.`);
      }
      
      // Log security event
      logSecurityEvent('Card access attempt initiated');
      
      // Use security context for verification
      const accessGranted = await security.verifyCardAccess(groupId);
      
      if (accessGranted) {
        setCardRevealed(true);
        logSecurityEvent('Card access granted successfully');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Access denied. Only group creators can view card details.';
      setError(errorMessage);
      logSecurityEvent(`Card access denied: ${errorMessage}`);
    } finally {
      setCardLoading(false);
    }
  };

  const handleFreezeCard = async () => {
    try {
      const action = cardFrozen ? 'unfreeze' : 'freeze';
      
      // Log security event
      logSecurityEvent(`Card ${action} attempt initiated`);
      
      await axios.post(`/groups/${groupId}/card/${action}`);
      setCardFrozen(!cardFrozen);
      
      // Log successful action
      logSecurityEvent(`Card ${action}d successfully`);
      
      // Show success message
      const message = cardFrozen ? 'Card unfrozen successfully' : 'Card frozen successfully';
      setError(''); // Clear any existing errors
      // You could add a success state here if desired
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || `Failed to ${cardFrozen ? 'unfreeze' : 'freeze'} card`;
      setError(errorMessage);
      logSecurityEvent(`Card ${cardFrozen ? 'unfreeze' : 'freeze'} failed: ${errorMessage}`);
    }
  };

  const calculateRemainingBalance = () => {
    if (!group?.card_spending_limit) return 0;
    const totalSpent = transactions
      .filter(tx => tx.status === 'approved')
      .reduce((sum, tx) => sum + tx.amount, 0);
    return Math.max(0, group.card_spending_limit - totalSpent / 100); // Convert cents to dollars
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading virtual card details...</div>
      </div>
    );
  }

  if (!group?.virtual_card_id) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffeaa7', 
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>💳 Virtual Card Status</h3>
        <p style={{ color: '#856404', margin: 0 }}>
          Virtual card will be issued once the group is fully funded and payments are confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="virtual-card-container" style={{ margin: '20px 0' }}>
      {error && (
        <div style={{
          color: '#dc3545',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Security Status Indicator */}
      {security.isAccessBlocked() && (
        <div style={{
          color: '#721c24',
          backgroundColor: '#f8d7da',
          border: '2px solid #f5c6cb',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ marginRight: '8px', fontSize: '20px' }}>🔒</span>
            <strong>Security Lock Activated</strong>
          </div>
          <p style={{ margin: '0 0 8px 0' }}>
            Too many failed access attempts detected. Access to card details is temporarily blocked for security.
          </p>
          <p style={{ margin: '0', fontSize: '14px' }}>
            Please wait 30 minutes before attempting to access card details again.
          </p>
        </div>
      )}

      {security.accessAttempts > 0 && security.accessAttempts < security.maxAccessAttempts && (
        <div style={{
          color: '#856404',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>⚠️</span>
            <strong>Security Warning:</strong> {security.accessAttempts} failed access attempt{security.accessAttempts > 1 ? 's' : ''}. 
            {security.maxAccessAttempts - security.accessAttempts} attempt{security.maxAccessAttempts - security.accessAttempts > 1 ? 's' : ''} remaining before temporary lockout.
          </div>
        </div>
      )}

      <div className="card-header" style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9ff', 
        border: '2px solid #007bff', 
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#007bff' }}>💳 Your Group's Virtual Card</h3>
        <div className="funding-summary">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                {formatCurrency(group.total_collected_amount || 0)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Collected</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffc107' }}>
                {formatCurrency(group.service_fee_collected || 0)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Service Fee</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
                {formatCurrency(group.card_spending_limit || 0)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Available for Booking</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#17a2b8' }}>
                {formatCurrency(calculateRemainingBalance())}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Remaining Balance</div>
            </div>
          </div>
        </div>
      </div>

      {!cardRevealed ? (
        <div className="card-reveal-prompt" style={{
          textAlign: 'center',
          padding: '40px',
          border: '2px dashed #007bff',
          borderRadius: '12px',
          backgroundColor: '#f8f9ff'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔒</div>
            <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Secure Card Access</h4>
            <p style={{ color: '#666', margin: '0 0 20px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              Your virtual card details are securely protected. Click below to reveal card information for vendor booking.
            </p>
          </div>
          
          <button 
            onClick={handleRevealCard}
            disabled={cardLoading || security.isAccessBlocked()}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: security.isAccessBlocked() ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (cardLoading || security.isAccessBlocked()) ? 'not-allowed' : 'pointer',
              opacity: (cardLoading || security.isAccessBlocked()) ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (!cardLoading && !security.isAccessBlocked()) {
                e.currentTarget.style.backgroundColor = '#0056b3';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!cardLoading && !security.isAccessBlocked()) {
                e.currentTarget.style.backgroundColor = '#007bff';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
{cardLoading ? '🔄 Verifying Access...' : security.isAccessBlocked() ? '🔒 Access Blocked' : '🔓 Reveal Card Details for Booking'}
          </button>
          
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#e8f4fd',
            borderRadius: '6px',
            border: '1px solid #b8daff'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#004085' }}>
              <strong>🔒 Security Note:</strong> Card details will be shown securely using Stripe's PCI-compliant components. 
              Use the card immediately for vendor booking, then return here to monitor transactions.
            </p>
          </div>
        </div>
      ) : (
        <div className="secure-card-display">
          <div style={{
            padding: '20px',
            border: '2px solid #28a745',
            borderRadius: '12px',
            backgroundColor: '#f8fff8',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#155724' }}>🔓 Secure Card Details</h4>
            
            {/* Stripe PCI-compliant card element */}
            <StripeCardElement 
              cardId={group.virtual_card_id}
              onCardReady={() => {
                console.log('Card details loaded successfully');
              }}
              onError={(error) => {
                setError(`Card loading error: ${error}`);
              }}
            />
            
            <div className="booking-instructions" style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '6px',
              padding: '15px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>📋 Ready to Book!</h4>
              <ol style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
                <li>Copy the card details shown above</li>
                {group.vendor_website && (
                  <li>
                    Visit vendor website: {' '}
                    <a 
                      href={group.vendor_website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                      {group.vendor_name || 'Vendor Website'}
                    </a>
                  </li>
                )}
                <li>Complete booking using the virtual card details</li>
                <li>Card limit: <strong>{formatCurrency(group.card_spending_limit || 0)}</strong></li>
                <li>Return here to monitor transaction status</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {cardRevealed && (
        <div className="card-controls" style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <button
            onClick={handleFreezeCard}
            style={{
              padding: '12px 20px',
              backgroundColor: cardFrozen ? '#28a745' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {cardFrozen ? '🔓 Unfreeze Card' : '🔒 Freeze Card'}
          </button>
          
          <button
            onClick={fetchTransactions}
            style={{
              padding: '12px 20px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            🔄 Refresh Transactions
          </button>
        </div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div style={{
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h4 style={{ margin: 0, color: '#495057' }}>📊 Transaction History</h4>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {transactions.map(tx => (
              <div
                key={tx.id}
                style={{
                  padding: '15px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {tx.merchant_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {formatDate(tx.created_at)}
                    {tx.authorization_code && (
                      <span> • Auth: {tx.authorization_code}</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: tx.status === 'approved' ? '#28a745' : '#dc3545'
                  }}>
                    {formatCurrency(tx.amount / 100)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: tx.status === 'approved' ? '#28a745' : '#dc3545',
                    textTransform: 'capitalize'
                  }}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cardFrozen && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '6px'
        }}>
          <div style={{ color: '#721c24', fontWeight: 'bold', marginBottom: '5px' }}>
            🔒 Card Status: Frozen
          </div>
          <div style={{ color: '#721c24', fontSize: '14px' }}>
            This card is currently frozen and cannot be used for transactions. Click "Unfreeze Card" to enable it.
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualCardDetails;