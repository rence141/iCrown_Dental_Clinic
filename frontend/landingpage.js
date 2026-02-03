const { useState, useEffect } = React;

/**
 * THEME & DEVICE MANAGEMENT
 */
const ThemeManager = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [themeMode, setThemeMode] = useState('manual'); // 'manual', 'auto', 'system'

  // Helper function to get theme display text
  const getThemeDisplayText = () => {
    switch (themeMode) {
      case 'auto':
        return `Auto (${deviceInfo.type || 'Desktop'})`;
      case 'system':
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return `System (${systemPrefersDark ? 'Dark' : 'Light'})`;
      default:
        return isDarkMode ? 'Dark Mode' : 'Light Mode';
    }
  };

  useEffect(() => {
    // Detect device info
    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      
      let deviceType = 'desktop';
      let osName = 'Unknown';
      
      // Detect device type - more comprehensive detection
      if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(userAgent)) {
        deviceType = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
      } else if (/Windows|Mac|Linux|X11/.test(platform) || /Win|Mac|Linux/.test(userAgent)) {
        deviceType = 'desktop';
      }
      
      // Detect OS - more specific detection
      if (platform.includes('Win') || /Windows/.test(userAgent)) {
        osName = 'Windows';
      } else if (platform.includes('Mac') || /Macintosh|Mac OS X/.test(userAgent)) {
        osName = 'macOS';
      } else if (platform.includes('Linux') || /Linux/.test(userAgent)) {
        osName = 'Linux';
      } else if (/Android/.test(userAgent)) {
        osName = 'Android';
      } else if (/iPhone|iPad|iPod/.test(userAgent)) {
        osName = 'iOS';
      } else {
        osName = platform || 'Unknown OS';
      }
      
      console.log('Device detected:', { deviceType, osName, platform, userAgent }); // Debug log
      
      setDeviceInfo({
        type: deviceType,
        os: osName,
        platform: platform,
        userAgent: userAgent
      });
    };

    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    detectDevice();
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    // Reset to manual mode when manually toggling
    setThemeMode('manual');
  };

  const updateThemeMode = (mode) => {
    // This function will be used by the Landing component
    // We'll implement this in the Landing component since that's where the state is managed
  };

  return {
    isDarkMode,
    deviceInfo,
    toggleTheme,
    themeMode,
    updateThemeMode
  };
};

/**
 * FORM COMPONENTS 
 * Extracted for clarity within the Landing split-view
 */

