import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  // Check local storage for saved theme preference, default to light
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // Toggle between dark and light mode
  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };
  // Apply theme to document when darkMode changes
  useEffect(() => {
    const applyTheme = () => {
      if (darkMode) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        
        // Add meta theme-color for browser UI on mobile devices
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', '#222222');
        } else {
          const meta = document.createElement('meta');
          meta.name = 'theme-color';
          meta.content = '#222222';
          document.head.appendChild(meta);
        }
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        
        // Update meta theme-color for browser UI
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', '#ffffff');
        }
      }
    };

    // Add a small delay to allow for animation
    const timer = setTimeout(() => {
      applyTheme();
    }, 50);

    return () => clearTimeout(timer);
  }, [darkMode]);

  const value = {
    darkMode,
    toggleDarkMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}