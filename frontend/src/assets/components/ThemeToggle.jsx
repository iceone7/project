import React, { useState } from 'react';
import { useTheme } from '../i18n/ThemeContext';
import '../css/ThemeToggle.css';

function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleDarkMode();
    
    // Reset animation state after animation completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  return (
    <div className="theme-toggle">
      <button 
        onClick={handleToggle}
        className={`theme-toggle-button ${darkMode ? 'dark' : 'light'} ${isAnimating ? 'animating' : ''}`}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        disabled={isAnimating}
      >
        {darkMode ? (
          <span role="img" aria-label="light mode" className="icon-sun">☀️</span>
        ) : (
          <span role="img" aria-label="dark mode" className="icon-moon">🌙</span>
        )}
      </button>
    </div>
  );
}

export default ThemeToggle;