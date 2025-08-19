import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App.tsx';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import ServiceConfirmation from './ServiceConfirmation.tsx';

interface Group {
  id: number;
  name: string;
  address: string;
  max_participants: number;
  current_participants?: number;
  participants?: Participant[];
  status: string;
  created_by: number;
  created_at: string;
  time_slots?: TimeSlot[];
  vendor_id?: number;
  vendor_name?: string;
  
  // Virtual card fields for Phase 2
  virtual_card_id?: string;
  card_spending_limit?: number;
  card_status?: string;
  service_fee_collected?: number;
  total_collected_amount?: number;
  vendor_website?: string;
}

interface Participant {
  id: number;
  name: string;
  email: string;
  joined_at: string;
}

interface Company {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  service_areas: string;
  dumpster_sizes: DumpsterSize[];
  rating: number;
}

interface DumpsterSize {
  cubic_yards: string;
  dimensions: string;
  starting_price: string;
  starting_tonnage: string;
  per_ton_overage_price: string;
  additional_day_price: string;
}

interface TimeSlot {
  id: number;
  start_date: string;
  end_date: string;
}

interface Invitee {
  name: string;
  email: string;
  phone?: string;
}

interface Rental {
  id: number;
  group_id: number;
  company_id: number;
  size: string;
  duration: number;
  total_cost: number;
  delivery_date: string;
  status: string;
}

interface UserTimeSlotSelection {
  time_slot_id: number;
  start_date: string;
  end_date: string;
}

interface TimeSlotAnalysis {
  time_slot_id: number;
  start_date: string;
  end_date: string;
  selected_by_count: number;
  selected_by_users: string[];
  is_universal: boolean;
}

interface GroupPaymentStatus {
  member_id: number;
  user_name: string;
  user_email: string;
  payment_status: string;
  joined_at: string;
}

