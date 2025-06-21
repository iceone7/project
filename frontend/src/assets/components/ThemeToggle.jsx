import React from 'react';
import { useTheme } from '../i18n/ThemeContext';
import '../css/ThemeToggle.css';

function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="theme-toggle">
      <button 
        onClick={toggleDarkMode}
        className={`theme-toggle-button ${darkMode ? 'dark' : 'light'}`}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? (
          <span role="img" aria-label="light mode">☀️</span>
        ) : (
          <span role="img" aria-label="dark mode">🌙</span>
        )}
      </button>
    </div>
  );
}

export default ThemeToggle;