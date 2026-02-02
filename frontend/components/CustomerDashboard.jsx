const { useState, useEffect } = React;

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showBooking, setShowBooking] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [treatmentHistory, setTreatmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Dynamic User Data ---
  const user = window.currentUser || {};
  const userName = user.name || 'Valued Customer';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'VC';
  const patientId = user.id ? `#${String(user.id).padStart(4, '0')}` : 'Patient';
  const firstName = userName.split(' ')[0];

  // --- Load Data ---
  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      // Load appointments
      if (window.electronAPI) {
        const userAppointments = await window.electronAPI.invoke('appointment:getByPatient', user.id);
        setAppointments(userAppointments || []);
        
        // Load payments (mock data for now)
        setPayments([
          {
            id: '1',
            type: 'advance',
            appointmentId: 'apt_001',
            amount: 1500,
            status: 'paid',
            date: '2024-01-15',
            description: 'Advance payment for Dental Cleaning'
          },
          {
            id: '2',
            type: 'remaining',
            appointmentId: 'apt_002',
            amount: 500,
            status: 'pending',
            date: '2024-01-20',
            description: 'Remaining balance for Teeth Whitening'
          }
        ]);
        
        // Load treatment history (mock data for now)
        setTreatmentHistory([
          {
            id: '1',
            date: '2024-01-10',
            treatment: 'Dental Cleaning',
            dentist: 'Dr. Ramos',
            notes: 'Routine cleaning completed. Patient oral health is good.',
            status: 'completed'
          },
          {
            id: '2',
            date: '2024-01-05',
            treatment: 'Consultation',
            dentist: 'Dr. Santos',
            notes: 'Initial consultation for braces. X-rays taken.',
            status: 'completed'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Menu Items ---
  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: 'grid-1x2' },
    { id: 'book-appointment', label: 'Book Appointment', icon: 'calendar-plus', action: () => setShowBooking(true) },
    { id: 'appointments', label: 'My Appointments', icon: 'calendar3', badge: appointments.filter(a => a.status === 'pending').length },
    { id: 'payments', label: 'Payments', icon: 'wallet2', badge: payments.filter(p => p.status === 'pending').length },
    { id: 'treatment-history', label: 'Treatment History', icon: 'file-earmark-medical' },
    { id: 'profile', label: 'Profile', icon: 'person' }
  ];

  // --- Helper Functions ---
  const getNextAppointment = () => {
    const nextApt = appointments.find(a => a.status === 'scheduled' && new Date(a.date) > new Date());
    return nextApt ? new Date(nextApt.date).toLocaleDateString() : 'No upcoming';
  };

  const getNextAppointmentDentist = () => {
    const nextApt = appointments.find(a => a.status === 'scheduled' && new Date(a.date) > new Date());
    return nextApt ? nextApt.dentist || 'Dr. Ramos' : '';
  };

  const getPendingBalance = () => {
    const pending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    return `₱${pending.toLocaleString()}`;
  };

  const getPendingPaymentsCount = () => {
    return payments.filter(p => p.status === 'pending').length;
  };

  const getCompletedTreatmentsCount = () => {
    return treatmentHistory.filter(t => t.status === 'completed').length;
  };

  // --- Stats Data ---
  const userStats = [
    { label: 'Next Appointment', value: getNextAppointment(), sub: getNextAppointmentDentist(), icon: 'calendar-event', color: 'blue' },
    { label: 'Pending Balance', value: getPendingBalance(), sub: `${getPendingPaymentsCount()} payment(s)`, icon: 'credit-card', color: 'red' },
    { label: 'Completed Treatments', value: getCompletedTreatmentsCount(), sub: 'This year', icon: 'check-circle', color: 'green' },
    { label: 'Loyalty Points', value: '150', sub: 'Gold Tier', icon: 'award', color: 'amber' }
  ];

  // --- Tab Content Components ---
  const renderOverview = () => React.createElement('div', { className: 'dashboard-content' },
    React.createElement('div', { className: 'welcome-section' },
      React.createElement('h1', null, `Welcome back, ${firstName}!`),
      React.createElement('p', { className: 'text-muted' }, 'Here\'s your dental health overview and quick actions.')
    ),
    React.createElement('div', { className: 'quick-actions' },
      React.createElement('button', { className: 'action-card primary', onClick: () => setShowBooking(true) },
        React.createElement('i', { className: 'bi bi-calendar-plus' }),
        React.createElement('div', null,
          React.createElement('h3', null, 'Book Appointment'),
          React.createElement('p', null, 'Schedule your next visit')
        )
      ),
      React.createElement('button', { className: 'action-card', onClick: () => setActiveTab('appointments') },
        React.createElement('i', { className: 'bi bi-calendar3' }),
        React.createElement('div', null,
          React.createElement('h3', null, 'View Appointments'),
          React.createElement('p', null, 'Manage your bookings')
        )
      ),
      React.createElement('button', { className: 'action-card', onClick: () => setActiveTab('payments') },
        React.createElement('i', { className: 'bi bi-wallet2' }),
        React.createElement('div', null,
          React.createElement('h3', null, 'Make Payment'),
          React.createElement('p', null, 'Pay advance or balance')
        )
      )
    ),
    React.createElement('div', { className: 'pro-stats-grid' },
      userStats.map((stat, i) => 
        React.createElement('div', { key: i, className: `stat-card-pro ${stat.color}` },
          React.createElement('div', { className: 'stat-icon-wrapper' }, 
            React.createElement('i', { className: `bi bi-${stat.icon}` })
          ),
          React.createElement('div', { className: 'stat-content' },
            React.createElement('div', { className: 'stat-value' }, stat.value),
            React.createElement('div', { className: 'stat-label' }, stat.label),
            React.createElement('div', { className: 'stat-sub' }, stat.sub)
          )
        )
      )
    )
  );

  const renderAppointments = () => {
    const pendingAppointments = appointments.filter(a => a.status === 'pending' || a.status === 'scheduled');
    const approvedAppointments = appointments.filter(a => a.status === 'approved');
    const completedAppointments = appointments.filter(a => a.status === 'completed');

    return React.createElement('div', { className: 'appointments-content' },
      React.createElement('h2', null, 'My Appointments'),
      React.createElement('div', { className: 'appointment-tabs' },
        React.createElement('button', { className: 'tab-btn active' }, `Pending (${pendingAppointments.length})`),
        React.createElement('button', { className: 'tab-btn' }, `Approved (${approvedAppointments.length})`),
        React.createElement('button', { className: 'tab-btn' }, `Completed (${completedAppointments.length})`)
      ),
      React.createElement('div', { className: 'appointments-list' },
        pendingAppointments.length > 0 ? pendingAppointments.map(apt => 
          React.createElement('div', { key: apt.id, className: 'appointment-card pending' },
            React.createElement('div', { className: 'appointment-date' },
              React.createElement('div', { className: 'date-day' }, new Date(apt.date).getDate()),
              React.createElement('div', { className: 'date-month' }, new Date(apt.date).toLocaleDateString('en', { month: 'short' }))
            ),
            React.createElement('div', { className: 'appointment-details' },
              React.createElement('h4', null, apt.service || 'Dental Cleaning'),
              React.createElement('p', null, `${apt.time || '10:00 AM'} • ${apt.dentist || 'Dr. Ramos'}`),
              React.createElement('span', { className: 'status-badge pending' }, 'Pending Confirmation')
            ),
            React.createElement('div', { className: 'appointment-actions' },
              React.createElement('button', { className: 'btn-sm btn-outline' }, 'Reschedule'),
              React.createElement('button', { className: 'btn-sm btn-danger' }, 'Cancel')
            )
          )
        ) : React.createElement('div', { className: 'empty-state' },
          React.createElement('i', { className: 'bi bi-calendar-x' }),
          React.createElement('p', null, 'No pending appointments'),
          React.createElement('button', { className: 'btn-primary', onClick: () => setShowBooking(true) }, 'Book Appointment')
        )
      )
    );
  };

  const renderPayments = () => React.createElement('div', { className: 'payments-content' },
    React.createElement('h2', null, 'Payments'),
    React.createElement('div', { className: 'payment-summary' },
      React.createElement('div', { className: 'summary-card' },
        React.createElement('h3', null, 'Total Pending'),
        React.createElement('div', { className: 'amount' }, getPendingBalance()),
        React.createElement('button', { className: 'btn-primary' }, 'Pay All')
      ),
      React.createElement('div', { className: 'summary-card' },
        React.createElement('h3', null, 'Payment Methods'),
        React.createElement('div', { className: 'payment-methods' },
          React.createElement('button', { className: 'method-btn' },
            React.createElement('i', { className: 'bi bi-credit-card' }),
            'Credit Card'
          ),
          React.createElement('button', { className: 'method-btn' },
            React.createElement('i', { className: 'bi bi-wallet' }),
            'GCash'
          ),
          React.createElement('button', { className: 'method-btn' },
            React.createElement('i', { className: 'bi bi-cash' }),
            'Cash'
          )
        )
      )
    ),
    React.createElement('div', { className: 'payments-list' },
      React.createElement('h3', null, 'Recent Transactions'),
      payments.map(payment => 
        React.createElement('div', { key: payment.id, className: 'payment-item' },
          React.createElement('div', { className: 'payment-info' },
            React.createElement('h4', null, payment.description),
            React.createElement('p', null, `${payment.date} • ${payment.type === 'advance' ? 'Advance Payment' : 'Remaining Balance'}`)
          ),
          React.createElement('div', { className: 'payment-amount' },
            React.createElement('span', { className: `amount ${payment.status}` }, `₱${payment.amount.toLocaleString()}`),
            React.createElement('span', { className: `status ${payment.status}` }, payment.status)
          ),
          payment.status === 'pending' && React.createElement('button', { className: 'btn-sm btn-primary' }, 'Pay Now')
        )
      )
    )
  );

  const renderTreatmentHistory = () => React.createElement('div', { className: 'treatment-history-content' },
    React.createElement('h2', null, 'Treatment History'),
    React.createElement('div', { className: 'treatment-timeline' },
      treatmentHistory.map(treatment => 
        React.createElement('div', { key: treatment.id, className: 'timeline-item' },
          React.createElement('div', { className: 'timeline-date' },
            React.createElement('div', { className: 'date' }, new Date(treatment.date).toLocaleDateString()),
            React.createElement('div', { className: 'time' }, new Date(treatment.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }))
          ),
          React.createElement('div', { className: 'timeline-content' },
            React.createElement('div', { className: 'treatment-card' },
              React.createElement('div', { className: 'treatment-header' },
                React.createElement('h3', null, treatment.treatment),
                React.createElement('span', { className: 'status-badge completed' }, 'Completed')
              ),
              React.createElement('div', { className: 'treatment-details' },
                React.createElement('p', null, `Dentist: ${treatment.dentist}`),
                React.createElement('p', null, treatment.notes)
              ),
              React.createElement('div', { className: 'treatment-actions' },
                React.createElement('button', { className: 'btn-sm btn-outline' }, 'View Details'),
                React.createElement('button', { className: 'btn-sm btn-outline' }, 'Download Report')
              )
            )
          )
        )
      )
    )
  );

  const renderProfile = () => React.createElement('div', { className: 'profile-content' },
    React.createElement('h2', null, 'Profile Management'),
    React.createElement('div', { className: 'profile-section' },
      React.createElement('div', { className: 'profile-header' },
        React.createElement('div', { className: 'avatar' }, userInitials),
        React.createElement('div', { className: 'profile-info' },
          React.createElement('h3', null, userName),
          React.createElement('p', null, `Patient ID: ${patientId}`),
          React.createElement('span', { className: 'status-badge gold' }, 'Gold Member')
        )
      ),
      React.createElement('div', { className: 'profile-form' },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Full Name'),
          React.createElement('input', { type: 'text', defaultValue: userName, className: 'form-control' })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Email'),
          React.createElement('input', { type: 'email', defaultValue: user.email, className: 'form-control' })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Phone'),
          React.createElement('input', { type: 'tel', defaultValue: user.phone || '', className: 'form-control' })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Date of Birth'),
          React.createElement('input', { type: 'date', defaultValue: user.dob || '', className: 'form-control' })
        ),
        React.createElement('div', { className: 'form-actions' },
          React.createElement('button', { className: 'btn-primary' }, 'Save Changes'),
          React.createElement('button', { className: 'btn-outline' }, 'Change Password')
        )
      )
    )
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'appointments': return renderAppointments();
      case 'payments': return renderPayments();
      case 'treatment-history': return renderTreatmentHistory();
      case 'profile': return renderProfile();
      default: return renderOverview();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.currentUser = null;
    window.location.reload();
  };

  if (loading) {
    return React.createElement('div', { className: 'loading-container' },
      React.createElement('div', { className: 'spinner' }),
      React.createElement('p', null, 'Loading your dashboard...')
    );
  }

  return React.createElement('div', { className: 'pro-dashboard' },
    /* --- SIDEBAR --- */
    React.createElement('aside', { className: 'pro-sidebar' },
      React.createElement('div', { className: 'sidebar-brand-wrapper' },
        React.createElement('div', { className: 'brand-logo' }, 'IC'),
        React.createElement('div', { className: 'brand-info' },
          React.createElement('span', { className: 'brand-title' }, 'iCrown Dental'),
          React.createElement('span', { className: 'brand-subtitle' }, 'Patient Portal')
        )
      ),
      React.createElement('nav', { className: 'sidebar-nav' },
        menuItems.map(item => 
          React.createElement('button', {
            key: item.id,
            className: `nav-item ${activeTab === item.id ? 'active' : ''}`,
            onClick: item.action || (() => setActiveTab(item.id))
          },
            React.createElement('i', { className: `bi bi-${item.icon}` }),
            React.createElement('span', null, item.label),
            item.badge && React.createElement('span', { className: 'nav-badge' }, item.badge)
          )
        )
      ),
      React.createElement('div', { className: 'sidebar-footer' },
        React.createElement('div', { className: 'user-profile' },
          React.createElement('div', { className: 'user-avatar' }, userInitials),
          React.createElement('div', { className: 'user-info' },
            React.createElement('span', { className: 'user-name' }, userName),
            React.createElement('span', { className: 'user-role' }, 'Patient')
          )
        ),
        React.createElement('button', { className: 'logout-btn', onClick: handleLogout },
          React.createElement('i', { className: 'bi bi-box-arrow-right' }),
          'Logout'
        )
      )
    ),

    /* --- MAIN CONTENT --- */
    React.createElement('main', { className: 'pro-main' },
      renderContent()
    ),

    /* --- BOOKING CALENDAR OVERLAY --- */
    showBooking && React.createElement('div', { className: 'booking-overlay' },
      React.createElement('div', { className: 'booking-backdrop', onClick: () => setShowBooking(false) }),
      React.createElement('div', { className: 'booking-content' },
        React.createElement('button', { 
          className: 'btn-close-booking',
          onClick: () => setShowBooking(false) 
        }, React.createElement('i', { className: 'bi bi-x-lg' })),
        window.BookingCalendarComponent ? 
          React.createElement(window.BookingCalendarComponent) :
          React.createElement('div', null, 'Loading calendar...')
      )
    )
  );
};

// Make component globally available
window.CustomerDashboard = CustomerDashboard;