const Groups: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  const stripe = useStripe();
  const elements = useElements();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    max_participants: 2,
    vendor_id: '',
    selected_dumpster_size: ''
  });
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [userTimeSlotSelections, setUserTimeSlotSelections] = useState<{[groupId: number]: number[]}>({});
  const [timeSlotAnalyses, setTimeSlotAnalyses] = useState<{[groupId: number]: TimeSlotAnalysis[]}>({});
  const [expandedGroups, setExpandedGroups] = useState<{[groupId: number]: boolean}>({});
  const [paymentStatuses, setPaymentStatuses] = useState<{[groupId: number]: GroupPaymentStatus[]}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<{groupId: number; groupName: string; groupAddress: string} | null>(null);
  const [comparisonSize, setComparisonSize] = useState<string>('20');

  useEffect(() => {
    fetchGroups();
    fetchCompanies();
    fetchRentals();
  }, []);

  useEffect(() => {
    if (user && formData.name === '') {
      setFormData(prev => ({
        ...prev,
        name: `${user.name}'s Group Dump`
      }));
    }
  }, [user, formData.name]);

  useEffect(() => {
    // Auto-load payment status for full groups where user is creator
    groups.forEach(group => {
      if ((group.current_participants || 0) >= group.max_participants && 
          group.created_by === user?.id && 
          !paymentStatuses[group.id]) {
        fetchPaymentStatus(group.id);
      }
    });
  }, [groups, user?.id, paymentStatuses]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/groups/invited');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/companies');
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchRentals = async () => {
    try {
      const response = await axios.get('/rentals');
      setRentals(response.data);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    }
  };

  const fetchUserTimeSlotSelections = async (groupId: number) => {
    try {
      const response = await axios.get(`/groups/${groupId}/user-time-slots`);
      const timeSlotIds = response.data.map((selection: UserTimeSlotSelection) => selection.time_slot_id);
      setUserTimeSlotSelections(prev => ({
        ...prev,
        [groupId]: timeSlotIds
      }));
    } catch (error) {
      console.error('Error fetching user time slot selections:', error);
    }
  };

  const fetchTimeSlotAnalysis = async (groupId: number) => {
    try {
      const response = await axios.get(`/groups/${groupId}/time-slot-analysis`);
      setTimeSlotAnalyses(prev => ({
        ...prev,
        [groupId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching time slot analysis:', error);
    }
  };

  const fetchPaymentStatus = async (groupId: number) => {
    try {
      const response = await axios.get(`/groups/${groupId}/payment-status`);
      setPaymentStatuses(prev => ({
        ...prev,
        [groupId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching payment status:', error);
    }
  };

  const updateUserTimeSlotSelections = async (groupId: number, timeSlotIds: number[]) => {
    try {
      await axios.put(`/groups/${groupId}/user-time-slots`, {
        time_slot_ids: timeSlotIds
      });
      
      setUserTimeSlotSelections(prev => ({
        ...prev,
        [groupId]: timeSlotIds
      }));
      
      // Refresh the analysis to show updated counts
      await fetchTimeSlotAnalysis(groupId);
      
      setMessage('Time slot selections updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail
        : 'Error updating time slot selections';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setMessage('Payment system not ready. Please try again.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get card element and create payment method
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message || 'Payment method creation failed');
      }

      // Prepare group data
      const groupData: any = {
        ...formData,
        address: `${formData.street_address}, ${formData.city}, ${formData.state} ${formData.zip_code}`,
        time_slots: timeSlots,
        invitees: invitees,
        payment_method_id: paymentMethod.id
      };
      
      if (formData.vendor_id && formData.vendor_id !== '') {
        groupData.vendor_id = parseInt(formData.vendor_id);
      } else {
        delete groupData.vendor_id;
      }
      
      // Add rental information if service is selected
      if (formData.vendor_id && formData.selected_dumpster_size) {
        groupData.rental_info = {
          dumpster_size: formData.selected_dumpster_size
        };
      } else if (formData.vendor_id && !formData.selected_dumpster_size) {
        throw new Error('Please select a dumpster size when choosing a vendor.');
      }
      
      // Create group with payment in single transaction
      const response = await axios.post('/groups/create-with-payment', groupData);
      setGroups([response.data, ...groups]);
      setShowCreateForm(false);
      setFormData({ name: user ? `${user.name}'s Group Dump` : '', street_address: '', city: '', state: '', zip_code: '', max_participants: 2, vendor_id: '', selected_dumpster_size: '' });
      setTimeSlots([]);
      setInvitees([]);
      setMessage('Group created successfully with payment setup! Invitations have been sent.');
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail
        : Array.isArray(error.response?.data?.detail)
        ? error.response.data.detail.map((err: any) => err.msg || err).join(', ')
        : error.message || 'Error creating group';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGroup = async (groupId: number) => {
    // Find the group to check if it has time slots
    const group = groups.find(g => g.id === groupId);
    if (group && group.time_slots && group.time_slots.length > 0) {
      setMessage('This group has time slots that require selection. Please use the invitation link sent to your email to join and select your available time slots.');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    try {
      await axios.post(`/groups/${groupId}/join`, {
        time_slot_ids: []
      });
      setMessage('Successfully joined group!');
      setTimeout(() => setMessage(''), 3000);
      fetchGroups(); // Refresh the list
    } catch (error: any) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail
        : Array.isArray(error.response?.data?.detail)
        ? error.response.data.detail.map((err: any) => err.msg || err).join(', ')
        : 'Error joining group';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteGroup = async (groupId: number, groupName: string) => {
    if (!window.confirm(`Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/groups/${groupId}`);
      setMessage('Group deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
      fetchGroups(); // Refresh the list
    } catch (error: any) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail
        : Array.isArray(error.response?.data?.detail)
        ? error.response.data.detail.map((err: any) => err.msg || err).join(', ')
        : 'Error deleting group';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name === 'max_participants') {
      processedValue = parseInt(value);
    } else if (name === 'state') {
      processedValue = value.toUpperCase();
    } else if (name === 'zip_code') {
      // Allow only numbers and hyphens for ZIP code
      processedValue = value.replace(/[^\d-]/g, '');
    }
    
    setFormData({
      ...formData,
      [name]: name === 'max_participants' ? processedValue : processedValue
    });
  };

  const addTimeSlot = () => {
    if (timeSlots.length < 5) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const newSlot: TimeSlot = {
        id: Date.now(), // Temporary ID for new slots
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      };
      setTimeSlots([...timeSlots, newSlot]);
    }
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const updatedSlots = timeSlots.map((slot, i) => {
      if (i === index) {
        const updatedSlot = { ...slot, [field]: value };
        if (field === 'start_date') {
          const startDate = new Date(value);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          updatedSlot.end_date = endDate.toISOString().split('T')[0];
        }
        return updatedSlot;
      }
      return slot;
    });
    setTimeSlots(updatedSlots);
  };

  const addInvitee = () => {
    setInvitees([...invitees, { name: '', email: '', phone: '' }]);
  };

  const removeInvitee = (index: number) => {
    setInvitees(invitees.filter((_, i) => i !== index));
  };

  const updateInvitee = (index: number, field: keyof Invitee, value: string) => {
    const updatedInvitees = invitees.map((invitee, i) => {
      if (i === index) {
        return { ...invitee, [field]: value };
      }
      return invitee;
    });
    setInvitees(updatedInvitees);
  };

  const handleTimeSlotToggle = (groupId: number, timeSlotId: number) => {
    const currentSelections = userTimeSlotSelections[groupId] || [];
    const newSelections = currentSelections.includes(timeSlotId)
      ? currentSelections.filter(id => id !== timeSlotId)
      : [...currentSelections, timeSlotId];
    
    updateUserTimeSlotSelections(groupId, newSelections);
  };

  const toggleGroupExpansion = async (groupId: number) => {
    const isExpanding = !expandedGroups[groupId];
    
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: isExpanding
    }));

    // Load time slot data when expanding
    if (isExpanding) {
      await Promise.all([
        fetchUserTimeSlotSelections(groupId),
        fetchTimeSlotAnalysis(groupId)
      ]);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Welcome, {user?.name}!</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : 'Create Group'}
          </button>
          <button
            className="button button-secondary"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2>Quick Stats</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h3>{groups.length}</h3>
            <p>Your Groups</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3>{rentals.length}</h3>
            <p>Your Rentals</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3>{groups.filter(g => (g.current_participants || 0) >= g.max_participants).length}</h3>
            <p>Ready Groups</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={message.includes('Error') ? 'error' : 'success'}>
          {message}
        </div>
      )}

      {showCreateForm && (
        <div className="card">
          <h2>Create New Group</h2>
          <form onSubmit={handleCreateGroup} className="form">
            <input
              type="text"
              name="name"
              placeholder="Group Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="street_address"
              placeholder="Street Address"
              value={formData.street_address}
              onChange={handleChange}
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                name="city"
                placeholder="City"
                value={formData.city}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="state"
                placeholder="State"
                value={formData.state}
                onChange={handleChange}
                required
                maxLength={2}
                style={{ textTransform: 'uppercase' }}
              />
              <input
                type="text"
                name="zip_code"
                placeholder="ZIP Code"
                value={formData.zip_code}
                onChange={handleChange}
                required
                maxLength={10}
                pattern="[0-9]{5}(-[0-9]{4})?"
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                Maximum Group Members
              </label>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                Choose how many people can join your group (including yourself)
              </p>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {[2, 3, 4].map(num => (
                  <label
                    key={num}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '12px 20px',
                      border: `2px solid ${formData.max_participants === num ? '#007bff' : '#dee2e6'}`,
                      borderRadius: '8px',
                      backgroundColor: formData.max_participants === num ? '#f8f9ff' : '#ffffff',
                      transition: 'all 0.3s ease',
                      minWidth: '80px',
                      justifyContent: 'center',
                      fontWeight: formData.max_participants === num ? 'bold' : 'normal'
                    }}
                    onMouseEnter={(e) => {
                      if (formData.max_participants !== num) {
                        e.currentTarget.style.borderColor = '#007bff';
                        e.currentTarget.style.backgroundColor = '#f8f9ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.max_participants !== num) {
                        e.currentTarget.style.borderColor = '#dee2e6';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="max_participants"
                      value={num}
                      checked={formData.max_participants === num}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '14px', color: formData.max_participants === num ? '#007bff' : '#666' }}>
                      {num} {num === 1 ? 'Member' : 'Members'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Vendor Services Comparison Section */}
            {companies.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                  Compare Vendor Services
                </label>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Select a dumpster size to compare services across all vendors
                </p>
                
                {/* Size Selector for Comparison */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                          fontWeight: comparisonSize === size ? 'bold' : 'normal',
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
                
                <label style={{ display: 'block', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                  Select Dumpster Service Provider
                </label>
                
                {/* Services Comparison Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  {companies.map(company => {
                    const matchingSize = company.dumpster_sizes?.find(size => size.cubic_yards === comparisonSize);
                    return (
                      <div
                        key={company.id}
                        style={{
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          padding: '12px',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => setFormData({...formData, vendor_id: company.id.toString()})}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#007bff';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,123,255,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                        }}
                      >
                        <div style={{ marginBottom: '8px' }}>
                          <h4 style={{ margin: '0 0 3px 0', color: '#333', fontSize: '14px', fontWeight: 'bold' }}>
                            {company.name}
                          </h4>
                          <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>
                            {company.address}
                          </p>
                        </div>
                        
                        {matchingSize ? (
                          <div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: '#28a745',
                              marginBottom: '6px'
                            }}>
                              {matchingSize.starting_price.startsWith('$') ? matchingSize.starting_price : `$${matchingSize.starting_price}`}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                              {comparisonSize} yards • {matchingSize.starting_tonnage} tons
                            </div>
                            <div style={{ fontSize: '10px', color: '#666' }}>
                              +{matchingSize.per_ton_overage_price.startsWith('$') ? matchingSize.per_ton_overage_price : `$${matchingSize.per_ton_overage_price}`}/ton • 
                              +{matchingSize.additional_day_price.startsWith('$') ? matchingSize.additional_day_price : `$${matchingSize.additional_day_price}`}/day
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#666', fontStyle: 'italic', fontSize: '12px' }}>
                            {comparisonSize} yards not available
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Service Selection Section */}
            {formData.vendor_id && (
              <div className="service-selection-section" style={{ 
                marginTop: '20px', 
                padding: '20px', 
                border: '2px solid #28a745', 
                borderRadius: '8px', 
                backgroundColor: '#f8fff8' 
              }}>
                <h3 style={{ marginTop: '0', color: '#28a745' }}>🚚 Select Your Dumpster Service</h3>
                
                {(() => {
                  const selectedCompany = companies.find(c => c.id === parseInt(formData.vendor_id));
                  if (!selectedCompany?.dumpster_sizes?.length) {
                    return (
                      <p style={{ color: '#666', fontStyle: 'italic' }}>
                        This vendor hasn't configured their dumpster sizes yet.
                      </p>
                    );
                  }
                  
                  return (
                    <>
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '16px', marginBottom: '15px', fontWeight: 'bold', color: '#155724' }}>
                          Choose Your Dumpster Size:
                        </label>
                        <div style={{ display: 'grid', gap: '15px' }}>
                          {selectedCompany.dumpster_sizes.map((size, index) => {
                            const isSelected = formData.selected_dumpster_size === JSON.stringify(size);
                            return (
                              <div
                                key={index}
                                onClick={() => setFormData({...formData, selected_dumpster_size: JSON.stringify(size)})}
                                style={{
                                  border: `3px solid ${isSelected ? '#28a745' : '#dee2e6'}`,
                                  borderRadius: '12px',
                                  padding: '20px',
                                  cursor: 'pointer',
                                  backgroundColor: isSelected ? '#f8fff8' : '#ffffff',
                                  transition: 'all 0.3s ease',
                                  boxShadow: isSelected ? '0 4px 12px rgba(40, 167, 69, 0.2)' : '0 2px 6px rgba(0,0,0,0.1)',
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = '#28a745';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.15)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = '#dee2e6';
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                                  }
                                }}
                              >
                                {isSelected && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '15px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}>
                                    ✓
                                  </div>
                                )}
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                  <div>
                                    <h4 style={{ margin: '0 0 5px 0', color: '#155724', fontSize: '20px', fontWeight: 'bold' }}>
                                      {size.cubic_yards} Cubic Yards
                                    </h4>
                                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                                      Dimensions: {size.dimensions}
                                    </p>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                                      ${size.starting_price}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                      starting price
                                    </div>
                                  </div>
                                </div>
                                
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                                  gap: '12px',
                                  marginTop: '15px',
                                  paddingTop: '15px',
                                  borderTop: '1px solid #e9ecef'
                                }}>
                                  <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
                                      {size.starting_tonnage} tons
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6c757d' }}>included</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
                                      ${size.per_ton_overage_price}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6c757d' }}>per extra ton</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
                                      ${size.additional_day_price}
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
                            );
                          })}
                        </div>
                        {!formData.selected_dumpster_size && (
                          <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '10px', fontStyle: 'italic' }}>
                            * Please select a dumpster size to continue
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            
            <div className="invitees-section" style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                  Invite People to Group
                </label>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Add neighbors to automatically send them email invitations when the group is created
                </p>
              </div>
              
              {invitees.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <button
                    type="button"
                    className="button"
                    onClick={addInvitee}
                    style={{ fontSize: '16px', padding: '12px 24px' }}
                  >
                    Add First Person
                  </button>
                </div>
              ) : (
                <>
                  <div className="invitees-list" style={{ marginBottom: '20px' }}>
                    {invitees.map((invitee, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          marginBottom: '15px', 
                          padding: '20px', 
                          border: '2px solid #e9ecef', 
                          borderRadius: '12px',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 180px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '14px', 
                              fontWeight: 'bold',
                              marginBottom: '8px',
                              color: '#495057'
                            }}>
                              Name *
                            </label>
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={invitee.name}
                              onChange={(e) => updateInvitee(index, 'name', e.target.value)}
                              style={{ 
                                width: '100%', 
                                padding: '12px', 
                                border: '2px solid #dee2e6', 
                                borderRadius: '8px',
                                fontSize: '16px'
                              }}
                              required
                            />
                          </div>
                          <div style={{ flex: '1 1 200px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '14px', 
                              fontWeight: 'bold',
                              marginBottom: '8px',
                              color: '#495057'
                            }}>
                              Email *
                            </label>
                            <input
                              type="email"
                              placeholder="email@example.com"
                              value={invitee.email}
                              onChange={(e) => updateInvitee(index, 'email', e.target.value)}
                              style={{ 
                                width: '100%', 
                                padding: '12px', 
                                border: '2px solid #dee2e6', 
                                borderRadius: '8px',
                                fontSize: '16px'
                              }}
                              required
                            />
                          </div>
                          <div style={{ flex: '1 1 160px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '14px', 
                              fontWeight: 'bold',
                              marginBottom: '8px',
                              color: '#495057'
                            }}>
                              Phone (Optional)
                            </label>
                            <input
                              type="tel"
                              placeholder="(555) 123-4567"
                              value={invitee.phone}
                              onChange={(e) => updateInvitee(index, 'phone', e.target.value)}
                              style={{ 
                                width: '100%', 
                                padding: '12px', 
                                border: '2px solid #dee2e6', 
                                borderRadius: '8px',
                                fontSize: '16px'
                              }}
                            />
                          </div>
                          <div style={{ flex: '0 0 auto', marginTop: '28px' }}>
                            <button
                              type="button"
                              onClick={() => removeInvitee(index)}
                              style={{
                                padding: '10px 15px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#c82333';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc3545';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={addInvitee}
                      style={{
                        padding: '12px 24px',
                        fontSize: '16px'
                      }}
                    >
                      Add Another Person
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="time-slots-section" style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                  Add Potential Service Dates
                </label>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Choose up to 5 different 7-day periods when your group could rent the dumpster. 
                  This helps coordinate everyone's schedule.
                </p>
              </div>
              
              {timeSlots.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '8px'
                }}>
                  <button
                    type="button"
                    className="button"
                    onClick={addTimeSlot}
                    style={{ fontSize: '16px', padding: '12px 24px' }}
                  >
                    Add Your First Time Slot
                  </button>
                </div>
              ) : (
                <>
                  <div className="time-slots-list" style={{ marginBottom: '20px' }}>
                    {timeSlots.map((slot, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          marginBottom: '15px', 
                          padding: '20px', 
                          border: '2px solid #e9ecef', 
                          borderRadius: '12px',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 200px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '14px', 
                              fontWeight: 'bold',
                              marginBottom: '8px',
                              color: '#495057'
                            }}>
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={slot.start_date}
                              onChange={(e) => updateTimeSlot(index, 'start_date', e.target.value)}
                              style={{ 
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #dee2e6',
                                borderRadius: '8px',
                                fontSize: '16px'
                              }}
                            />
                          </div>
                          
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            color: '#6c757d',
                            fontSize: '24px',
                            margin: '20px 0 0 0'
                          }}>
                            →
                          </div>
                          
                          <div style={{ flex: '1 1 200px' }}>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '14px', 
                              fontWeight: 'bold',
                              marginBottom: '8px',
                              color: '#495057'
                            }}>
                              End Date (Auto-calculated)
                            </label>
                            <input
                              type="date"
                              value={slot.end_date}
                              readOnly
                              style={{ 
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #e9ecef',
                                borderRadius: '8px',
                                backgroundColor: '#f8f9fa',
                                color: '#6c757d',
                                fontSize: '16px'
                              }}
                            />
                          </div>
                          
                          <div style={{ flex: '0 0 auto', marginTop: '20px' }}>
                            <button
                              type="button"
                              onClick={() => removeTimeSlot(index)}
                              style={{
                                padding: '10px 15px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#c82333';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc3545';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        
                        <div style={{ 
                          marginTop: '15px',
                          padding: '12px',
                          backgroundColor: '#e8f5e8',
                          borderRadius: '8px',
                          border: '1px solid #d4edda'
                        }}>
                          <div style={{ fontSize: '14px', color: '#155724', fontWeight: 'bold' }}>
                            7-Day Rental Period: {new Date(slot.start_date).toLocaleDateString()} - {new Date(slot.end_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={addTimeSlot}
                      disabled={timeSlots.length >= 5}
                      style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        opacity: timeSlots.length >= 5 ? 0.6 : 1,
                        cursor: timeSlots.length >= 5 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Add Another Time Slot ({timeSlots.length}/5)
                    </button>
                    {timeSlots.length >= 5 && (
                      <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '8px', fontStyle: 'italic' }}>
                        Maximum of 5 time slots reached
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="payment-section" style={{ 
              marginTop: '30px', 
              padding: '20px', 
              border: '2px solid #007bff', 
              borderRadius: '8px', 
              backgroundColor: '#f8f9fa' 
            }}>
              <h3 style={{ marginTop: '0', color: '#007bff' }}>💳 Payment Information</h3>
              <p style={{ color: '#666', marginBottom: '15px' }}>
                Your payment method is required to create the group. Your card will only be charged 
                when the group is full and you schedule the service.
              </p>
              
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

              <div style={{ 
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
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                type="submit" 
                className="button"
                disabled={!stripe || isSubmitting}
                style={{ opacity: (!stripe || isSubmitting) ? 0.6 : 1 }}
              >
                {isSubmitting ? 'Creating Group...' : 'Create Group & Setup Payment'}
              </button>
              <button 
                type="button" 
                className="button button-secondary" 
                onClick={() => setShowCreateForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Groups</h2>
        {groups.length === 0 ? (
          <p>No groups found. You'll see groups here that you've created or been invited to.</p>
        ) : (
          <div className="group-list">
            {groups.map((group) => (
              <div key={group.id} className="group-item">
                <h3>{group.name}</h3>
                <p><strong>Address:</strong> {group.address}</p>
                <p><strong>Participants:</strong> {group.current_participants || 0} / {group.max_participants}</p>
                <p><strong>Status:</strong> 
                  <span style={{ 
                    color: (group.current_participants || 0) >= group.max_participants ? '#28a745' : 'inherit',
                    fontWeight: (group.current_participants || 0) >= group.max_participants ? 'bold' : 'normal'
                  }}>
                    {(group.current_participants || 0) >= group.max_participants ? 'Ready!' : group.status}
                  </span>
                </p>
                {(group.current_participants || 0) >= group.max_participants && (
                  <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#d4edda', 
                    border: '1px solid #c3e6cb', 
                    borderRadius: '4px', 
                    marginTop: '10px',
                    color: '#155724'
                  }}>
                    <strong>🎉 Group is ready!</strong> You have reached the maximum number of participants.
                    
                    {group.created_by === user?.id && (
                      <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <h4 style={{ margin: '0', color: '#495057' }}>💳 Payment Status Overview</h4>
                          <button
                            className="button button-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => fetchPaymentStatus(group.id)}
                          >
                            Refresh Status
                          </button>
                        </div>
                        
                        {paymentStatuses[group.id] ? (
                          <div>
                            {paymentStatuses[group.id].map((memberStatus) => {
                              const statusColor = memberStatus.payment_status === 'setup_complete' ? '#28a745' : 
                                                 memberStatus.payment_status === 'setup_required' ? '#ffc107' : '#dc3545';
                              const statusText = memberStatus.payment_status === 'setup_complete' ? 'Confirmed' :
                                               memberStatus.payment_status === 'setup_required' ? 'Pending' : 'Not Set Up';
                              const statusIcon = memberStatus.payment_status === 'setup_complete' ? '✅' :
                                               memberStatus.payment_status === 'setup_required' ? '⏳' : '❌';
                              
                              return (
                                <div 
                                  key={memberStatus.member_id}
                                  style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #e9ecef'
                                  }}
                                >
                                  <span style={{ fontSize: '14px' }}>
                                    {memberStatus.user_name} ({memberStatus.user_email})
                                  </span>
                                  <span style={{ 
                                    fontSize: '13px', 
                                    fontWeight: 'bold',
                                    color: statusColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}>
                                    <span>{statusIcon}</span>
                                    {statusText}
                                  </span>
                                </div>
                              );
                            })}
                            
                            {paymentStatuses[group.id].every(status => status.payment_status === 'setup_complete') && (
                              <div style={{ 
                                marginTop: '10px', 
                                padding: '8px', 
                                backgroundColor: '#d4edda', 
                                borderRadius: '4px', 
                                fontSize: '13px',
                                color: '#155724',
                                fontWeight: 'bold'
                              }}>
                                🎉 All members have confirmed payment methods!
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '10px', color: '#6c757d', fontSize: '14px' }}>
                            <button
                              className="button button-secondary"
                              onClick={() => fetchPaymentStatus(group.id)}
                              style={{ fontSize: '12px' }}
                            >
                              Load Payment Status
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {group.vendor_name && (
                  <p><strong>Vendor:</strong> {group.vendor_name}</p>
                )}
                <p><strong>Created:</strong> {new Date(group.created_at).toLocaleDateString()}</p>
                {group.participants && group.participants.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <p><strong>Current Members:</strong></p>
                    <div style={{ marginLeft: '15px' }}>
                      {group.participants.map((participant) => (
                        <div key={participant.id} style={{ fontSize: '14px', color: '#666', marginBottom: '3px' }}>
                          {participant.name} ({participant.email})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {group.time_slots && group.time_slots.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <p style={{ margin: 0 }}><strong>Time Slots:</strong></p>
                      <button
                        className="button button-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => toggleGroupExpansion(group.id)}
                      >
                        {expandedGroups[group.id] ? 'Hide Details' : 'Manage Schedule'}
                      </button>
                    </div>
                    
                    {!expandedGroups[group.id] ? (
                      // Collapsed view - show basic time slot list
                      <div style={{ marginLeft: '15px' }}>
                        {group.time_slots.map((slot, index) => (
                          <div key={index} style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                            {new Date(slot.start_date).toLocaleDateString()} - {new Date(slot.end_date).toLocaleDateString()}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Expanded view - show interactive checkboxes and analysis
                      <div style={{ 
                        marginTop: '15px', 
                        padding: '15px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}>
                        <h4 style={{ marginTop: '0', marginBottom: '15px' }}>Select Your Available Time Slots:</h4>
                        
                        {group.time_slots.map((slot) => {
                          const isSelected = (userTimeSlotSelections[group.id] || []).includes(slot.id);
                          const analysis = timeSlotAnalyses[group.id]?.find(a => a.time_slot_id === slot.id);
                          
                          return (
                            <div 
                              key={slot.id} 
                              style={{ 
                                marginBottom: '15px',
                                padding: '12px',
                                backgroundColor: analysis?.is_universal ? '#d4f8d4' : 'white',
                                border: `2px solid ${analysis?.is_universal ? '#28a745' : '#dee2e6'}`,
                                borderRadius: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleTimeSlotToggle(group.id, slot.id)}
                                    style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                      {new Date(slot.start_date).toLocaleDateString()} - {new Date(slot.end_date).toLocaleDateString()}
                                    </div>
                                    {analysis && (
                                      <div style={{ fontSize: '13px', color: '#666' }}>
                                        <strong>{analysis.selected_by_count}</strong> of {group.current_participants} members available
                                        {analysis.selected_by_users.length > 0 && (
                                          <div style={{ marginTop: '4px' }}>
                                            <strong>Available:</strong> {analysis.selected_by_users.join(', ')}
                                          </div>
                                        )}
                                        {analysis.is_universal && (
                                          <div style={{ color: '#28a745', fontWeight: 'bold', marginTop: '4px' }}>
                                            ✅ Everyone is available!
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                        
                        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
                          <small style={{ color: '#856404' }}>
                            <strong>💡 Tip:</strong> Green highlighted slots work for all group members. 
                            Select at least one time slot to stay in the group.
                          </small>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {group.created_by !== user?.id && (
                  <div style={{ marginTop: '10px' }}>
                    {(group.current_participants || 0) >= group.max_participants ? (
                      <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Group Full</span>
                    ) : (
                      <button
                        className="button"
                        onClick={() => handleJoinGroup(group.id)}
                      >
                        Join Group ({(group.current_participants || 0)}/{group.max_participants})
                      </button>
                    )}
                  </div>
                )}
                {group.created_by === user?.id && (
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>You created this group</span>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                      {(group.current_participants || 0) >= group.max_participants && (() => {
                        const allPaymentsConfirmed = paymentStatuses[group.id] && 
                          paymentStatuses[group.id].every(status => status.payment_status === 'setup_complete');
                        const hasPaymentData = paymentStatuses[group.id];
                        
                        return (
                          <button
                            className="button"
                            style={{ 
                              backgroundColor: allPaymentsConfirmed ? '#007bff' : '#6c757d', 
                              color: 'white',
                              opacity: allPaymentsConfirmed ? 1 : 0.6,
                              cursor: allPaymentsConfirmed ? 'pointer' : 'not-allowed'
                            }}
                            disabled={!allPaymentsConfirmed}
                            onClick={() => {
                              if (allPaymentsConfirmed) {
                                setShowConfirmation({
                                  groupId: group.id,
                                  groupName: group.name,
                                  groupAddress: group.address
                                });
                              } else if (!hasPaymentData) {
                                fetchPaymentStatus(group.id);
                                setMessage('Loading payment status...');
                                setTimeout(() => setMessage(''), 2000);
                              } else {
                                setMessage('All members must confirm their payment methods before scheduling service.');
                                setTimeout(() => setMessage(''), 4000);
                              }
                            }}
                            title={
                              !hasPaymentData ? 'Load payment status first' :
                              !allPaymentsConfirmed ? 'All members must confirm payment methods' :
                              'Schedule your dumpster service'
                            }
                          >
                            {allPaymentsConfirmed ? '📅 Schedule Service' : '⏳ Waiting for Payments'}
                          </button>
                        );
                      })()}
                      <button
                        className="button"
                        style={{ backgroundColor: '#dc3545', color: 'white' }}
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                      >
                        Delete Group
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfirmation && (
        <ServiceConfirmation
          groupId={showConfirmation.groupId}
          groupName={showConfirmation.groupName}
          groupAddress={showConfirmation.groupAddress}
          onConfirm={() => {
            setShowConfirmation(null);
            setMessage('Service scheduled successfully! All members will receive confirmation emails.');
            setTimeout(() => setMessage(''), 5000);
            fetchGroups(); // Refresh to show updated status
          }}
          onCancel={() => setShowConfirmation(null)}
        />
      )}
    </div>
  );
};

export default Groups;