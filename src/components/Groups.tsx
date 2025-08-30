import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App.tsx';
import ServiceConfirmation from './ServiceConfirmation.tsx';
import ServiceOrderSummary from './ServiceOrderSummary.tsx';

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
  invitees?: GroupInvitee[];
}

interface Participant {
  id: number;
  name: string;
  email: string;
  joined_at: string;
}

interface GroupInvitee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  join_token: string;
  invitation_sent: boolean;
  created_at: string;
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

// Enhanced Vendor Details Component
interface VendorDetailsProps {
  vendorId: number;
  groupId: number;
}

const VendorDetails: React.FC<VendorDetailsProps> = ({ vendorId, groupId }) => {
  const [vendorInfo, setVendorInfo] = useState<Company | null>(null);
  const [rentalInfo, setRentalInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        // Fetch company details
        const companyResponse = await axios.get(`/companies/${vendorId}`);
        setVendorInfo(companyResponse.data);

        // Try to fetch rental information for this group
        try {
          const rentalResponse = await axios.get(`/groups/${groupId}/service-details`);
          setRentalInfo(rentalResponse.data);
        } catch (rentalError) {
          // Rental info might not be available for all groups
          console.log('No rental info available:', rentalError);
        }
      } catch (error) {
        console.error('Error fetching vendor details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorDetails();
  }, [vendorId, groupId]);

  if (loading) {
    return (
      <div style={{ 
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Loading service provider details...</div>
      </div>
    );
  }

  if (!vendorInfo) {
    return (
      <div style={{ 
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Service provider information not available</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Service Provider Header - outside the box */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>
          Service Provider
        </span>
        {vendorInfo.rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '4px', color: '#f6ad55' }}>⭐</span>
            <span style={{ fontWeight: '500', color: '#2d3748' }}>{vendorInfo.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      {/* Service Provider Box */}
      <div style={{ 
        padding: '18px',
        backgroundColor: '#f8fafe',
        borderRadius: '12px',
        border: '1px solid #e3e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Vendor Name - more prominent */}
        <div style={{ 
          fontWeight: '700', 
          fontSize: '18px', 
          color: '#2d3748', 
          marginBottom: rentalInfo ? '16px' : '0'
        }}>
          {vendorInfo.name}
        </div>

        {/* Rental Details (if available) */}
        {rentalInfo && (
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '14px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '10px', fontWeight: '500' }}>
            Service Details
          </div>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '12px',
            fontSize: '13px'
          }}>
            <div>
              <div style={{ color: '#718096', marginBottom: '2px' }}>Size</div>
              <div style={{ fontWeight: '500', color: '#2d3748' }}>{rentalInfo.size}</div>
            </div>
            <div>
              <div style={{ color: '#718096', marginBottom: '2px' }}>Duration</div>
              <div style={{ fontWeight: '500', color: '#2d3748' }}>{rentalInfo.duration} days</div>
            </div>
            <div>
              <div style={{ color: '#718096', marginBottom: '2px' }}>Total Cost</div>
              <div style={{ fontWeight: '600', color: '#38a169' }}>${rentalInfo.total_cost}</div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

const Groups: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  
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
  const [paymentStatuses, setPaymentStatuses] = useState<{[groupId: number]: GroupPaymentStatus[]}>({});
  const [selectedFinalTimeSlots, setSelectedFinalTimeSlots] = useState<{[groupId: number]: number}>({});
  const [costBreakdowns, setCostBreakdowns] = useState<{[groupId: number]: any}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<{groupId: number; groupName: string; groupAddress: string} | null>(null);
  const [comparisonSize, setComparisonSize] = useState<string>('20');
  const [bookedServices, setBookedServices] = useState<Set<number>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState<{groupId: number; groupName: string} | null>(null);
  const [actualCost, setActualCost] = useState<string>('');
  
  // Payment request modal states
  const [modalPaymentMethod, setModalPaymentMethod] = useState('zelle');
  const [modalZelleEmail, setModalZelleEmail] = useState('');
  const [modalZellePhone, setModalZellePhone] = useState('');
  const [modalVenmoUsername, setModalVenmoUsername] = useState('');
  
  // Payment method setup state
  const [paymentMethodType, setPaymentMethodType] = useState('zelle');
  const [zelleEmail, setZelleEmail] = useState('');
  const [zellePhone, setZellePhone] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');

  useEffect(() => {
    fetchGroups();
    fetchCompanies();
    fetchRentals();
  }, []);

  // Auto-load time slot data for all groups with time slots
  useEffect(() => {
    groups.forEach(group => {
      if (group.time_slots && group.time_slots.length > 0 && 
          (group.current_participants || 0) < group.max_participants) {
        // Load time slot data for groups that are still forming
        fetchUserTimeSlotSelections(group.id);
        fetchTimeSlotAnalysis(group.id);
      }
    });
  }, [groups]);

  const getPaymentDetails = () => {
    if (paymentMethodType === 'zelle') {
      return {
        email: zelleEmail,
        phone: zellePhone
      };
    } else if (paymentMethodType === 'venmo') {
      return {
        username: venmoUsername
      };
    } else if (paymentMethodType === 'cash') {
      return {
        method: 'cash'
      };
    }
    return {};
  };

  const getModalPaymentDetails = () => {
    if (modalPaymentMethod === 'zelle') {
      return {
        email: modalZelleEmail,
        phone: modalZellePhone
      };
    } else if (modalPaymentMethod === 'venmo') {
      return {
        username: modalVenmoUsername
      };
    } else if (modalPaymentMethod === 'cash') {
      return {
        method: 'cash'
      };
    }
    return {};
  };

  useEffect(() => {
    if (user && formData.name === '') {
      setFormData(prev => ({
        ...prev,
        name: `${user.name}'s Group Dump`
      }));
    }
  }, [user, formData.name]);

  useEffect(() => {
    // Auto-load payment status and cost breakdown for full groups where user is creator
    groups.forEach(group => {
      if ((group.current_participants || 0) >= group.max_participants && 
          group.created_by === user?.id) {
        if (!paymentStatuses[group.id]) {
          fetchPaymentStatus(group.id);
        }
        if (!costBreakdowns[group.id]) {
          fetchCostBreakdown(group.id);
        }
      }
    });
  }, [groups, user?.id, paymentStatuses, costBreakdowns]);

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

  const fetchCostBreakdown = async (groupId: number) => {
    try {
      const response = await axios.get(`/groups/${groupId}/payment-breakdown`);
      setCostBreakdowns(prev => ({
        ...prev,
        [groupId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching cost breakdown:', error);
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
    
    setIsSubmitting(true);
    
    try {
      // Prepare group data with simplified payment method details
      const groupData: any = {
        ...formData,
        address: `${formData.street_address}, ${formData.city}, ${formData.state} ${formData.zip_code}`,
        time_slots: timeSlots,
        invitees: invitees,
        payment_method_details: {
          preferred_method: paymentMethodType,
          payment_details: JSON.stringify(getPaymentDetails())
        }
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
      console.log('Sending group data:', JSON.stringify(groupData, null, 2));
      const response = await axios.post('/groups/create-with-payment', groupData);
      setGroups([response.data, ...groups]);
      setShowCreateForm(false);
      setFormData({ name: user ? `${user.name}'s Group Dump` : '', street_address: '', city: '', state: '', zip_code: '', max_participants: 2, vendor_id: '', selected_dumpster_size: '' });
      setTimeSlots([]);
      setInvitees([]);
      setMessage('Group created successfully with payment setup! Invitations have been sent.');
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      
      let errorMessage = 'Error creating group';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((err: any) => {
            if (typeof err === 'string') return err;
            return `${err.loc?.join('.') || 'field'}: ${err.msg || err.message || 'validation error'}`;
          }).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        } else {
          errorMessage = JSON.stringify(data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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

  const handleFinalTimeSlotSelection = (groupId: number, timeSlotId: number) => {
    setSelectedFinalTimeSlots(prev => ({
      ...prev,
      [groupId]: timeSlotId
    }));
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
              <h3 style={{ marginTop: '0', color: '#007bff' }}>💰 Payment Method Setup</h3>
              <p style={{ color: '#666', marginBottom: '15px' }}>
                Choose how you'd like to receive payments from group members. No credit cards required!
              </p>
              
              <div style={{ 
                padding: '15px', 
                border: '1px solid #ccc', 
                borderRadius: '4px', 
                backgroundColor: 'white',
                marginBottom: '15px'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                    Preferred Payment Method:
                  </label>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                      <input
                        type="radio"
                        value="zelle"
                        checked={paymentMethodType === 'zelle'}
                        onChange={(e) => setPaymentMethodType(e.target.value)}
                        style={{ marginRight: '8px' }}
                      />
                      Zelle
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                      <input
                        type="radio"
                        value="venmo"
                        checked={paymentMethodType === 'venmo'}
                        onChange={(e) => setPaymentMethodType(e.target.value)}
                        style={{ marginRight: '8px' }}
                      />
                      Venmo
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="radio"
                        value="cash"
                        checked={paymentMethodType === 'cash'}
                        onChange={(e) => setPaymentMethodType(e.target.value)}
                        style={{ marginRight: '8px' }}
                      />
                      Cash
                    </label>
                  </div>
                </div>

                {paymentMethodType === 'zelle' && (
                  <div style={{ marginBottom: '15px' }}>
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

                {paymentMethodType === 'venmo' && (
                  <div style={{ marginBottom: '15px' }}>
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
              </div>

              <div style={{ 
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
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                type="submit" 
                className="button"
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.6 : 1 }}
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
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 40px', 
            color: '#666',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏠</div>
            <h3 style={{ color: '#495057', marginBottom: '10px' }}>No Groups Yet</h3>
            <p style={{ margin: 0 }}>Create your first group or wait for an invitation to get started!</p>
          </div>
        ) : (
          <div className="group-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {groups.map((group) => {
              const isReady = (group.current_participants || 0) >= group.max_participants;
              const isCreator = group.created_by === user?.id;
              
              return (
                <div key={group.id} style={{
                  backgroundColor: '#ffffff',
                  border: `2px solid ${isReady ? '#28a745' : '#e9ecef'}`,
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  {/* Header Section */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        margin: '0 0 8px 0', 
                        color: '#2c3e50',
                        fontSize: '22px',
                        fontWeight: 'bold'
                      }}>
                        {group.name}
                      </h3>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: '#7f8c8d',
                        fontSize: '14px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ marginRight: '8px' }}>📍</span>
                        {group.address}
                      </div>
                      {isCreator && (
                        <div style={{
                          display: 'inline-block',
                          backgroundColor: '#3498db',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginTop: '4px'
                        }}>
                          Your Group
                        </div>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <div style={{
                      backgroundColor: isReady ? '#d4f8d4' : '#fff3cd',
                      color: isReady ? '#155724' : '#856404',
                      padding: '12px 20px',
                      borderRadius: '25px',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      border: `2px solid ${isReady ? '#28a745' : '#ffc107'}`,
                      textAlign: 'center',
                      minWidth: '120px'
                    }}>
                      {isReady ? '✅ Ready!' : '⏳ Forming'}
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                        Group Forming Status
                      </span>
                      <span style={{ 
                        color: isReady ? '#28a745' : '#6c757d',
                        fontWeight: 'bold'
                      }}>
                        {group.current_participants || 0} / {group.max_participants}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${((group.current_participants || 0) / group.max_participants) * 100}%`,
                        height: '100%',
                        backgroundColor: isReady ? '#28a745' : '#007bff',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Members Section - both current and invited with cost breakdown */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: group.participants && group.participants.length > 0 && group.invitees && group.invitees.length > 0 ? '1fr 1fr' : '1fr',
                    gap: '20px',
                    marginBottom: '20px'
                  }}>
                    {/* Current Members Section */}
                    {group.participants && group.participants.length > 0 && (
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>Current Members</span>
                          {isReady && group.vendor_id && (() => {
                            const totalMembers = group.current_participants || 0;
                            let totalCost = 0;
                            if (costBreakdowns[group.id] && costBreakdowns[group.id].length > 0) {
                              totalCost = costBreakdowns[group.id][0].individual_cost * costBreakdowns[group.id].length;
                            } else {
                              totalCost = 430; // Fallback value
                            }
                            const costPerMember = totalMembers > 0 ? totalCost / totalMembers : 0;
                            
                            return (
                              <div style={{
                                marginLeft: 'auto',
                                fontSize: '12px',
                                color: '#28a745',
                                fontWeight: 'bold',
                                backgroundColor: '#f0f8ff',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                border: '1px solid #bee5eb'
                              }}>
                                ${costPerMember.toFixed(2)} each
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gap: '8px'
                        }}>
                          {group.participants.map((participant) => {
                            const totalMembers = group.current_participants || 0;
                            let totalCost = 0;
                            if (costBreakdowns[group.id] && costBreakdowns[group.id].length > 0) {
                              totalCost = costBreakdowns[group.id][0].individual_cost * costBreakdowns[group.id].length;
                            } else {
                              totalCost = 430; // Fallback value
                            }
                            const costPerMember = totalMembers > 0 ? totalCost / totalMembers : 0;
                            
                            return (
                              <div key={participant.id} style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #e9ecef'
                              }}>
                                <div style={{ 
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  marginRight: '12px'
                                }}>
                                  {participant.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '14px' }}>
                                    {participant.name}
                                  </div>
                                  <div style={{ color: '#6c757d', fontSize: '12px' }}>
                                    {participant.email}
                                  </div>
                                </div>
                                {isReady && group.vendor_id && (
                                  <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#28a745',
                                    backgroundColor: '#e8f5e8',
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    border: '1px solid #d4edda'
                                  }}>
                                    ${costPerMember.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {isReady && group.vendor_id && (
                          <div style={{ 
                            marginTop: '12px',
                            padding: '12px',
                            backgroundColor: '#e8f5e8',
                            borderRadius: '8px',
                            border: '1px solid #d4edda',
                            fontSize: '13px',
                            color: '#155724'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>💡</span>
                              <div>
                                <strong>Payment Info:</strong> Each member pays their individual amount directly to you using the configured payment method.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Invited Members Section */}
                    {group.invitees && group.invitees.length > 0 && (
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>Invited Members</span>
                          {isReady && group.vendor_id && (() => {
                            const totalMembers = group.max_participants;
                            let totalCost = 0;
                            if (costBreakdowns[group.id] && costBreakdowns[group.id].length > 0) {
                              totalCost = costBreakdowns[group.id][0].individual_cost * costBreakdowns[group.id].length;
                            } else {
                              totalCost = 430; // Fallback value
                            }
                            const costPerMember = totalMembers > 0 ? totalCost / totalMembers : 0;
                            
                            return (
                              <div style={{
                                marginLeft: 'auto',
                                fontSize: '12px',
                                color: '#ffc107',
                                fontWeight: 'bold',
                                backgroundColor: '#fff3cd',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                border: '1px solid #ffeaa7'
                              }}>
                                ${costPerMember.toFixed(2)} each when joined
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gap: '8px'
                        }}>
                          {group.invitees.map((invitee) => {
                            const totalMembers = group.max_participants;
                            let totalCost = 0;
                            if (costBreakdowns[group.id] && costBreakdowns[group.id].length > 0) {
                              totalCost = costBreakdowns[group.id][0].individual_cost * costBreakdowns[group.id].length;
                            } else {
                              totalCost = 430; // Fallback value
                            }
                            const costPerMember = totalMembers > 0 ? totalCost / totalMembers : 0;
                            
                            return (
                              <div key={invitee.id} style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px',
                                backgroundColor: '#fff3cd',
                                borderRadius: '8px',
                                border: '1px solid #ffeaa7'
                              }}>
                                <div style={{ 
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ffc107',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  marginRight: '12px'
                                }}>
                                  {invitee.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '14px' }}>
                                    {invitee.name}
                                  </div>
                                  <div style={{ color: '#6c757d', fontSize: '12px' }}>
                                    {invitee.email}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  {isReady && group.vendor_id && (
                                    <div style={{
                                      fontSize: '14px',
                                      fontWeight: 'bold',
                                      color: '#856404',
                                      backgroundColor: '#fff3cd',
                                      padding: '4px 8px',
                                      borderRadius: '12px',
                                      border: '1px solid #ffeaa7'
                                    }}>
                                      ${costPerMember.toFixed(2)}
                                    </div>
                                  )}
                                  <div style={{
                                    fontSize: '11px',
                                    color: invitee.invitation_sent ? '#28a745' : '#dc3545',
                                    fontWeight: 'bold',
                                    textAlign: 'right'
                                  }}>
                                    {invitee.invitation_sent ? '✓ Invited' : '⏳ Pending'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Vendor Information */}
                  {group.vendor_id && <VendorDetails vendorId={group.vendor_id} groupId={group.id} />}


                  {/* Time Slots Section */}
                  {group.time_slots && group.time_slots.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <span style={{ marginRight: '8px', fontSize: '16px' }}>📅</span>
                        <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>Available Time Slots</span>
                      </div>
                      
                      {/* Always show time slots with interactive features for non-ready groups */}
                      {!isReady ? (
                        <div style={{ 
                          marginLeft: '24px',
                          padding: '16px', 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '10px',
                          border: '1px solid #dee2e6'
                        }}>
                          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#495057' }}>
                            Select your available time slots to help coordinate the group:
                          </div>
                          
                          {group.time_slots.map((slot) => {
                            const isSelected = (userTimeSlotSelections[group.id] || []).includes(slot.id);
                            const analysis = timeSlotAnalyses[group.id]?.find(a => a.time_slot_id === slot.id);
                            
                            return (
                              <div 
                                key={slot.id} 
                                style={{ 
                                  marginBottom: '12px',
                                  padding: '12px',
                                  backgroundColor: analysis?.is_universal ? '#d4f8d4' : 'white',
                                  border: `2px solid ${analysis?.is_universal ? '#28a745' : '#e9ecef'}`,
                                  borderRadius: '8px',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '12px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleTimeSlotToggle(group.id, slot.id)}
                                    style={{ 
                                      marginTop: '2px',
                                      transform: 'scale(1.2)',
                                      accentColor: '#007bff'
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ 
                                      fontWeight: 'bold', 
                                      marginBottom: '4px',
                                      color: '#2c3e50'
                                    }}>
                                      {new Date(slot.start_date).toLocaleDateString()} - {new Date(slot.end_date).toLocaleDateString()}
                                    </div>
                                    {analysis && (
                                      <div style={{ fontSize: '13px', color: '#6c757d' }}>
                                        <div style={{ marginBottom: '2px' }}>
                                          <strong style={{ color: '#495057' }}>{analysis.selected_by_count}</strong> of {group.current_participants} members available
                                        </div>
                                        {analysis.selected_by_users.length > 0 && (
                                          <div style={{ marginBottom: '4px' }}>
                                            <strong>Available:</strong> {analysis.selected_by_users.join(', ')}
                                          </div>
                                        )}
                                        {analysis.is_universal && (
                                          <div style={{ 
                                            color: '#28a745', 
                                            fontWeight: 'bold',
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}>
                                            <span>✅</span> Everyone is available!
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                          
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '12px', 
                            backgroundColor: '#fff3cd', 
                            borderRadius: '8px', 
                            border: '1px solid #ffeaa7'
                          }}>
                            <div style={{ fontSize: '13px', color: '#856404', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <span>💡</span>
                              <div>
                                <strong>Tip:</strong> Green highlighted slots work for all group members. 
                                Select at least one time slot to stay in the group.
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // For ready groups, show time slot selection for creators or final selection for members
                        <div style={{ marginLeft: '24px' }}>
                          {isCreator ? (
                            <>
                              <div style={{ 
                                marginBottom: '12px', 
                                fontSize: '14px', 
                                color: '#495057',
                                padding: '12px',
                                backgroundColor: '#e7f5ff',
                                borderRadius: '8px',
                                border: '1px solid #bee5eb'
                              }}>
                                <strong>Final Step:</strong> Your group is ready! Select one time slot to finalize booking.
                              </div>
                              <div style={{ display: 'grid', gap: '8px' }}>
                                {group.time_slots.map((slot) => {
                                  const analysis = timeSlotAnalyses[group.id]?.find(a => a.time_slot_id === slot.id);
                                  const isSelected = selectedFinalTimeSlots[group.id] === slot.id;
                                  
                                  return (
                                    <div 
                                      key={slot.id} 
                                      onClick={() => handleFinalTimeSlotSelection(group.id, slot.id)}
                                      style={{ 
                                        padding: '12px',
                                        backgroundColor: isSelected ? '#d4edda' : '#f8f9fa',
                                        borderRadius: '8px',
                                        border: `2px solid ${isSelected ? '#28a745' : '#e9ecef'}`,
                                        fontSize: '14px',
                                        color: '#495057',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.backgroundColor = '#e9ecef';
                                          e.currentTarget.style.borderColor = '#adb5bd';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                                          e.currentTarget.style.borderColor = '#e9ecef';
                                        }
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                          <div style={{ fontWeight: '500' }}>
                                            {new Date(slot.start_date).toLocaleDateString()} - {new Date(slot.end_date).toLocaleDateString()}
                                          </div>
                                          {analysis && (
                                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                                              All {analysis.selected_by_count} members available
                                            </div>
                                          )}
                                        </div>
                                        {isSelected && (
                                          <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '18px' }}>✓</div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            // For non-creators, show the final selected time slot or pending selection
                            <div style={{ display: 'grid', gap: '8px' }}>
                              {selectedFinalTimeSlots[group.id] ? (
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: '#d4edda',
                                  borderRadius: '8px',
                                  border: '2px solid #28a745',
                                  fontSize: '14px',
                                  color: '#495057'
                                }}>
                                  <div style={{ fontWeight: 'bold', color: '#28a745', marginBottom: '4px' }}>
                                    ✓ Final Time Slot Selected
                                  </div>
                                  <div>
                                    {(() => {
                                      const selectedSlot = group.time_slots?.find(s => s.id === selectedFinalTimeSlots[group.id]);
                                      return selectedSlot ? `${new Date(selectedSlot.start_date).toLocaleDateString()} - ${new Date(selectedSlot.end_date).toLocaleDateString()}` : '';
                                    })()}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: '#fff3cd',
                                  borderRadius: '8px',
                                  border: '1px solid #ffeaa7',
                                  fontSize: '14px',
                                  color: '#856404'
                                }}>
                                  ⏳ Waiting for group creator to select final time slot...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Action Buttons Section */}
                  <div style={{ 
                    marginTop: '24px',
                    paddingTop: '20px',
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    {/* Left side - Group info */}
                    <div style={{ fontSize: '13px', color: '#6c757d' }}>
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </div>
                    
                    {/* Right side - Action buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {!isCreator ? (
                        // Non-creator actions
                        isReady ? (
                          <div style={{ 
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            Group Full
                          </div>
                        ) : (
                          <button
                            className="button"
                            onClick={() => handleJoinGroup(group.id)}
                            style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '10px 20px',
                              borderRadius: '25px',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#218838';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#28a745';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            Join Group ({(group.current_participants || 0)}/{group.max_participants})
                          </button>
                        )
                      ) : (
                        // Creator actions
                        <>
                          {isReady && selectedFinalTimeSlots[group.id] && (
                            <button
                              className="button"
                              onClick={() => {
                                setBookedServices(prev => new Set([...prev, group.id]));
                                window.open('https://ddumpsters.com/', '_blank');
                              }}
                              style={{
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '25px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#0056b3';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#007bff';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                              title="Complete your group and book the service"
                            >
                              Book Service
                            </button>
                          )}
                          {bookedServices.has(group.id) ? (
                            <button
                              className="button"
                              onClick={() => {
                                setShowPaymentModal({
                                  groupId: group.id,
                                  groupName: group.name
                                });
                                setActualCost('');
                              }}
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '25px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#218838';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#28a745';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              Confirm Booking and Request Payment From Group
                            </button>
                          ) : (
                            <button
                              className="button"
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '25px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
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
                              Delete Group
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

      {showPaymentModal && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ marginTop: 0, color: '#2c3e50', marginBottom: '20px' }}>
              Request Payment from Group: {showPaymentModal.groupName}
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: 'bold', 
                marginBottom: '10px',
                color: '#495057'
              }}>
                Actual Total Cost of Service
              </label>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                Enter the final cost you paid for the dumpster service
              </p>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  color: '#495057',
                  fontWeight: 'bold'
                }}>$</span>
                <input
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '15px 15px 15px 35px',
                    fontSize: '18px',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#007bff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#dee2e6';
                  }}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {actualCost && (
              <div style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Payment Breakdown</h4>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  {(() => {
                    const group = groups.find(g => g.id === showPaymentModal.groupId);
                    const totalMembers = group?.current_participants || 0;
                    const costPerMember = totalMembers > 0 ? parseFloat(actualCost) / totalMembers : 0;
                    
                    return (
                      <>
                        <div style={{ marginBottom: '5px' }}>
                          Total Cost: <strong>${parseFloat(actualCost).toFixed(2)}</strong>
                        </div>
                        <div style={{ marginBottom: '5px' }}>
                          Group Members: <strong>{totalMembers}</strong>
                        </div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          color: '#28a745',
                          marginTop: '10px',
                          padding: '8px',
                          backgroundColor: '#e8f5e8',
                          borderRadius: '4px'
                        }}>
                          Cost per member: ${costPerMember.toFixed(2)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <div style={{
              backgroundColor: '#e7f5ff',
              border: '1px solid #bee5eb',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '25px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#004085' }}>Payment Method</h4>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="zelle"
                    checked={modalPaymentMethod === 'zelle'}
                    onChange={(e) => setModalPaymentMethod(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Zelle</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="venmo"
                    checked={modalPaymentMethod === 'venmo'}
                    onChange={(e) => setModalPaymentMethod(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Venmo</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="cash"
                    checked={modalPaymentMethod === 'cash'}
                    onChange={(e) => setModalPaymentMethod(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Cash</span>
                </label>
              </div>

              {modalPaymentMethod === 'zelle' && (
                <div style={{ marginBottom: '15px' }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Zelle Information:</h5>
                  <input
                    type="email"
                    placeholder="Email address for Zelle"
                    value={modalZelleEmail}
                    onChange={(e) => setModalZelleEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="Phone number for Zelle (optional)"
                    value={modalZellePhone}
                    onChange={(e) => setModalZellePhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              )}

              {modalPaymentMethod === 'venmo' && (
                <div style={{ marginBottom: '15px' }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Venmo Information:</h5>
                  <input
                    type="text"
                    placeholder="Venmo username (e.g., @username)"
                    value={modalVenmoUsername}
                    onChange={(e) => setModalVenmoUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              )}

              {modalPaymentMethod === 'cash' && (
                <div style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                  Members will be notified to arrange cash payment with you directly.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPaymentModal(null);
                  setActualCost('');
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  console.log('Payment request button clicked!', { actualCost, groupId: showPaymentModal?.groupId });
                  
                  if (!actualCost || parseFloat(actualCost) <= 0) {
                    alert('Please enter a valid cost amount');
                    return;
                  }

                  // Validate payment method details
                  if (modalPaymentMethod === 'zelle' && !modalZelleEmail) {
                    alert('Please enter your Zelle email address');
                    return;
                  }
                  if (modalPaymentMethod === 'venmo' && !modalVenmoUsername) {
                    alert('Please enter your Venmo username');
                    return;
                  }
                  
                  try {
                    const group = groups.find(g => g.id === showPaymentModal?.groupId);
                    const totalMembers = group?.current_participants || 0;
                    const costPerMember = parseFloat(actualCost) / totalMembers;
                    
                    // Send payment requests via API
                    console.log('Sending API request to:', `/groups/${showPaymentModal?.groupId}/generate-payment-requests`);
                    const response = await axios.post(`/groups/${showPaymentModal?.groupId}/generate-payment-requests`, {
                      description: "Dumpster rental share",
                      preferred_method: modalPaymentMethod,
                      payment_details: JSON.stringify(getModalPaymentDetails())
                    });
                    
                    console.log('API response:', response.data);
                    
                    setShowPaymentModal(null);
                    setActualCost('');
                    // Reset modal payment method fields
                    setModalPaymentMethod('zelle');
                    setModalZelleEmail('');
                    setModalZellePhone('');
                    setModalVenmoUsername('');
                    setMessage(`Payment requests sent to all group members! Each member will pay $${costPerMember.toFixed(2)}`);
                    setTimeout(() => setMessage(''), 7000);
                  } catch (error: any) {
                    console.error('Error sending payment requests:', error);
                    let errorMessage = 'Error sending payment requests';
                    
                    if (error.response?.data) {
                      if (typeof error.response.data === 'string') {
                        errorMessage = error.response.data;
                      } else if (error.response.data.detail) {
                        errorMessage = typeof error.response.data.detail === 'string' 
                          ? error.response.data.detail 
                          : JSON.stringify(error.response.data.detail);
                      } else if (error.response.data.message) {
                        errorMessage = error.response.data.message;
                      }
                    } else if (error.message) {
                      errorMessage = error.message;
                    }
                    
                    setMessage(errorMessage);
                    setTimeout(() => setMessage(''), 5000);
                  }
                }}
                disabled={!actualCost || parseFloat(actualCost) <= 0}
                style={{
                  padding: '12px 24px',
                  backgroundColor: actualCost && parseFloat(actualCost) > 0 ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: actualCost && parseFloat(actualCost) > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Send Payment Requests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;