import React, { useState } from 'react';
import axios from 'axios';

interface PaymentSetupProps {
  groupId: number;
  onPaymentSetupComplete: (details: any) => void;
  onCancel: () => void;
}

const PaymentSetup: React.FC<PaymentSetupProps> = ({ 
  groupId, 
  onPaymentSetupComplete, 
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [preferredMethod, setPreferredMethod] = useState<string>('zelle');
  const [zelleEmail, setZelleEmail] = useState<string>('');
  const [zellePhone, setZellePhone] = useState<string>('');
  const [venmoUsername, setVenmoUsername] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setLoading(true);
    setError('');

    try {
      let paymentDetails = '';
      
      if (preferredMethod === 'zelle') {
        if (!zelleEmail && !zellePhone) {
          throw new Error('Please provide either Zelle email or phone number');
        }
        paymentDetails = JSON.stringify({
          email: zelleEmail,
          phone: zellePhone
        });
      } else if (preferredMethod === 'venmo') {
        if (!venmoUsername) {
          throw new Error('Please provide Venmo username');
        }
        paymentDetails = JSON.stringify({
          username: venmoUsername
        });
      }

      const response = await axios.post(`/groups/${groupId}/setup-payment-method`, {
        preferred_method: preferredMethod,
        payment_details: paymentDetails
      });

      onPaymentSetupComplete({
        preferred_method: preferredMethod,
        payment_details: paymentDetails
      });

    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      backgroundColor: '#f9f9f9',
      margin: '20px 0'
    }}>
      <h3>💰 Payment Method Setup</h3>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Choose how you'd like to receive payments from group members. No credit cards required!
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Preferred Payment Method:
          </label>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <input
                type="radio"
                value="zelle"
                checked={preferredMethod === 'zelle'}
                onChange={(e) => setPreferredMethod(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              Zelle
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <input
                type="radio"
                value="venmo"
                checked={preferredMethod === 'venmo'}
                onChange={(e) => setPreferredMethod(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              Venmo
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="radio"
                value="cash"
                checked={preferredMethod === 'cash'}
                onChange={(e) => setPreferredMethod(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              Cash
            </label>
          </div>
        </div>

        {preferredMethod === 'zelle' && (
          <div style={{ marginBottom: '20px' }}>
            <h4>Zelle Information:</h4>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Email (optional):</label>
              <input
                type="email"
                value={zelleEmail}
                onChange={(e) => setZelleEmail(e.target.value)}
                placeholder="your-email@example.com"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Phone (optional):</label>
              <input
                type="tel"
                value={zellePhone}
                onChange={(e) => setZellePhone(e.target.value)}
                placeholder="(555) 123-4567"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
              />
            </div>
          </div>
        )}

        {preferredMethod === 'venmo' && (
          <div style={{ marginBottom: '20px' }}>
            <h4>Venmo Information:</h4>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
              <input
                type="text"
                value={venmoUsername}
                onChange={(e) => setVenmoUsername(e.target.value)}
                placeholder="@your-username"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ 
            color: '#dc3545', 
            marginBottom: '15px', 
            padding: '10px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={loading}
            className="button"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Setting up...' : 'Setup Payment Method'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="button button-secondary"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>

      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#d1ecf1', 
        border: '1px solid #bee5eb',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#0c5460'
      }}>
        <strong>💡 How it works:</strong> Members will receive your payment details and send payments directly to you. 
        You'll track received payments through the app dashboard.
      </div>
    </div>
  );
};

export default PaymentSetup;