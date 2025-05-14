import React from 'react';

const PulsingIndicator = ({ isActive, size = 20, color = '#4285F4' }) => {
  return isActive ? (
    <div 
      className="pulsing-indicator" 
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 0 0 rgba(66, 133, 244, 0.7)`,
        animation: 'pulse 1.5s infinite',
      }}
    />
  ) : null;
};

// Add this CSS to your global styles or include it here with a style tag
const PulsingStyles = () => (
  <style jsx="true">{`
    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7);
      }
      
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 10px rgba(66, 133, 244, 0);
      }
      
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(66, 133, 244, 0);
      }
    }
  `}</style>
);

export { PulsingIndicator, PulsingStyles };