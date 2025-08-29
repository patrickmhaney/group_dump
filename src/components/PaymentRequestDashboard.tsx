import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PaymentRequest {
  id: number;
  group_id: number;
  from_member_name: string;
  to_member_name: string;
  amount: number;
  description: string;
  preferred_method: string;
  payment_details: string;
  status: string;
  created_at: string;
}

interface PaymentRequestDashboardProps {
  groupId: number;
  onClose: () => void;
}

const PaymentRequestDashboard: React.FC<PaymentRequestDashboardProps> = ({ 
  groupId, 
  onClose 
}) => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const fetchPaymentRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/groups/${groupId}/payment-requests`);
      setPaymentRequests(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch payment requests');
    } finally {
      setLoading(false);
    }
  };

  const generatePaymentRequests = async () => {
    try {
      setGenerating(true);
      setError('');
      
      // For demo purposes, using default values
      // In a real app, you'd get these from a form
      await axios.post(`/groups/${groupId}/generate-payment-requests`, {
        description: "Your share of the dumpster rental",
        preferred_method: "zelle",
        payment_details: JSON.stringify({
          email: "creator@example.com",
          phone: "(555) 123-4567"
        })
      });
      
      await fetchPaymentRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate payment requests');
    } finally {
      setGenerating(false);
    }
  };

  const markAsPaid = async (requestId: number) => {
    try {
      await axios.post(`/groups/${groupId}/payment-requests/${requestId}/mark-paid`);
      await fetchPaymentRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark payment as received');
    }
  };

  const bulkMarkAsPaid = async () => {
    try {
      const pendingRequestIds = paymentRequests
        .filter(pr => pr.status === 'pending')
        .map(pr => pr.id);
      
      if (pendingRequestIds.length === 0) return;
      
      await axios.post(`/groups/${groupId}/payment-requests/bulk-mark-paid`, pendingRequestIds);
      await fetchPaymentRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark payments as received');
    }
  };

  useEffect(() => {
    fetchPaymentRequests();
  }, [groupId]);

  const pendingRequests = paymentRequests.filter(pr => pr.status === 'pending');
  const paidRequests = paymentRequests.filter(pr => pr.status === 'paid');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>💰 Payment Request Dashboard</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer' 
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            color: '#dc3545',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '15px'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading payment requests...</p>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              {paymentRequests.length === 0 ? (
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                  <p>No payment requests generated yet.</p>
                  <button
                    onClick={generatePaymentRequests}
                    disabled={generating}
                    className="button"
                    style={{ opacity: generating ? 0.6 : 1 }}
                  >
                    {generating ? 'Generating...' : 'Generate Payment Requests'}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3>Summary: {paidRequests.length} of {paymentRequests.length} paid</h3>
                    {pendingRequests.length > 0 && (
                      <button
                        onClick={bulkMarkAsPaid}
                        className="button button-secondary"
                        style={{ fontSize: '14px' }}
                      >
                        Mark All as Received
                      </button>
                    )}
                  </div>

                  {pendingRequests.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ color: '#dc3545' }}>Pending Payments ({pendingRequests.length})</h4>
                      {pendingRequests.map(request => (
                        <div key={request.id} style={{
                          border: '1px solid #f5c6cb',
                          backgroundColor: '#f8d7da',
                          borderRadius: '4px',
                          padding: '10px',
                          marginBottom: '10px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>{request.to_member_name}</strong> owes ${request.amount.toFixed(2)}
                              <br />
                              <small>{request.description}</small>
                            </div>
                            <button
                              onClick={() => markAsPaid(request.id)}
                              className="button"
                              style={{ fontSize: '12px', padding: '5px 10px' }}
                            >
                              Mark Received
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {paidRequests.length > 0 && (
                    <div>
                      <h4 style={{ color: '#28a745' }}>Completed Payments ({paidRequests.length})</h4>
                      {paidRequests.map(request => (
                        <div key={request.id} style={{
                          border: '1px solid #c3e6cb',
                          backgroundColor: '#d4edda',
                          borderRadius: '4px',
                          padding: '10px',
                          marginBottom: '10px'
                        }}>
                          <div>
                            <strong>{request.to_member_name}</strong> paid ${request.amount.toFixed(2)} ✅
                            <br />
                            <small>{request.description}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#d1ecf1',
              border: '1px solid #bee5eb',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>💡 Pro tip:</strong> Members have been notified via email about payment requests. 
              They'll send payments directly to your Zelle/Venmo, then you can mark them as received here.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentRequestDashboard;