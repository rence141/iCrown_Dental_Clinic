const Settings = ({ user, onThemeChange }) => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [themeMode, setThemeMode] = React.useState('manual'); // 'manual', 'auto', 'system'

  React.useEffect(() => {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

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
    
    // Notify parent component if callback exists
    if (onThemeChange) {
      onThemeChange(theme);
    }
  };

  return React.createElement('div', { className: 'settings-page' },
    React.createElement('div', { className: 'settings-header' },
      React.createElement('h1', null, 'Settings'),
      React.createElement('p', { className: 'text-muted' }, 'Manage your application preferences')
    ),
    
    React.createElement('div', { className: 'settings-content' },
      React.createElement('div', { className: 'settings-section' },
        React.createElement('h2', null, 'Appearance'),
        React.createElement('div', { className: 'theme-options' },
          React.createElement('div', { className: 'theme-option' },
            React.createElement('button', {
              className: `theme-btn ${!isDarkMode && themeMode === 'manual' ? 'active' : ''}`,
              onClick: () => setTheme('light')
            },
              React.createElement('i', { className: 'bi bi-sun' }),
              React.createElement('span', null, 'Light Mode')
            )
          ),
          React.createElement('div', { className: 'theme-option' },
            React.createElement('button', {
              className: `theme-btn ${isDarkMode && themeMode === 'manual' ? 'active' : ''}`,
              onClick: () => setTheme('dark')
            },
              React.createElement('i', { className: 'bi bi-moon' }),
              React.createElement('span', null, 'Dark Mode')
            )
          ),
          React.createElement('div', { className: 'theme-option' },
            React.createElement('button', {
              className: `theme-btn ${themeMode === 'system' ? 'active' : ''}`,
              onClick: () => setTheme('system')
            },
              React.createElement('i', { className: 'bi bi-laptop' }),
              React.createElement('span', null, 'System')
            )
          ),
          React.createElement('div', { className: 'theme-option' },
            React.createElement('button', {
              className: `theme-btn ${themeMode === 'auto' ? 'active' : ''}`,
              onClick: () => setTheme('auto')
            },
              React.createElement('i', { className: 'bi bi-cpu' }),
              React.createElement('span', null, 'Auto')
            )
          )
        )
      ),
      
      React.createElement('div', { className: 'settings-section' },
        React.createElement('h2', null, 'Account Information'),
        React.createElement('div', { className: 'account-info' },
          React.createElement('div', { className: 'info-item' },
            React.createElement('label', null, 'Name'),
            React.createElement('p', null, user?.name || 'N/A')
          ),
          React.createElement('div', { className: 'info-item' },
            React.createElement('label', null, 'Email'),
            React.createElement('p', null, user?.email || 'N/A')
          ),
          React.createElement('div', { className: 'info-item' },
            React.createElement('label', null, 'Phone'),
            React.createElement('p', null, user?.phone || 'N/A')
          )
        )
      ),
      
      React.createElement('div', { className: 'settings-section' },
        React.createElement('h2', null, 'About'),
        React.createElement('div', { className: 'about-info' },
          React.createElement('div', { className: 'info-item' },
            React.createElement('label', null, 'Application'),
            React.createElement('p', null, 'iCrown Dental Clinic')
          ),
          React.createElement('div', { className: 'info-item' },
            React.createElement('label', null, 'Version'),
            React.createElement('p', null, '1.0.0')
          )
        )
      )
    )
  );
};

// Make component globally available
window.Settings = Settings;