const LoginForm = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    try {
      if (window.electronAPI && window.electronAPI.onAuthLoggedIn) {
        window.electronAPI.onAuthLoggedIn(async (user) => {
          try {
            console.log('Landingpage received auth:logged-in', user);
            window.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            // Trigger a UI refresh to reflect authenticated state
            window.location.reload();
          } catch (e) {
            console.error('Error handling auth:logged-in in renderer:', e);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const initializeGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    
    try {
      // Get Google OAuth configuration from secure backend API
      console.log('Attempting to fetch Google OAuth configuration...');
      const googleConfig = await window.electronAPI.auth.googleConfig();
      console.log('Google OAuth config received:', googleConfig);
      
      if (!googleConfig || !googleConfig.clientId) {
        console.error('Google OAuth configuration invalid:', googleConfig);
        throw new Error('Google OAuth configuration not available');
      }
      
      // Open Google OAuth in web browser via secure preload API
      // Generate Google OAuth URL using secure configuration
      // Request an ID token directly so the main process can verify and create a session
      const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: googleConfig.clientId,
        redirect_uri: 'http://localhost:3001',
        response_type: 'id_token',
        scope: googleConfig.scope,
        prompt: 'consent',
        nonce: 'nonce-' + Math.random().toString(36).substring(2),
        state: 'google-callback' // Use state parameter instead of path
      }).toString();

      // Open the Google OAuth URL in default browser
      // Prefer opening an in-app OAuth window so we can close it automatically
      if (window.electronAPI && window.electronAPI.openAuthWindow) {
        await window.electronAPI.openAuthWindow(googleAuthUrl);
      } else if (window.electronAPI && window.electronAPI.openExternal) {
        await window.electronAPI.openExternal(googleAuthUrl);
      } else if (window.open) {
        // Fallback for non-Electron environments
        window.open(googleAuthUrl, '_blank');
      } else {
        throw new Error('Cannot open external browser from this environment');
      }
      
      // Show message to user
      setError('Google login opened in your browser. Please complete the login there and return here.');
      
      // Poll for login completion (optional - you can implement a better mechanism)
      const checkLoginStatus = setInterval(async () => {
        try {
          // Check if user is logged in (backend exposes current user)
          const result = window.electronAPI ? await window.electronAPI.auth.getCurrentUser() : null;
          const currentUser = result && result.user ? result.user : null;
          if (currentUser) {
            clearInterval(checkLoginStatus);
            // Persist authenticated user so the app routes to the dashboard after reload
            window.currentUser = currentUser;
            try {
              localStorage.setItem('currentUser', JSON.stringify(currentUser));
              // Mark that this session came from Google OAuth (used as a lightweight session flag)
              if (!localStorage.getItem('sessionId')) {
                localStorage.setItem('sessionId', 'google-oauth-session');
              }
            } catch (e) {
              console.error('Failed to persist Google user to localStorage:', e);
            }
            window.location.reload();
          }
        } catch (error) {
          // Continue checking
        }
      }, 2000);

      // Stop checking after 5 minutes
      setTimeout(() => {
        clearInterval(checkLoginStatus);
        setGoogleLoading(false);
      }, 300000);

    } catch (err) {
      console.error('Google login initialization error:', err);
      setError('Failed to open Google login. Please try again.');
      setGoogleLoading(false);
    }
  };

  // Helper function to render Google Sign-In button
  const renderGoogleSignInButton = () => {
    try {
      // Find or create a container for the Google button
      let buttonContainer = document.getElementById('google-signin-button');
      if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.id = 'google-signin-button';
        buttonContainer.style.cssText = `
          margin-top: 15px;
          text-align: center;
          padding: 10px;
          border-radius: 8px;
          background: #f8f9fa;
        `;
        
        // Insert after the custom Google button in the form
        const customGoogleButton = document.querySelector('.btn-google');
        if (customGoogleButton && customGoogleButton.parentNode) {
          customGoogleButton.parentNode.insertBefore(buttonContainer, customGoogleButton.nextSibling);
        }
      }
      
      // Clear any existing content
      buttonContainer.innerHTML = '';
      
      // Add instruction text
      const instructionText = document.createElement('div');
      instructionText.textContent = 'Click the button below to sign in with Google:';
      instructionText.style.cssText = `
        font-size: 14px;
        color: #666;
        margin-bottom: 10px;
      `;
      buttonContainer.appendChild(instructionText);
      
      // Render the official Google Sign-In button
      window.google.accounts.id.renderButton(buttonContainer, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 300
      });
    } catch (error) {
      console.error('Failed to render Google button:', error);
      setError('Failed to load Google Sign-In button. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation checks
    if (!formData.email.trim()) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      // Call the real login API
      const result = await window.electronAPI.auth.login(formData.email, formData.password);
      
      if (result.user) {
        window.currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        localStorage.setItem('sessionId', result.session.sessionId);
        
        // Force page reload to show dashboard
        window.location.reload();
      } else {
        setError('Invalid email or password.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return React.createElement('div', { className: 'auth-form fade-in' },
    React.createElement('h2', null, 'Welcome to Icrown Dental Clinic'),
    React.createElement('p', { className: 'auth-subtitle' }, 'Please enter your clinic credentials'),
    React.createElement('form', { onSubmit: handleSubmit },
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Email Address'),
        React.createElement('input', {
          type: 'email',
          value: formData.email,
          onChange: (e) => setFormData({...formData, email: e.target.value}),
          placeholder: 'doctor@icrown.com',
          required: true,
          disabled: loading
        })
      ),
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Password'),
        React.createElement('input', {
          type: 'password',
          value: formData.password,
          onChange: (e) => setFormData({...formData, password: e.target.value}),
          placeholder: '••••••••',
          required: true,
          disabled: loading
        })
      ),
      error && React.createElement('div', { className: 'error-message show' }, error),
      React.createElement('button', { 
        type: 'submit', 
        className: 'btn btn-primary btn-full',
        disabled: loading 
      }, loading ? 'Authenticating...' : 'Sign in'),
      
      // Divider
      React.createElement('div', { className: 'auth-divider' },
        React.createElement('span', null, 'OR')
      ),
      
      // Google Sign-In Button
      React.createElement('button', {
        type: 'button',
        className: 'btn btn-google btn-full',
        onClick: () => {
          // Initialize Google Sign-In when button is clicked
          initializeGoogleSignIn();
        },
        disabled: googleLoading
      },
        React.createElement('i', { className: 'bi bi-google me-2' }),
        googleLoading ? 'Opening Google Login...' : 'Sign in with Google (Browser)'
      ),
    )
  );
};

const SignupForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    
    if (!formData.email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    
    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    
    if (!formData.password.trim()) {
      setError('Please enter your password.');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (!agreePrivacy) {
      setError('You must agree to the Privacy Policy.');
      alert('Please read and agree to the Privacy Policy to register.');
      return;
    }
    
    if (!agreeTerms) {
      setError('You must agree to the User Agreement.');
      alert('Please read and agree to the User Agreement to register.');
      return;
    }
    
    setLoading(true);
    try {
      // Call the real registration API
      const result = await window.electronAPI.auth.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      
      if (result.user) {
        // Show success message without exposing credentials
        setShowSuccess(true);
        
        // Clear form
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setAgreePrivacy(false);
        setAgreeTerms(false);
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success message component
  const SuccessMessage = () => React.createElement('div', { className: 'auth-form fade-in' },
    React.createElement('div', { className: 'success-message' },
      React.createElement('div', { className: 'success-icon' },
        React.createElement('i', { className: 'bi bi-check-circle-fill' })
      ),
      React.createElement('h2', null, 'Account Created Successfully!'),
      React.createElement('p', { className: 'success-subtitle' }, 'Your account has been created. You can now log in with your credentials.'),
      
      React.createElement('div', { className: 'success-actions' },
        React.createElement('button', {
          className: 'btn btn-primary',
          onClick: () => {
            // Switch to login tab
            setShowSuccess(false);
            // Trigger parent component to switch tabs
            const event = new CustomEvent('switchToLogin', { detail: {} });
            window.dispatchEvent(event);
          }
        }, 'Go to Login')
      ),
      
      React.createElement('p', { className: 'security-note' },
        React.createElement('i', { className: 'bi bi-shield-check' }),
        ' Your account is secure and ready to use. Please keep your login credentials safe.'
      )
    )
  );

  // Show success message if registration was successful
  if (showSuccess) {
    return React.createElement(SuccessMessage);
  }

  return React.createElement('div', { className: 'auth-form fade-in' },
    React.createElement('h2', null, 'Sign-up'),
    React.createElement('p', { className: 'auth-subtitle' }, 'Create a new account'),
    React.createElement('form', { onSubmit: handleSubmit },
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Full Name'),
        React.createElement('input', {
          type: 'text',
          value: formData.name,
          onChange: (e) => setFormData({...formData, name: e.target.value}),
          required: true
        })
      ),
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Email Address'),
        React.createElement('input', {
          type: 'email',
          value: formData.email,
          onChange: (e) => setFormData({...formData, email: e.target.value}),
          required: true
        })
      ),
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Password'),
        React.createElement('input', {
          type: 'password',
          value: formData.password,
          onChange: (e) => setFormData({...formData, password: e.target.value}),
          required: true
        })
      ),
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Confirm Password'),
        React.createElement('input', {
          type: 'password',
          value: formData.confirmPassword,
          onChange: (e) => setFormData({...formData, confirmPassword: e.target.value}),
          required: true
        })
      ),
      error && React.createElement('div', { className: 'error-message show' }, error),
      
      // Privacy Policy and User Agreement Checkboxes
      React.createElement('div', { className: 'form-group agreement-checkboxes' },
        React.createElement('div', { className: 'checkbox-wrapper' },
          React.createElement('input', {
            type: 'checkbox',
            id: 'privacy-policy',
            checked: agreePrivacy,
            onChange: (e) => setAgreePrivacy(e.target.checked),
            required: true
          }),
          React.createElement('label', { htmlFor: 'privacy-policy', className: 'checkbox-label' },
            'I have read and agree to the ',
            React.createElement('a', { 
              href: 'privacy-policy.html', 
              target: '_blank',
              className: 'link-primary'
            }, 'Privacy Policy')
          )
        ),
        React.createElement('div', { className: 'checkbox-wrapper' },
          React.createElement('input', {
            type: 'checkbox',
            id: 'user-agreement',
            checked: agreeTerms,
            onChange: (e) => setAgreeTerms(e.target.checked),
            required: true
          }),
          React.createElement('label', { htmlFor: 'user-agreement', className: 'checkbox-label' },
            'I have read and agree to the ',
            React.createElement('a', { 
              href: 'user-agreement.html', 
              target: '_blank',
              className: 'link-primary'
            }, 'User Agreement')
          )
        )
      ),
      
      React.createElement('button', { 
        type: 'submit', 
        className: 'btn btn-primary btn-full',
        disabled: loading || !agreePrivacy || !agreeTerms
      }, loading ? 'Creating Account...' : 'Register')
    )
  );
};

