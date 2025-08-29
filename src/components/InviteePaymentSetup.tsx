import React from 'react';

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

  const handleProceed = () => {
    // No payment setup needed - just proceed to join
    onPaymentSetupComplete();
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      backgroundColor: '#f9f9f9',
      margin: '20px 0'
    }}>
      <h3>🎉 Ready to Join Group</h3>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        No payment information required upfront! The group creator will coordinate payments 
        directly once the group is complete.
      </p>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#d1ecf1', 
        border: '1px solid #bee5eb',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#0c5460'
      }}>
        <strong>💡 How payments work:</strong>
        <ul style={{ marginTop: '10px', marginBottom: '0', paddingLeft: '20px' }}>
          <li>Join the group now with no upfront payment</li>
          <li>When the group is full, the creator will send payment requests</li>
          <li>Pay your share via Zelle, Venmo, or cash directly to the creator</li>
          <li>Much simpler than dealing with credit cards!</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={handleProceed}
          className="button"
        >
          Join Group
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          className="button button-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default InviteePaymentSetup;