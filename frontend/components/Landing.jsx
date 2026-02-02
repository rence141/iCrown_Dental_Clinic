const { useState } = React;

const Landing = () => {
  // Use local state to toggle between Login and Signup within the right panel
  const [isLogin, setIsLogin] = useState(true);

  // Redirect if already logged in
  if (window.currentUser) {
    window.setCurrentPage('dashboard');
    return null;
  }

  return React.createElement('div', { className: 'split-landing' },
    /* Left Panel: Clinic Branding & Features */
    React.createElement('div', { className: 'left-panel' },
      React.createElement('div', { className: 'brand-section' },
        React.createElement('div', { className: 'logo-container' },
          React.createElement('img', { 
            src: 'images/main-logo.png', 
            alt: 'Icrown Logo', 
            className: 'main-logo' 
          })
        ),
        React.createElement('h1', null, 'Icrown Dental Clinic'),
        React.createElement('p', { className: 'tagline' }, 
          'Elevating dental care through modern technology and precision management.'
        ),
        
        React.createElement('div', { className: 'features-list' },
          [
            { icon: '🦷', title: 'Patient Records', desc: 'Secure digital charting' },
            { icon: '📅', title: 'Smart Scheduling', desc: 'Instant appointment booking' },
            { icon: '💰', title: 'Billing & POS', desc: 'Automated invoicing' },
            { icon: '🔒', title: 'Data Security', desc: 'HIPAA compliant storage' }
          ].map((feature, index) => (
            React.createElement('div', { key: index, className: 'feature-item' },
              React.createElement('span', { className: 'feature-icon' }, feature.icon),
              React.createElement('div', null,
                React.createElement('strong', null, feature.title),
                React.createElement('p', null, feature.desc)
              )
            )
          ))
        )
      )
    ),

    /* Right Panel: Authentication */
    React.createElement('div', { className: 'right-panel' },
      React.createElement('div', { className: 'auth-section' },
        React.createElement('div', { className: 'auth-header' },
          React.createElement('h2', null, isLogin ? 'Welcome Back' : 'Join the Team'),
          React.createElement('p', null, isLogin ? 'Sign in to access clinic dashboard' : 'Create a staff account to get started')
        ),

        React.createElement('div', { className: 'auth-toggle-tabs' },
          React.createElement('button', { 
            className: `tab-btn ${isLogin ? 'active' : ''}`,
            onClick: () => setIsLogin(true)
          }, 'Login'),
          React.createElement('button', { 
            className: `tab-btn ${!isLogin ? 'active' : ''}`,
            onClick: () => setIsLogin(false)
          }, 'Sign Up')
        ),

        /* Render the appropriate form based on toggle */
        isLogin ? React.createElement(LoginForm) : React.createElement(SignupForm)
      )
    )
  );
};