import React from 'react';

const PulsingIndicator = ({ isActive, size = 24, color = '#4285F4' }) => {
  if (!isActive) return null;
  
  return (
    <div className="pulsing-indicator-container">
      <div 
        className="pulsing-indicator" 
        style={{
          width: `${size}px`,
          height: `${size}px`,
          '--indicator-color': color
        }}
      >
        <div className="pulse-ring"></div>
        <div className="pulse-core"></div>
      </div>
    </div>
  );
};

// Add this CSS to your global styles or include it here with a style tag
const PulsingStyles = () => (
  <style>{`
    .pulsing-indicator-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    
    .pulsing-indicator {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .pulse-core {
      width: 40%;
      height: 40%;
      background-color: var(--indicator-color, #4285F4);
      border-radius: 50%;
      position: absolute;
      z-index: 2;
    }
    
    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: var(--indicator-color, #4285F4);
      opacity: 0.6;
      z-index: 1;
      animation: pulse-animation 2s infinite;
    }
    
    @keyframes pulse-animation {
      0% {
        transform: scale(0.8);
        opacity: 0.8;
      }
      
      50% {
        transform: scale(1.2);
        opacity: 0;
      }
      
      100% {
        transform: scale(0.8);
        opacity: 0;
      }
    }
  `}</style>
);

export { PulsingIndicator, PulsingStyles };