const { useState, useEffect } = React;

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications] = useState(3);
  
  const userStats = [
    { label: 'Next Appointment', value: 'Oct 24, 2024', sub: 'Dr. Ramos', icon: 'calendar-event', color: 'blue' },
    { label: 'Dental Wellness', value: '92%', sub: 'Above average', icon: 'shield-check', color: 'emerald' },
    { label: 'Account Balance', value: ' 0.00', sub: 'No pending dues', icon: 'credit-card', color: 'indigo' },
    { label: 'Loyalty Tier', value: 'Gold', sub: '150 Points', icon: 'award', color: 'amber' }
  ];

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: 'grid-1x2' },
    { id: 'appointments', label: 'Appointments', icon: 'calendar3', badge: 2 },
    { id: 'records', label: 'Medical History', icon: 'file-earmark-medical' },
    { id: 'billing', label: 'Payments', icon: 'wallet2' },
    { id: 'settings', label: 'Settings', icon: 'gear' }
  ];

  const handleLogout = async () => {
    try {
      // Clear session data
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        await window.electronAPI.auth.logout(sessionId).catch(() => {
          console.log('Logout API not available, clearing local storage only');
        });
      }
      
      // Clear all local storage
      localStorage.clear();
      
      // Clear global state
      window.currentUser = null;
      window.currentPage = 'landing';
      
      // Force page reload to reset the app
      window.location.reload();
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API fails
      localStorage.clear();
      window.currentUser = null;
      window.currentPage = 'landing';
      window.location.reload();
    }
  };

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

      React.createElement('nav', { className: 'sidebar-nav-list' },
        menuItems.map(item => 
          React.createElement('button', {
            key: item.id,
            className: `nav-link ${activeTab === item.id ? 'active' : ''}`,
            onClick: () => setActiveTab(item.id)
          },
            React.createElement('i', { className: `bi bi-${item.icon}` }),
            React.createElement('span', null, item.label),
            item.badge && React.createElement('span', { className: 'badge-pill' }, item.badge)
          )
        )
      ),

      React.createElement('div', { className: 'sidebar-footer' },
        React.createElement('div', { className: 'user-profile-sm' },
          React.createElement('div', { className: 'avatar-circle' }, 'JR'),
          React.createElement('div', { className: 'user-details' },
            React.createElement('p', { className: 'u-name' }, 'Juan Ramos'),
            React.createElement('p', { className: 'u-role' }, 'Patient #8821')
          ),
          React.createElement('button', { className: 'btn-logout', onClick: handleLogout }, 
            React.createElement('i', { className: 'bi bi-box-arrow-right' })
          )
        )
      )
    ),

    /* --- MAIN CONTENT --- */
    React.createElement('main', { className: 'pro-main' },
      /* Top Bar */
      React.createElement('header', { className: 'pro-topbar' },
        React.createElement('div', null,
          React.createElement('h1', null, 'Welcome back, Juan'),
          React.createElement('p', { className: 'text-muted' }, 'Here is what is happening with your dental health today.')
        ),
        React.createElement('div', { className: 'topbar-actions' },
          React.createElement('button', { className: 'btn-icon-outline' }, 
            React.createElement('i', { className: 'bi bi-bell' }),
            notifications > 0 && React.createElement('span', { className: 'dot' })
          ),
          React.createElement('button', { className: 'btn-primary-pro' }, 'Book Appointment')
        )
      ),

      /* Stats Grid */
      React.createElement('div', { className: 'pro-stats-grid' },
        userStats.map((stat, i) => 
          React.createElement('div', { key: i, className: `stat-card-pro ${stat.color}` },
            React.createElement('div', { className: 'stat-icon-wrapper' }, 
              React.createElement('i', { className: `bi bi-${stat.icon}` })
            ),
            React.createElement('div', { className: 'stat-data' },
              React.createElement('label', null, stat.label),
              React.createElement('h3', null, stat.value),
              React.createElement('span', { className: 'stat-sub' }, stat.sub)
            )
          )
        )
      ),

      /* Bottom Layout */
      React.createElement('div', { className: 'pro-content-grid' },
        /* Main Section */
        React.createElement('section', { className: 'pro-card main-table' },
          React.createElement('h2', null, 'Recent Procedures'),
          React.createElement('table', { className: 'pro-table' },
            React.createElement('thead', null,
              React.createElement('tr', null, 
                ['Service', 'Date', 'Dentist', 'Status'].map(h => React.createElement('th', { key: h }, h))
              )
            ),
            React.createElement('tbody', null,
              [
                { service: 'Teeth Whitening', date: 'Aug 12', doc: 'Dr. Ramos', status: 'Completed' },
                { service: 'Routine Checkup', date: 'Feb 14', doc: 'Dr. Santos', status: 'Completed' }
              ].map((row, i) => React.createElement('tr', { key: i },
                React.createElement('td', { className: 'font-medium' }, row.service),
                React.createElement('td', null, row.date),
                React.createElement('td', null, row.doc),
                React.createElement('td', null, 
                  React.createElement('span', { className: 'pro-badge success' }, row.status)
                )
              ))
            )
          )
        ),

        /* Side Section */
        React.createElement('aside', { className: 'pro-card health-card' },
          React.createElement('h3', null, 'Health Insights'),
          React.createElement('div', { className: 'insight-item' },
            React.createElement('div', { className: 'insight-icon' }, '✨'),
            React.createElement('div', null,
              React.createElement('h4', null, 'Maintenance Tip'),
              React.createElement('p', null, 'Your next cleaning is due in 3 months. Early booking is recommended.')
            )
          ),
          React.createElement('button', { className: 'btn-outline-full mt-4' }, 'View Care Guide')
        )
      )
    )
  );
};
