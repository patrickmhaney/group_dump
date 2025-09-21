import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App.tsx';
import ServiceConfirmation from './ServiceConfirmation.tsx';
import ServiceOrderSummary from './ServiceOrderSummary.tsx';
import { formatDateDisplay } from '../utils/dateUtils.ts';

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
  dropoff_dates?: DropoffDate[];
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
  website?: string;
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

interface DropoffDate {
  id: number;
  date: string;
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

interface UserDropoffDateSelection {
  dropoff_date_id: number;
  date: string;
}

interface DropoffDateAnalysis {
  dropoff_date_id: number;
  date: string;
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
  const { user, token, logout } = useContext(AuthContext);
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: user ? `${user.name}'s Group Dump` : '',
    street_address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    zip_code: user?.zip_code || '',
    max_participants: 2,
    vendor_id: '',
    selected_dumpster_size: ''
  });
  const [dropoffDates, setDropoffDates] = useState<DropoffDate[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [userDropoffDateSelections, setUserDropoffDateSelections] = useState<{[groupId: number]: number[]}>({});
  const [dropoffDateAnalyses, setDropoffDateAnalyses] = useState<{[groupId: number]: DropoffDateAnalysis[]}>({});
  const [paymentStatuses, setPaymentStatuses] = useState<{[groupId: number]: GroupPaymentStatus[]}>({});
  const [selectedFinalDropoffDates, setSelectedFinalDropoffDates] = useState<{[groupId: number]: number}>({});
  const [costBreakdowns, setCostBreakdowns] = useState<{[groupId: number]: any}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<{groupId: number; groupName: string; groupAddress: string} | null>(null);
  const [comparisonSize, setComparisonSize] = useState<string>('20');
  const [bookedServices, setBookedServices] = useState<Set<number>>(new Set());
  const [paymentRequestsSent, setPaymentRequestsSent] = useState<Set<number>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState<{groupId: number; groupName: string} | null>(null);
  const [actualCost, setActualCost] = useState<string>('');

  // Group management states
  const [showAddInviteesModal, setShowAddInviteesModal] = useState<{groupId: number; groupName: string} | null>(null);
  const [newInvitees, setNewInvitees] = useState<Invitee[]>([]);

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
    
    // Load payment requests sent state from localStorage
    const savedPaymentRequestsSent = localStorage.getItem('paymentRequestsSent');
    if (savedPaymentRequestsSent) {
      try {
        const parsed = JSON.parse(savedPaymentRequestsSent);
        setPaymentRequestsSent(new Set(parsed));
      } catch (e) {
        console.error('Error loading payment requests state:', e);
      }
    }
  }, []);

  // Update form data when user information becomes available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name ? `${user.name}'s Group Dump` : prev.name,
        street_address: user.address || prev.street_address,
        city: user.city || prev.city,
        state: user.state || prev.state,
        zip_code: user.zip_code || prev.zip_code
      }));
    }
  }, [user]);

  // Auto-load drop off date data for all groups with drop off dates
  useEffect(() => {
    groups.forEach(group => {
      if (group.dropoff_dates && group.dropoff_dates.length > 0) {
        // Load dropoff date data for all groups with dropoff dates
        fetchUserDropoffDateSelections(group.id);
        fetchDropoffDateAnalysis(group.id);
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
      const response = await axios.get('/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          proximity_filter: true
        }
      });
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

  const fetchUserDropoffDateSelections = async (groupId: number) => {
    try {
      const response = await axios.get(`/groups/${groupId}/user-time-slots`);
      const dropoffDateIds = response.data.map((selection: UserDropoffDateSelection) => selection.dropoff_date_id);
      setUserDropoffDateSelections(prev => ({
        ...prev,
        [groupId]: dropoffDateIds
      }));
    } catch (error) {
      console.error('Error fetching user dropoff date selections:', error);
    }
  };

  const fetchDropoffDateAnalysis = async (groupId: number) => {
    try {
      const response = await axios.get(`/groups/${groupId}/time-slot-analysis`);
      setDropoffDateAnalyses(prev => ({
        ...prev,
        [groupId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching dropoff date analysis:', error);
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

  const updateUserDropoffDateSelections = async (groupId: number, dropoffDateIds: number[]) => {
    try {
      await axios.put(`/groups/${groupId}/user-time-slots`, {
        dropoff_date_ids: dropoffDateIds
      });
      
      setUserDropoffDateSelections(prev => ({
        ...prev,
        [groupId]: dropoffDateIds
      }));
      
      // Refresh the analysis to show updated counts
      await fetchDropoffDateAnalysis(groupId);
      
      setMessage('Drop off date selections updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail
        : 'Error updating drop off date selections';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      // Validate that invitees + creator matches selected group size
      const totalMembers = invitees.length + 1; // +1 for the creator
      if (totalMembers < formData.max_participants) {
        const shortfall = formData.max_participants - totalMembers;
        setMessage(`Error: You need to invite at least ${shortfall} more ${shortfall === 1 ? 'person' : 'people'} to reach your selected group size of ${formData.max_participants} members. Currently you have ${totalMembers} ${totalMembers === 1 ? 'member' : 'members'} (including yourself).`);
        setIsSubmitting(false);
        setTimeout(() => setMessage(''), 5000);
        return;
      }

      // Debug: Log current authentication state
      console.log('Current user:', user);
      console.log('Current token:', token ? 'Token present' : 'No token');
      console.log('Axios Authorization header:', axios.defaults.headers.common['Authorization']);
      
      // Prepare group data with simplified payment method details
      const groupData: any = {
        ...formData,
        address: `${formData.street_address}, ${formData.city}, ${formData.state} ${formData.zip_code}`,
        dropoff_dates: dropoffDates,
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
      
      // Create group
      console.log('Sending group data:', JSON.stringify(groupData, null, 2));
      console.log('Making POST request to /groups...');
      const response = await axios.post('/groups', groupData);
      setGroups([response.data, ...groups]);
      setShowCreateForm(false);
      setFormData({ 
        name: user ? `${user.name}'s Group Dump` : '', 
        street_address: user?.address || '', 
        city: user?.city || '', 
        state: user?.state || '', 
        zip_code: user?.zip_code || '', 
        max_participants: 2, 
        vendor_id: '', 
        selected_dumpster_size: '' 
      });
      setDropoffDates([]);
      setInvitees([]);
      setMessage('Group created successfully with payment setup! Invitations have been sent.');
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      console.error('Network error?', !error.response);
      
      let errorMessage = 'Error creating group';
      
      // Check for network/connection errors
      if (!error.response) {
        errorMessage = 'Network error - unable to connect to server. Please check your internet connection.';
      } else if (error.response.status === 401) {
        errorMessage = 'Authentication failed - please log in again.';
        // Auto-logout on authentication failure
        logout();
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied - you don\'t have permission to create groups.';
      } else if (error.response.status >= 500) {
        errorMessage = 'Server error - please try again later.';
      } else if (error.response?.data) {
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
    // Find the group to check if it has drop off dates
    const group = groups.find(g => g.id === groupId);
    if (group && group.dropoff_dates && group.dropoff_dates.length > 0) {
      setMessage('This group has drop off dates that require selection. Please use the invitation link sent to your email to join and select your available drop off dates.');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    try {
      await axios.post(`/groups/${groupId}/join`, {
        dropoff_date_ids: []
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


  const handleAddNewInvitees = async (groupId: number) => {
    if (newInvitees.length === 0 || !newInvitees.some(inv => inv.name && inv.email)) {
      setMessage('Please add at least one invitee with name and email');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const validInvitees = newInvitees.filter(inv => inv.name && inv.email);
      await axios.post(`/groups/${groupId}/add-invitees`, validInvitees);
      setMessage(`Added ${validInvitees.length} new invitees and sent invitations!`);
      setTimeout(() => setMessage(''), 5000);
      setShowAddInviteesModal(null);
      setNewInvitees([]);
      fetchGroups(); // Refresh to show new invitees
    } catch (error: any) {
      const errorMessage = typeof error.response?.data?.detail === 'string'
        ? error.response.data.detail
        : 'Error adding new invitees';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const addNewInvitee = () => {
    setNewInvitees([...newInvitees, { name: '', email: '', phone: '' }]);
  };

  const removeNewInvitee = (index: number) => {
    setNewInvitees(newInvitees.filter((_, i) => i !== index));
  };

  const updateNewInvitee = (index: number, field: keyof Invitee, value: string) => {
    const updatedInvitees = newInvitees.map((invitee, i) => {
      if (i === index) {
        return { ...invitee, [field]: value };
      }
      return invitee;
    });
    setNewInvitees(updatedInvitees);
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

  const addDropoffDate = () => {
    if (dropoffDates.length < 5) {
      const today = new Date();
      const dropoffDate = new Date(today);
      dropoffDate.setDate(today.getDate() + 1);
      const newDate: DropoffDate = {
        id: Date.now(), // Temporary ID for new dates
        date: dropoffDate.toISOString().split('T')[0]
      };
      setDropoffDates([...dropoffDates, newDate]);
    }
  };

  const removeDropoffDate = (index: number) => {
    setDropoffDates(dropoffDates.filter((_, i) => i !== index));
  };

  const updateDropoffDate = (index: number, field: keyof DropoffDate, value: string) => {
    const updatedDates = dropoffDates.map((date, i) => {
      if (i === index) {
        return { ...date, [field]: value };
      }
      return date;
    });
    setDropoffDates(updatedDates);
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

  const handleDropoffDateToggle = (groupId: number, dropoffDateId: number) => {
    const currentSelections = userDropoffDateSelections[groupId] || [];
    const newSelections = currentSelections.includes(dropoffDateId)
      ? currentSelections.filter(id => id !== dropoffDateId)
      : [...currentSelections, dropoffDateId];
    
    updateUserDropoffDateSelections(groupId, newSelections);
  };

  const handleFinalDropoffDateSelection = (groupId: number, dropoffDateId: number) => {
    setSelectedFinalDropoffDates(prev => ({
      ...prev,
      [groupId]: dropoffDateId
    }));
  };


  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        <h1>Welcome, {user?.name}!</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

      <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>{groups.length}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Your Groups</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>{groups.filter(g => (g.current_participants || 0) >= g.max_participants).length}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Ready Groups</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
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
                Group Members
              </label>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                Select the total number of people in your group (including yourself). When this number is reached, the group will be ready to proceed with booking. Only choose "1 Member" if you want to dump alone. 
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
                {[1, 2, 3, 4].map(num => (
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
                      {num === 1 ? '1 Member' : `${num} Members`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Vendor Services Comparison Section */}
            {companies.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                  Compare and Select Dumpster Provider Services
                </label>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Select a dumpster size to compare services across multiple providers in your area.
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
                
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Select a provider and finalize dumpser size. 
                </p>
                
                {/* Services Comparison Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                  gap: '10px',
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
            
            {formData.max_participants !== 1 && (
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                          <div>
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
                          <div>
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
                          <div>
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
                          <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
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
            )}

            <div className="time-slots-section" style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                  Add Potential Drop Off Dates
                </label>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Choose up to 5 different dates when your group could have the dumpster dropped off. 
                  This helps coordinate everyone's schedule.
                </p>
              </div>
              
              {dropoffDates.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '8px'
                }}>
                  <button
                    type="button"
                    className="button"
                    onClick={addDropoffDate}
                    style={{ fontSize: '16px', padding: '12px 24px' }}
                  >
                    Add Your First Drop Off Date
                  </button>
                </div>
              ) : (
                <>
                  <div className="dropoff-dates-list" style={{ marginBottom: '20px' }}>
                    {dropoffDates.map((date, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          marginBottom: '16px', 
                          padding: '20px', 
                          border: '1px solid #e1e5e9', 
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          transition: 'box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '14px', 
                              fontWeight: 'bold',
                              marginBottom: '8px',
                              color: '#495057'
                            }}>
                              Drop Off Date
                            </label>
                            <input
                              type="date"
                              value={date.date}
                              onChange={(e) => updateDropoffDate(index, 'date', e.target.value)}
                              style={{ 
                                width: '100%',
                                padding: '12px 16px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '16px',
                                backgroundColor: '#ffffff',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#d1d5db';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </div>
                          
                          
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeDropoffDate(index)}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc2626';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ef4444';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              ✕ Remove
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
                      onClick={addDropoffDate}
                      disabled={dropoffDates.length >= 5}
                      style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        opacity: dropoffDates.length >= 5 ? 0.6 : 1,
                        cursor: dropoffDates.length >= 5 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      + Add Date ({dropoffDates.length}/5)
                    </button>
                    {dropoffDates.length >= 5 && (
                      <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '8px', fontStyle: 'italic' }}>
                        Maximum of 5 drop off dates reached
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
              
              // Debug logging for creator view issues
              if (isCreator) {
                console.log(`Group ${group.id} (${group.name}):`, {
                  isReady,
                  vendor_id: group.vendor_id,
                  selectedFinalDropoffDate: selectedFinalDropoffDates[group.id],
                  current_participants: group.current_participants,
                  max_participants: group.max_participants,
                  dropoff_dates: group.dropoff_dates
                });
              }
              
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
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: window.innerWidth <= 768 ? 'stretch' : 'flex-start',
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #f0f0f0',
                    gap: window.innerWidth <= 768 ? '12px' : '0'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        color: '#2c3e50',
                        fontSize: window.innerWidth <= 768 ? '18px' : '22px',
                        fontWeight: 'bold',
                        wordWrap: 'break-word',
                        lineHeight: '1.3'
                      }}>
                        {group.name}
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        color: '#7f8c8d',
                        fontSize: '14px',
                        marginBottom: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ marginRight: '8px', flexShrink: 0 }}>📍</span>
                        <span style={{
                          wordWrap: 'break-word',
                          lineHeight: '1.4',
                          flex: 1,
                          minWidth: 0
                        }}>
                          {group.address}
                        </span>
                      </div>
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
                      minWidth: window.innerWidth <= 768 ? 'auto' : '120px',
                      alignSelf: window.innerWidth <= 768 ? 'center' : 'auto',
                      flexShrink: 0
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
                    gridTemplateColumns: group.participants && group.participants.length > 0 && group.invitees && group.invitees.length > 0
                      ? (window.innerWidth <= 768 ? '1fr' : '1fr 1fr')
                      : '1fr',
                    gap: '20px',
                    marginBottom: '20px'
                  }}>
                    {/* Current Members Section */}
                    {group.participants && group.participants.length > 0 && (
                      <div>
                        <div style={{
                          display: 'flex',
                          flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                          alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center',
                          marginBottom: '12px',
                          gap: window.innerWidth <= 768 ? '8px' : '0'
                        }}>
                          <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>Current Members</span>
                          {isReady && group.vendor_id && (() => {
                            const totalMembers = group.current_participants || 0;
                            let totalCost = 0;
                            if (costBreakdowns[group.id] && costBreakdowns[group.id].length > 0) {
                              totalCost = costBreakdowns[group.id][0].amount * costBreakdowns[group.id].length;
                            } else {
                              totalCost = 430; // Fallback value
                            }
                            const costPerMember = totalMembers > 0 ? totalCost / totalMembers : 0;

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
                              totalCost = costBreakdowns[group.id][0].amount * costBreakdowns[group.id].length;
                            } else {
                              totalCost = 430; // Fallback value
                            }
                            const costPerMember = totalMembers > 0 ? totalCost / totalMembers : 0;
                            
                            return (
                              <div key={participant.id} style={{
                                display: 'flex',
                                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                                alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center',
                                padding: window.innerWidth <= 768 ? '16px 12px' : '12px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #e9ecef',
                                gap: window.innerWidth <= 768 ? '12px' : '0'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  width: '100%',
                                  minWidth: 0
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
                                    marginRight: '12px',
                                    flexShrink: 0
                                  }}>
                                    {participant.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontWeight: 'bold',
                                      color: '#2c3e50',
                                      fontSize: '14px',
                                      wordWrap: 'break-word'
                                    }}>
                                      {participant.name}
                                    </div>
                                    <div style={{
                                      color: '#6c757d',
                                      fontSize: '12px',
                                      wordWrap: 'break-word',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {participant.email}
                                    </div>
                                  </div>
                                </div>
                                {isReady && group.vendor_id && (
                                  <div style={{
                                    alignSelf: window.innerWidth <= 768 ? 'center' : 'auto',
                                    flexShrink: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                  }}>
                                    {(() => {
                                      const hasBookedPrice = costBreakdowns[group.id] && costBreakdowns[group.id].length > 0;
                                      const bookedPrice = hasBookedPrice ? costBreakdowns[group.id][0].amount : null;
                                      const hasOverageFees = false; // Will be populated later

                                      return (
                                        <>
                                          <div style={{
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            color: hasBookedPrice ? '#6c757d' : '#28a745',
                                            backgroundColor: hasBookedPrice ? '#f8f9fa' : '#e8f5e8',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            border: hasBookedPrice ? '1px solid #dee2e6' : '1px solid #d4edda',
                                            textAlign: 'center',
                                            minWidth: '140px'
                                          }}>
                                            Listed Price: ${costPerMember.toFixed(2)}
                                          </div>
                                          <div style={{
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            color: hasBookedPrice ? '#28a745' : '#6c757d',
                                            backgroundColor: hasBookedPrice ? '#e8f5e8' : '#f8f9fa',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            border: hasBookedPrice ? '1px solid #d4edda' : '1px solid #dee2e6',
                                            textAlign: 'center',
                                            minWidth: '140px'
                                          }}>
                                            Actual Booked Price: {hasBookedPrice ? `$${bookedPrice.toFixed(2)}` : '--'}
                                          </div>
                                          <div style={{
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            color: hasOverageFees ? '#28a745' : '#6c757d',
                                            backgroundColor: hasOverageFees ? '#e8f5e8' : '#f8f9fa',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            border: hasOverageFees ? '1px solid #d4edda' : '1px solid #dee2e6',
                                            textAlign: 'center',
                                            minWidth: '140px'
                                          }}>
                                            Overage Fees: --
                                          </div>
                                        </>
                                      );
                                    })()}
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
                              totalCost = costBreakdowns[group.id][0].amount * costBreakdowns[group.id].length;
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
                                ~${costPerMember.toFixed(2)} each when joined (estimate)
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
                              totalCost = costBreakdowns[group.id][0].amount * costBreakdowns[group.id].length;
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
                                      ~${costPerMember.toFixed(2)} (estimate)
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
                  {group.vendor_id && (
                    <>
                      <VendorDetails vendorId={group.vendor_id} groupId={group.id} />
                    </>
                  )}
                  {!group.vendor_id && isCreator && (
                    <div style={{ 
                      marginBottom: '20px',
                      padding: '12px',
                      backgroundColor: '#fff3cd',
                      borderRadius: '8px',
                      border: '1px solid #ffeaa7',
                      fontSize: '14px',
                      color: '#856404'
                    }}>
                      ⚠️ No vendor selected for this group. Vendor selection should have been done during group creation.
                    </div>
                  )}


                  {/* Drop Off Dates Section */}
                  {group.dropoff_dates && group.dropoff_dates.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <span style={{ marginRight: '8px', fontSize: '16px' }}>📅</span>
                        <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>Available Time Slots</span>
                      </div>
                      
                      {/* Always show time slots with interactive features for non-ready groups, but disable if payment requests sent */}
                      {!isReady && !paymentRequestsSent.has(group.id) ? (
                        <div style={{ 
                          marginLeft: '24px',
                          padding: '16px', 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '10px',
                          border: '1px solid #dee2e6'
                        }}>
                          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#495057' }}>
                            Select your available drop off dates to help coordinate the group:
                          </div>
                          
                          {group.dropoff_dates.map((date) => {
                            const isSelected = (userDropoffDateSelections[group.id] || []).includes(date.id);
                            const analysis = dropoffDateAnalyses[group.id]?.find(a => a.dropoff_date_id === date.id);
                            
                            return (
                              <div 
                                key={date.id} 
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
                                    onChange={() => handleDropoffDateToggle(group.id, date.id)}
                                    disabled={paymentRequestsSent.has(group.id)}
                                    style={{ 
                                      marginTop: '2px',
                                      transform: 'scale(1.2)',
                                      accentColor: '#007bff',
                                      opacity: paymentRequestsSent.has(group.id) ? 0.5 : 1,
                                      cursor: paymentRequestsSent.has(group.id) ? 'not-allowed' : 'pointer'
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ 
                                      fontWeight: 'bold', 
                                      marginBottom: '4px',
                                      color: '#2c3e50'
                                    }}>
                                      {formatDateDisplay(date.date)}
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
                      ) : paymentRequestsSent.has(group.id) ? (
                        // Show finalized time slots when payment requests have been sent
                        <div style={{ 
                          marginLeft: '24px',
                          padding: '16px', 
                          backgroundColor: '#e7f3ff', 
                          borderRadius: '10px',
                          border: '1px solid #b3d9ff'
                        }}>
                          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#0066cc', fontWeight: 'bold' }}>
                            🔒 Drop off dates finalized after payment requests sent
                          </div>
                          
                          <div style={{ display: 'grid', gap: '8px' }}>
                            {group.dropoff_dates.map((date) => {
                              const isSelected = (userDropoffDateSelections[group.id] || []).includes(date.id);
                              const analysis = dropoffDateAnalyses[group.id]?.find(a => a.dropoff_date_id === date.id);
                              
                              return (
                                <div 
                                  key={date.id} 
                                  style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: isSelected ? '#cce5ff' : '#f0f0f0',
                                    border: `1px solid ${isSelected ? '#80bfff' : '#ddd'}`,
                                    opacity: 0.8
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <div style={{ 
                                      width: '20px', 
                                      height: '20px', 
                                      marginTop: '2px',
                                      borderRadius: '4px',
                                      backgroundColor: isSelected ? '#007bff' : '#ccc',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: 'bold'
                                    }}>
                                      {isSelected ? '✓' : ''}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ 
                                        fontWeight: 'bold', 
                                        marginBottom: '4px',
                                        color: isSelected ? '#0066cc' : '#666'
                                      }}>
                                        {formatDateDisplay(date.date)}
                                      </div>
                                      {analysis && (
                                        <div style={{ 
                                          fontSize: '12px', 
                                          color: '#666',
                                          display: 'flex',
                                          flexWrap: 'wrap',
                                          gap: '4px',
                                          alignItems: 'center'
                                        }}>
                                          <span>Selected by {analysis.selected_by_count} member{analysis.selected_by_count !== 1 ? 's' : ''}:</span>
                                          {analysis.selected_by_users.map((userName, index) => (
                                            <span key={userName} style={{
                                              backgroundColor: '#e9ecef',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              fontSize: '11px'
                                            }}>
                                              {userName}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div style={{
                            marginTop: '12px',
                            padding: '8px',
                            backgroundColor: '#fff3cd',
                            borderRadius: '6px',
                            border: '1px solid #ffeaa7',
                            fontSize: '12px',
                            color: '#856404',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>💡</span>
                            <div>
                              <strong>Note:</strong> Time slot selections are now locked since payment requests have been sent.
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
                                <strong>Final Step:</strong> Your group is ready! Select one drop off date to finalize booking.
                                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                                  💡 You can only select dates where ALL group members are available.
                                </div>
                              </div>

                              {(() => {
                                const universalDates = group.dropoff_dates.filter(date => {
                                  const analysis = dropoffDateAnalyses[group.id]?.find(a => a.dropoff_date_id === date.id);
                                  return analysis?.is_universal;
                                });

                                if (universalDates.length === 0 && dropoffDateAnalyses[group.id]) {
                                  return (
                                    <div style={{
                                      marginBottom: '12px',
                                      padding: '12px',
                                      backgroundColor: '#fff3cd',
                                      borderRadius: '8px',
                                      border: '1px solid #ffeaa7',
                                      fontSize: '14px',
                                      color: '#856404'
                                    }}>
                                      ⚠️ <strong>No dates work for everyone yet!</strong>
                                      <div style={{ marginTop: '4px', fontSize: '12px' }}>
                                        Some group members still need to select their available dates, or you may need to add more date options that work for everyone.
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              <div style={{ display: 'grid', gap: '8px' }}>
                                {group.dropoff_dates.map((date) => {
                                  const analysis = dropoffDateAnalyses[group.id]?.find(a => a.dropoff_date_id === date.id);
                                  const isSelected = selectedFinalDropoffDates[group.id] === date.id;
                                  const isUniversal = analysis?.is_universal || false;
                                  const isSelectable = isUniversal;

                                  return (
                                    <div
                                      key={date.id}
                                      onClick={() => isSelectable ? handleFinalDropoffDateSelection(group.id, date.id) : null}
                                      style={{
                                        padding: '12px',
                                        backgroundColor: isSelected ? '#d4edda' :
                                                         isSelectable ? '#f8f9fa' : '#f5f5f5',
                                        borderRadius: '8px',
                                        border: `2px solid ${isSelected ? '#28a745' :
                                                              isSelectable ? '#e9ecef' : '#ddd'}`,
                                        fontSize: '14px',
                                        color: isSelectable ? '#495057' : '#6c757d',
                                        cursor: isSelectable ? 'pointer' : 'not-allowed',
                                        opacity: isSelectable ? 1 : 0.6,
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSelected && isSelectable) {
                                          e.currentTarget.style.backgroundColor = '#e9ecef';
                                          e.currentTarget.style.borderColor = '#adb5bd';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelected && isSelectable) {
                                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                                          e.currentTarget.style.borderColor = '#e9ecef';
                                        }
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                          <div style={{
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                          }}>
                                            {formatDateDisplay(date.date)}
                                            {!isSelectable && (
                                              <span style={{
                                                fontSize: '12px',
                                                color: '#dc3545',
                                                fontWeight: 'normal'
                                              }}>
                                                ⚠️ Not all members available
                                              </span>
                                            )}
                                          </div>
                                          {analysis && (
                                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                                              {isUniversal ? (
                                                <>✅ All {analysis.selected_by_count} members available</>
                                              ) : (
                                                <>
                                                  {analysis.selected_by_count} of {group.current_participants} members available
                                                  {analysis.selected_by_users.length > 0 && (
                                                    <div style={{ marginTop: '2px', fontSize: '11px' }}>
                                                      Available: {analysis.selected_by_users.join(', ')}
                                                    </div>
                                                  )}
                                                </>
                                              )}
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
                            // For non-creators, show the final selected drop off date or pending selection
                            <div style={{ display: 'grid', gap: '8px' }}>
                              {selectedFinalDropoffDates[group.id] ? (
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: '#d4edda',
                                  borderRadius: '8px',
                                  border: '2px solid #28a745',
                                  fontSize: '14px',
                                  color: '#495057'
                                }}>
                                  <div style={{ fontWeight: 'bold', color: '#28a745', marginBottom: '4px' }}>
                                    ✓ Final Drop Off Date Selected
                                  </div>
                                  <div>
                                    {(() => {
                                      const selectedDate = group.dropoff_dates?.find(d => d.id === selectedFinalDropoffDates[group.id]);
                                      return selectedDate ? formatDateDisplay(selectedDate.date) : '';
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
                                  ⏳ Waiting for group creator to select final drop off date...
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
                          {isReady && !selectedFinalDropoffDates[group.id] && isCreator && !bookedServices.has(group.id) && (
                            <div style={{
                              padding: '12px',
                              backgroundColor: '#d4edda',
                              borderRadius: '8px',
                              border: '1px solid #c3e6cb',
                              fontSize: '14px',
                              color: '#155724',
                              marginBottom: '10px'
                            }}>
                              🎉 Your group is ready! Please select a final dropoff date above to proceed with booking.
                            </div>
                          )}
                          {isReady && selectedFinalDropoffDates[group.id] && (
                            <button
                              className="button"
                              onClick={() => {
                                setBookedServices(prev => new Set([...prev, group.id]));
                                
                                // Find the vendor/company for this group and redirect to their website
                                const vendor = companies.find(company => company.id === group.vendor_id);
                                const websiteUrl = vendor?.website;
                                
                                if (websiteUrl) {
                                  // Ensure URL has protocol
                                  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
                                  window.open(url, '_blank');
                                } else {
                                  // Fallback to default URL if no website is configured
                                  window.open('https://ddumpsters.com/', '_blank');
                                }
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
                          {paymentRequestsSent.has(group.id) ? (
                            <button
                              className="button"
                              onClick={() => {
                                // Find the vendor for this group and redirect to their website
                                const vendor = companies.find(company => company.id === group.vendor_id);
                                const websiteUrl = vendor?.website;
                                
                                if (websiteUrl) {
                                  // Ensure URL has protocol
                                  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
                                  window.open(url, '_blank');
                                } else {
                                  // Fallback to default URL if no website is configured
                                  window.open('https://ddumpsters.com/', '_blank');
                                }
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
                            >
                              Visit {companies.find(company => company.id === group.vendor_id)?.name || 'Vendor'} Website
                            </button>
                          ) : bookedServices.has(group.id) ? (
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {/* Group management buttons for non-ready groups */}
                              {!isReady && isCreator && (
                                <button
                                  className="button"
                                  onClick={() => {
                                    setShowAddInviteesModal({ groupId: group.id, groupName: group.name });
                                    setNewInvitees([{ name: '', email: '', phone: '' }]);
                                  }}
                                  style={{
                                    backgroundColor: '#6f42c1',
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
                                    e.currentTarget.style.backgroundColor = '#5a32a3';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#6f42c1';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}
                                  title="Add more people to your group"
                                >
                                  Add More Invitees
                                </button>
                              )}

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
                            </div>
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
                    
                    // Mark this group as having payment requests sent
                    const newPaymentRequestsSent = new Set(paymentRequestsSent);
                    newPaymentRequestsSent.add(showPaymentModal.groupId);
                    setPaymentRequestsSent(newPaymentRequestsSent);
                    
                    // Save to localStorage for persistence
                    localStorage.setItem('paymentRequestsSent', JSON.stringify(Array.from(newPaymentRequestsSent)));
                    
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

      {/* Add Invitees Modal */}
      {showAddInviteesModal && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ marginTop: 0, color: '#2c3e50', marginBottom: '20px' }}>
              Add More People to: {showAddInviteesModal.groupName}
            </h2>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px', border: '1px solid #d4edda' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#155724' }}>
                💡 <strong>Tip:</strong> Adding more people after creating the group can help you reach your target group size. New invitees will receive invitation emails immediately.
              </p>
            </div>

            <div className="invitees-list" style={{ marginBottom: '20px' }}>
              {newInvitees.map((invitee, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '15px',
                    padding: '20px',
                    border: '2px solid #dee2e6',
                    borderRadius: '12px',
                    backgroundColor: '#f8f9fa'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, color: '#495057' }}>Person {index + 1}</h4>
                    {newInvitees.length > 1 && (
                      <button
                        onClick={() => removeNewInvitee(index)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '30px',
                          height: '30px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Remove this person"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={invitee.name}
                      onChange={(e) => updateNewInvitee(index, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #dee2e6',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={invitee.email}
                      onChange={(e) => updateNewInvitee(index, 'email', e.target.value)}
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

                  <input
                    type="tel"
                    placeholder="Phone Number (Optional)"
                    value={invitee.phone || ''}
                    onChange={(e) => updateNewInvitee(index, 'phone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #dee2e6',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              ))}

              <button
                onClick={addNewInvitee}
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px dashed #007bff',
                  borderRadius: '12px',
                  backgroundColor: 'transparent',
                  color: '#007bff',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                + Add Another Person
              </button>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddInviteesModal(null);
                  setNewInvitees([]);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddNewInvitees(showAddInviteesModal.groupId)}
                disabled={!newInvitees.some(inv => inv.name && inv.email)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: newInvitees.some(inv => inv.name && inv.email) ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: newInvitees.some(inv => inv.name && inv.email) ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Add Invitees & Send Invitations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;