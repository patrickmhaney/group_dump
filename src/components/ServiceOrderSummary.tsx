import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ServiceDetails {
  vendor_name: string;
  total_cost: number;
  delivery_date: string;
  duration: number;
  size: string;
}

interface GroupMember {
  user_name: string;
  user_email: string;
  amount_due: number;
}

interface ServiceOrderSummaryProps {
  groupId: number;
  groupName: string;
  groupAddress: string;
}

const ServiceOrderSummary: React.FC<ServiceOrderSummaryProps> = ({ groupId, groupName, groupAddress }) => {
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServiceDetails = async () => {
      try {
        const [serviceResponse, paymentResponse] = await Promise.all([
          axios.get(`/groups/${groupId}/service-details`),
          axios.get(`/groups/${groupId}/payment-breakdown`)
        ]);
        setServiceDetails(serviceResponse.data);
        setPaymentDetails(paymentResponse.data);
      } catch (error) {
        console.error('Error fetching service details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceDetails();
  }, [groupId]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        Loading service details...
      </div>
    );
  }

  if (!serviceDetails) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
        Unable to load service details.
      </div>
    );
  }

  // Calculate cost per member if we have valid service details
  const totalCost = serviceDetails.total_cost || 0;
  const costPerMember = paymentDetails.length > 0 ? totalCost / paymentDetails.length : 0;

  // Ensure we have valid data and add calculated amounts
  const validPaymentDetails = paymentDetails.filter(member => 
    member && 
    member.user_name && 
    member.user_email
  ).map(member => ({
    ...member,
    amount_due: costPerMember
  }));

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '2px solid #28a745',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '15px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e9ecef'
      }}>
        <div style={{
          backgroundColor: '#28a745',
          color: 'white',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          marginRight: '12px'
        }}>
          ✓
        </div>
        <h2 style={{ 
          margin: 0, 
          color: '#28a745',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          Your Service Order Summary
        </h2>
      </div>

      {/* Service Location */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          margin: '0 0 10px 0', 
          color: '#333',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center'
        }}>
          🏠 Service Location
        </h3>
        <div style={{ marginLeft: '20px' }}>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>
            <strong>Group:</strong> {groupName}
          </p>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>
            <strong>Address:</strong> {groupAddress}
          </p>
        </div>
      </div>

      {/* Dumpster Service */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          margin: '0 0 10px 0', 
          color: '#333',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center'
        }}>
          🚚 Your Dumpster Service
        </h3>
        <div style={{ marginLeft: '20px' }}>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>
            <strong>Vendor:</strong> {serviceDetails.vendor_name}
          </p>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>
            <strong>Dumpster Size:</strong> {serviceDetails.size}
          </p>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>
            <strong>Duration:</strong> {serviceDetails.duration} days
          </p>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>
            <strong>Delivery Date:</strong> {new Date(serviceDetails.delivery_date).toLocaleDateString()}
          </p>
        </div>
        
        <div style={{
          backgroundColor: '#e8f5ff',
          border: '1px solid #007bff',
          borderRadius: '8px',
          padding: '15px',
          marginTop: '15px',
          marginLeft: '20px'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#007bff',
            textAlign: 'center'
          }}>
            Total Service Cost: ${(serviceDetails.total_cost || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div>
        <h3 style={{ 
          margin: '0 0 10px 0', 
          color: '#333',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center'
        }}>
          💰 Your Payment Details
        </h3>
        <div style={{ marginLeft: '20px' }}>
          {validPaymentDetails.length > 0 ? validPaymentDetails.map((member, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '8px',
              border: '1px solid #dee2e6'
            }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {member.user_name}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {member.user_email}
                </div>
              </div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#28a745' 
              }}>
                ${member.amount_due.toFixed(2)}
              </div>
            </div>
          )) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              No group members found for payment breakdown
            </div>
          )}
          
          <div style={{
            backgroundColor: '#e8f8e8',
            border: '2px solid #28a745',
            borderRadius: '8px',
            padding: '15px',
            marginTop: '15px',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '16px', 
              color: '#155724',
              marginBottom: '5px'
            }}>
              Total Service Cost:
            </div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#155724'
            }}>
              ${(serviceDetails.total_cost || 0).toFixed(2)}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#155724',
              fontStyle: 'italic',
              marginTop: '5px'
            }}>
              * Split equally among all group members
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceOrderSummary;