import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ServiceDetails {
  vendor_name: string;
  total_cost: number;
  delivery_date: string;
  duration: number;
  size: string;
}

interface MemberPayment {
  member_id: number;
  user_name: string;
  user_email: string;
  amount: number;
  payment_status: string;
}

interface ServiceConfirmationProps {
  groupId: number;
  groupName: string;
  groupAddress: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ServiceConfirmation: React.FC<ServiceConfirmationProps> = ({
  groupId,
  groupName,
  groupAddress,
  onConfirm,
  onCancel
}) => {
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchServiceDetails();
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchServiceDetails = async () => {
    try {
      const [serviceResponse, paymentsResponse] = await Promise.all([
        axios.get(`/groups/${groupId}/service-details`),
        axios.get(`/groups/${groupId}/payment-breakdown`)
      ]);
      
      setServiceDetails(serviceResponse.data);
      setMemberPayments(paymentsResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    
    try {
      await axios.post(`/groups/${groupId}/schedule-service`);
      onConfirm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to schedule service');
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '40px', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          Loading service details...
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '12px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginTop: 0, color: '#007bff', textAlign: 'center' }}>
          📋 Final Service Confirmation
        </h2>
        
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

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '8px' }}>
            🏠 Group Information
          </h3>
          <div style={{ marginLeft: '15px' }}>
            <p><strong>Group:</strong> {groupName}</p>
            <p><strong>Address:</strong> {groupAddress}</p>
          </div>
        </div>

        {serviceDetails && (
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '8px' }}>
              🚚 Service Details
            </h3>
            <div style={{ marginLeft: '15px' }}>
              <p><strong>Vendor:</strong> {serviceDetails.vendor_name}</p>
              <p><strong>Dumpster Size:</strong> {serviceDetails.size}</p>
              <p><strong>Duration:</strong> {serviceDetails.duration} days</p>
              <p><strong>Delivery Date:</strong> {new Date(serviceDetails.delivery_date).toLocaleDateString()}</p>
              <div style={{ 
                marginTop: '15px',
                padding: '15px',
                backgroundColor: '#e8f4fd',
                borderRadius: '6px',
                border: '1px solid #b8daff'
              }}>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#004085' }}>
                  <strong>Total Service Cost: {formatCurrency(serviceDetails.total_cost)}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '8px' }}>
            💰 Payment Breakdown
          </h3>
          <div style={{ marginLeft: '15px' }}>
            {memberPayments.map((payment) => (
              <div key={payment.member_id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{payment.user_name}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>{payment.user_email}</div>
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: '#28a745'
                }}>
                  {formatCurrency(payment.amount)}
                </div>
              </div>
            ))}
            
            <div style={{ 
              marginTop: '15px',
              padding: '15px',
              backgroundColor: '#d4edda',
              borderRadius: '6px',
              border: '1px solid #c3e6cb'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#155724'
              }}>
                <span>Total to Your Business Account:</span>
                <span>
                  {serviceDetails && formatCurrency(
                    serviceDetails.total_cost * 0.971 // Assuming ~2.9% Stripe fee
                  )}
                </span>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#856404', 
                marginTop: '5px' 
              }}>
                * After Stripe processing fees (~2.9%)
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '6px',
          padding: '15px',
          marginBottom: '25px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
            ⚡ What happens next:
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
            <li>All member payments will be captured simultaneously</li>
            <li>Funds will be transferred to your business account</li>
            <li>Service will be scheduled with the vendor</li>
            <li>All members will receive confirmation emails</li>
          </ul>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'flex-end',
          marginTop: '30px'
        }}>
          <button
            onClick={onCancel}
            disabled={confirming}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              opacity: confirming ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              opacity: confirming ? 0.6 : 1
            }}
          >
            {confirming ? '⏳ Processing...' : '✅ Confirm & Schedule Service'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceConfirmation;