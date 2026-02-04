const { useState, useEffect } = React;

const CustomerDashboard = () => {
  // --- Dynamic User Data (must be declared before using in state initializers) ---
  const user = window.currentUser || {};

  const [activeTab, setActiveTab] = useState('overview');
  const [showBooking, setShowBooking] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [treatmentHistory, setTreatmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeMode, setThemeMode] = useState('manual'); // 'manual', 'auto', 'system'
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    dob: user.dob || ''
  });

  const userName = user.name || 'Valued Customer';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'VC';
  const patientId = user.id ? `#${String(user.id).padStart(4, '0')}` : 'Patient';
  const firstName = userName.split(' ')[0];

  // --- Load Data ---
  useEffect(() => {
    loadCustomerData();
    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // --- Theme Management ---
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    setThemeMode('manual');
  };

  const setTheme = (theme) => {
    if (theme === 'auto') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldSetDark = systemPrefersDark;
      setIsDarkMode(shouldSetDark);
      document.documentElement.setAttribute('data-theme', shouldSetDark ? 'dark' : 'light');
      localStorage.removeItem('theme');
      setThemeMode('auto');
    } else if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(systemPrefersDark);
      document.documentElement.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
      localStorage.removeItem('theme');
      setThemeMode('system');
    } else {
      // manual light/dark
      const shouldSetDark = theme === 'dark';
      setIsDarkMode(shouldSetDark);
      localStorage.setItem('theme', shouldSetDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', shouldSetDark ? 'dark' : 'light');
      setThemeMode('manual');
    }
  };

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      // Load appointments
      if (window.electronAPI && user && user.id) {
        // Load the most accurate user profile from the backend (including Google data)
        try {
          const freshProfile = await window.electronAPI.user.getProfile(user.id);
          if (freshProfile) {
            const mergedUser = { ...user, ...freshProfile };
            window.currentUser = mergedUser;
            try {
              localStorage.setItem('currentUser', JSON.stringify(mergedUser));
            } catch (e) {
              console.error('Failed to persist refreshed profile:', e);
            }
            // Update derived state for profile form
            setProfileForm({
              name: mergedUser.name || '',
              email: mergedUser.email || '',
              phone: mergedUser.phone || '',
              dob: mergedUser.dob || ''
            });
          }
        } catch (e) {
          console.error('Failed to load fresh user profile:', e);
        }

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
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'settings', label: 'Settings', icon: 'gear' }
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
  const renderSettings = () => {
    if (window.Settings) {
      return React.createElement(window.Settings, { 
        user: user,
        onThemeChange: setTheme 
      });
    }
    return React.createElement('div', null, 'Loading settings...');
  };
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
          React.createElement('input', {
            type: 'text',
            className: 'form-control',
            value: profileForm.name,
            onChange: (e) => setProfileForm({ ...profileForm, name: e.target.value })
          })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Email'),
          React.createElement('input', {
            type: 'email',
            className: 'form-control',
            value: profileForm.email,
            onChange: (e) => setProfileForm({ ...profileForm, email: e.target.value })
          })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Phone'),
          React.createElement('input', {
            type: 'tel',
            className: 'form-control',
            value: profileForm.phone,
            onChange: (e) => setProfileForm({ ...profileForm, phone: e.target.value })
          })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Date of Birth'),
          React.createElement('input', {
            type: 'date',
            className: 'form-control',
            value: profileForm.dob || '',
            onChange: (e) => setProfileForm({ ...profileForm, dob: e.target.value })
          })
        ),
        profileError && React.createElement('div', { className: 'error-message show' }, profileError),
        profileSuccess && React.createElement('div', { className: 'success-message show' }, profileSuccess),
        React.createElement('div', { className: 'form-actions' },
          React.createElement('button', {
            className: 'btn-primary',
            disabled: profileSaving,
            onClick: async () => {
              setProfileError('');
              setProfileSuccess('');
              setProfileSaving(true);
              try {
                if (!profileForm.name.trim()) {
                  throw new Error('Full Name is required.');
                }
                if (!profileForm.email.trim()) {
                  throw new Error('Email is required.');
                }
                if (!profileForm.email.includes('@') || !profileForm.email.includes('.')) {
                  throw new Error('Please enter a valid email address.');
                }

                if (window.electronAPI && window.electronAPI.user && window.electronAPI.user.updateProfile) {
                  const updated = await window.electronAPI.user.updateProfile(user.id, {
                    name: profileForm.name.trim(),
                    email: profileForm.email.trim()
                    // phone and dob can be wired later when backend supports them
                  });

                  const mergedUser = { ...user, ...updated, phone: profileForm.phone, dob: profileForm.dob };
                  window.currentUser = mergedUser;
                  try {
                    localStorage.setItem('currentUser', JSON.stringify(mergedUser));
                  } catch (e) {
                    console.error('Failed to persist updated profile:', e);
                  }

                  setProfileSuccess('Profile updated successfully.');
                } else {
                  throw new Error('Profile update service is not available.');
                }
              } catch (err) {
                console.error('Profile update failed:', err);
                setProfileError(err.message || 'Failed to update profile. Please try again.');
              } finally {
                setProfileSaving(false);
              }
            }
          }, profileSaving ? 'Saving…' : 'Save Changes'),
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
      case 'settings': return renderSettings();
      default: return renderOverview();
    }
  };

  const handleLogout = async () => {
    try {
      // Prefer logging out all sessions for this user on the backend
      if (user && user.id && window.electronAPI && window.electronAPI.auth && window.electronAPI.auth.logoutAll) {
        try {
          await window.electronAPI.auth.logoutAll(user.id);
        } catch (e) {
          console.error('Backend logoutAll failed (continuing client-side cleanup):', e);
        }
      } else {
        // Fallback: try single-session logout if we have a sessionId
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId && window.electronAPI && window.electronAPI.auth && window.electronAPI.auth.logout) {
          try {
            await window.electronAPI.auth.logout(sessionId);
          } catch (e) {
            console.error('Backend logout failed (continuing client-side cleanup):', e);
          }
        }
      }
    } finally {
      // Clear client-side auth state
      localStorage.removeItem('currentUser');
      localStorage.removeItem('sessionId');
      window.currentUser = null;
      window.currentPage = 'landing';
      window.location.reload();
    }
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
