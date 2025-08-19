import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface StripeCardElementProps {
  cardId: string;
  onCardReady?: () => void;
  onError?: (error: string) => void;
}

export const StripeCardElement: React.FC<StripeCardElementProps> = ({ 
  cardId, 
  onCardReady, 
  onError 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeCard();
  }, [cardId]);

  const initializeCard = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Initializing card display for:', cardId);

      // Fetch secure card details from our backend
      const cardDetails = await fetchCardDetails(cardId);
      
      console.log('Card details received:', cardDetails);
      
      if (cardDetails && elementRef.current) {
        // Display card details securely
        displayCardDetails(cardDetails);
      }

    } catch (error: any) {
      console.error('Error loading card:', error);
      setError(error.message || 'Failed to load card details');
      if (onError) {
        onError(error.message || 'Failed to load card details');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCardDetails = async (cardId: string) => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Fetch real card details from backend API
      const response = await axios.get(`/api/cards/${cardId}/details`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const cardData = response.data;
      
      return {
        id: cardData.id,
        last4: cardData.last4,
        brand: cardData.brand,
        exp_month: cardData.exp_month,
        exp_year: cardData.exp_year,
        status: cardData.status,
        // Use full details if available, otherwise use masked versions
        displayNumber: cardData.full_number || cardData.display_number,
        displayCVC: cardData.cvc || cardData.display_cvc,
        spending_limit: cardData.spending_limit,
        group_name: cardData.group_name,
        // Keep track of whether we have full details
        hasFullDetails: !!(cardData.full_number && cardData.cvc)
      };
    } catch (error: any) {
      console.error('Error fetching card details:', error);
      if (error.response?.status === 403) {
        throw new Error('You do not have permission to view this card');
      } else if (error.response?.status === 404) {
        throw new Error('Card not found');
      } else {
        throw new Error(error.response?.data?.detail || 'Failed to fetch card details');
      }
    }
  };

  const displayCardDetails = (cardDetails: any) => {
    if (!elementRef.current) return;

    elementRef.current.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 24px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        margin: 0 auto;
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
          <div style="font-size: 18px; font-weight: 600;">Virtual Card</div>
          <div style="font-size: 24px; font-weight: bold;">${cardDetails.brand.toUpperCase()}</div>
        </div>
        
        <div style="font-size: 24px; font-family: 'Courier New', monospace; letter-spacing: 2px; margin-bottom: 24px;">
          ${cardDetails.displayNumber}
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">EXPIRES</div>
            <div style="font-size: 18px; font-family: 'Courier New', monospace;">${cardDetails.exp_month}/${cardDetails.exp_year}</div>
          </div>
          <div>
            <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">CVC</div>
            <div style="font-size: 18px; font-family: 'Courier New', monospace;">${cardDetails.displayCVC}</div>
          </div>
          <div>
            <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">STATUS</div>
            <div style="font-size: 14px; color: #4CAF50; font-weight: 600;">${cardDetails.status.toUpperCase()}</div>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 12px; opacity: 0.9;">
          <strong>🔒 Secure Virtual Card</strong><br>
          Group: ${cardDetails.group_name || 'Unknown'}<br>
          Limit: $${(cardDetails.spending_limit / 100).toFixed(2)}<br>
          ${cardDetails.hasFullDetails ? 
            'Full card details available for booking.' : 
            'Card details are masked for security.'}
        </div>
      </div>
    `;

    if (onCardReady) {
      onCardReady();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>Loading secure card details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fee', 
        border: '1px solid #fcc', 
        borderRadius: '8px',
        color: '#c33' 
      }}>
        <strong>Card Loading Error:</strong> {error}
        <button 
          onClick={initializeCard}
          style={{ 
            marginLeft: '10px', 
            padding: '4px 8px', 
            fontSize: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div ref={elementRef}></div>
    </div>
  );
};

export default StripeCardElement;