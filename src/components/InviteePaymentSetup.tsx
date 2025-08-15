import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import axios from 'axios';

interface InviteePaymentSetupProps {
  joinToken: string;
  onPaymentSetupComplete: () => void;
  onCancel: () => void;
}

const InviteePaymentSetup: React.FC<InviteePaymentSetupProps> = ({ 
  joinToken, 
  onPaymentSetupComplete, 
  onCancel 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Get setup intent from backend for invitee
      const setupResponse = await axios.post(`/join/${joinToken}/setup-payment`);
      const { client_secret } = setupResponse.data;

      // Step 2: Confirm setup intent with Stripe
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        client_secret,
        {
          payment_method: {
            card: cardElement,
          }
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'An error occurred');
        return;
      }

      // Step 3: Confirm with backend
      if (setupIntent && setupIntent.payment_method) {
        await axios.post(`/join/${joinToken}/confirm-payment-setup`, {
          payment_method_id: setupIntent.payment_method
        });

        onPaymentSetupComplete();
      }

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
      <h3>💳 Payment Information Required</h3>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Please add your payment method to join this group. Your card will only be charged 
        when the group is full and you schedule the service.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ 
          padding: '15px', 
          border: '1px solid #ccc', 
          borderRadius: '4px', 
          backgroundColor: 'white',
          marginBottom: '15px'
        }}>
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>

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
            disabled={!stripe || loading}
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
        <strong>🔒 Secure:</strong> Your payment information is securely processed by Stripe. 
        We never store your card details on our servers.
      </div>
    </div>
  );
};

export default InviteePaymentSetup;