/**
 * PAGE COMPONENTS
 */

const Landing = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sliderStyle, setSliderStyle] = useState({});

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  };

  // Update slider position when tab changes
  const updateSliderPosition = (loginTab) => {
    const tabsContainer = document.querySelector('.auth-toggle-tabs');
    if (tabsContainer) {
      const tabs = tabsContainer.querySelectorAll('.tab-btn');
      const activeTab = tabs[loginTab ? 0 : 1];
      if (activeTab) {
        const containerRect = tabsContainer.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        
        setSliderStyle({
          width: `${tabRect.width}px`,
          transform: `translateX(${tabRect.left - containerRect.left - 5}px)`
        });
      }
    }
  };

  // Handle tab switching with slider animation
  const handleTabSwitch = (isLoginTab) => {
    setIsLogin(isLoginTab);
    setTimeout(() => updateSliderPosition(isLoginTab), 50);
  };

  // Initialize slider position after mount
  React.useEffect(() => {
    setTimeout(() => updateSliderPosition(isLogin), 100);
    
    // Handle window resize
    const handleResize = () => updateSliderPosition(isLogin);
    window.addEventListener('resize', handleResize);
    
    // Handle custom events for tab switching
    const handleSwitchToLogin = () => {
      setIsLogin(true);
      setTimeout(() => updateSliderPosition(true), 50);
    };
    window.addEventListener('switchToLogin', handleSwitchToLogin);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('switchToLogin', handleSwitchToLogin);
    };
  }, [isLogin]);

  if (window.currentUser) {
    window.setCurrentPage('dashboard');
    return null;
  }

  return React.createElement('div', { className: 'split-landing' },
    // LEFT: Brand Panel
    React.createElement('div', { className: 'left-panel' },
      React.createElement('div', { className: 'brand-section' },
        React.createElement('div', { className: 'logo-container-title' },
          React.createElement('img', { src: 'images/main-logo-no-bg.png', className: 'main-logo-title' })
        ),
        React.createElement('p', null, 'Comprehensive Dental Management & Patient Records System'),
        React.createElement('h3', { className: 'features-title' }, 'We offer:'),
        React.createElement('div', { className: 'features-list' },
          [
            { icon: 'bi-calendar-check', text: 'Appointment Scheduling' },
            { icon: 'bi-heart-pulse', text: 'Patient Charting' },
            { icon: 'bi-clipboard-data', text: 'Digital Records' },
            { icon: 'bi-shield-lock', text: 'Secure HIPPA-Compliant' }
          ].map((f, i) => React.createElement('div', { key: i, className: 'feature-item' },
            React.createElement('i', { className: `bi ${f.icon} feature-icon` }),
            React.createElement('span', null, f.text)
          ))
        )
      )
    ),
    // RIGHT: Auth Panel
    React.createElement('div', { className: 'right-panel' },
      React.createElement('div', { className: 'auth-container' },
        // Original Theme Dropdown
        React.createElement('div', { className: 'theme-dropdown-right' },
          React.createElement('div', { className: 'dropdown' },
            React.createElement('button', {
              className: 'btn btn-outline-theme dropdown-toggle',
              type: 'button',
              id: 'themeDropdown',
              'data-bs-toggle': 'dropdown',
              'aria-expanded': 'false'
            },
              React.createElement('i', { className: `bi bi-${isDarkMode ? 'sun' : 'moon'} me-2` }),
              isDarkMode ? 'Dark Mode' : 'Light Mode'
            ),
            React.createElement('ul', { className: 'dropdown-menu', 'aria-labelledby': 'themeDropdown' },
              React.createElement('li', null,
                React.createElement('button', {
                  className: `dropdown-item ${!isDarkMode ? 'active' : ''}`,
                  onClick: () => {
                    if (isDarkMode) toggleTheme();
                  }
                },
                  React.createElement('i', { className: 'bi bi-sun me-2' }),
                  'Light Mode'
                )
              ),
              React.createElement('li', null,
                React.createElement('button', {
                  className: `dropdown-item ${isDarkMode ? 'active' : ''}`,
                  onClick: () => {
                    if (!isDarkMode) toggleTheme();
                  }
                },
                  React.createElement('i', { className: 'bi bi-moon me-2' }),
                  'Dark Mode'
                )
              ),
              React.createElement('li', null, React.createElement('hr', { className: 'dropdown-divider' })),
              React.createElement('li', null,
                React.createElement('h6', { className: 'dropdown-header' }, 'Device Options')
              ),
              React.createElement('li', null,
                React.createElement('button', {
                  className: 'dropdown-item',
                  onClick: () => {
                    // Auto theme based on device
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth > 768;
                    
                    let targetTheme;
                    if (isMobile || isTablet) {
                      // Mobile/tablet: prefer dark mode for battery and OLED screens
                      targetTheme = 'dark';
                    } else {
                      // Desktop: follow system preference
                      targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }
                    
                    const shouldSetDark = targetTheme === 'dark';
                    if (shouldSetDark !== isDarkMode) {
                      toggleTheme();
                    }
                  }
                },
                  React.createElement('i', { className: 'bi bi-cpu me-2' }),
                  'Auto for Device'
                )
              )
            )
          )
        ),
        React.createElement('div', { className: 'auth-section' },
          React.createElement('div', { className: 'auth-toggle-tabs' },
            // Yellow sliding rectangle
            React.createElement('div', { 
              className: 'tab-slider', 
              style: sliderStyle 
            }),
            // Tab buttons
            React.createElement('button', { 
              className: `tab-btn ${isLogin ? 'active' : ''}`, 
              onClick: () => handleTabSwitch(true) 
            }, 'Sign In'),
            React.createElement('button', { 
              className: `tab-btn ${!isLogin ? 'active' : ''}`, 
              onClick: () => handleTabSwitch(false) 
            }, 'Register')
          ),
          isLogin ? React.createElement(LoginForm, { key: 'login-form' }) : React.createElement(SignupForm, { key: 'signup-form' })
        )
      )
    )
  );
};

/**
 * ROUTING ENGINE
 */
const App = () => {
  const [currentUser, setCurrentUser] = useState(window.currentUser);
  const [currentPage, setCurrentPage] = useState(window.currentPage);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.currentUser = currentUser;
    window.currentPage = currentPage;
  }, [currentUser, currentPage]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Ask the backend if there is a real, valid logged-in user.
        // This prevents stale localStorage alone from logging someone in.
        const result = window.electronAPI ? await window.electronAPI.auth.getCurrentUser() : null;
        const user = result && result.user ? result.user : null;

        if (user) {
          console.log('Restored authenticated user from backend:', user);
          window.currentUser = user;
          try {
            localStorage.setItem('currentUser', JSON.stringify(user));
            if (!localStorage.getItem('sessionId')) {
              localStorage.setItem('sessionId', 'restored-session');
            }
          } catch (e) {
            console.error('Failed to persist restored user to localStorage:', e);
          }
          setCurrentPage('dashboard');
        } else {
          // No valid backend session – clear any stale client data
          localStorage.removeItem('currentUser');
          localStorage.removeItem('sessionId');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        localStorage.clear();
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) return React.createElement('div', { className: 'loading-screen' }, 'Initializing System...');

  const pages = { landing: Landing, dashboard: CustomerDashboard };
  const CurrentPage = pages[currentPage] || Landing;
  return React.createElement(CurrentPage);
};

// Global State Initializers
window.setCurrentUser = (user) => {
  window.currentUser = user;
  renderApp();
};

window.setCurrentPage = (page) => {
  window.currentPage = page;
  renderApp();
};

let reactRoot = null;

const renderApp = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('Root element not found!');
      return;
    }
    
    // Create root only once
    if (!reactRoot) {
      reactRoot = ReactDOM.createRoot(rootElement);
    }
    
    console.log('Rendering React app...');
    reactRoot.render(React.createElement(App));
    console.log('React app rendered successfully!');
  } catch (error) {
    console.error('Error rendering React app:', error);
  }
};

window.currentUser = null;
window.currentPage = 'landing';
renderApp();