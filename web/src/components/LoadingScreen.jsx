import React from 'react';

const LoadingScreen = ({ progress, topic }) => {
  // Array of loading messages to show at different progress points
  const loadingMessages = [
    "Analyzing your learning preferences...",
    "Gathering educational resources...",
    "Structuring content for optimal learning...",
    "Creating engaging visual elements...",
    "Formulating assessment questions...",
    "Finalizing your personalized learning path..."
  ];
  
  // Array of educational facts to show during loading
  const educationalFacts = [
    "Personalized learning can improve retention by up to 60% compared to traditional methods.",
    "Visual learning aids can increase understanding by up to 400%.",
    "Spaced repetition techniques can improve long-term memory retention by up to 200%.",
    "Active recall is one of the most effective study techniques, improving retention by up to 150%.",
    "The brain processes visuals 60,000 times faster than text.",
    "Taking short breaks during learning sessions can improve focus and retention."
  ];
  
  // Get the appropriate message based on progress
  const getMessage = () => {
    const index = Math.min(
      Math.floor(progress / (100 / loadingMessages.length)),
      loadingMessages.length - 1
    );
    return loadingMessages[index];
  };
  
  // Get a random educational fact
  const getFact = () => {
    return educationalFacts[Math.floor(Math.random() * educationalFacts.length)];
  };
  
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <h2 className="loading-title">Creating Your Personalized Learning Experience</h2>
        <h3 className="loading-topic">{topic}</h3>
        
        <div className="brain-animation">
          <div className="neural-network">
            {Array.from({ length: 30 }).map((_, i) => (
              <div 
                key={i} 
                className="neuron" 
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              />
            ))}
            
            {Array.from({ length: 50 }).map((_, i) => (
              <div 
                key={`connection-${i}`} 
                className="neural-connection" 
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${20 + Math.random() * 80}px`,
                  height: '1px',
                  transform: `rotate(${Math.random() * 360}deg)`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              />
            ))}
          </div>
          
          <svg className="brain-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path className="brain-path brain-left" d="M100,100 C80,80 60,85 50,100 C40,115 45,135 60,140 C75,145 85,130 100,130" />
            <path className="brain-path brain-right" d="M100,100 C120,80 140,85 150,100 C160,115 155,135 140,140 C125,145 115,130 100,130" />
            <path className="brain-path brain-top" d="M100,70 C85,60 90,40 100,30 C110,40 115,60 100,70" />
            <path className="brain-path brain-bottom" d="M100,130 C85,140 90,160 100,170 C110,160 115,140 100,130" />
            
            <circle className="neural-pulse pulse-1" cx="75" cy="90" r="3" />
            <circle className="neural-pulse pulse-2" cx="125" cy="90" r="3" />
            <circle className="neural-pulse pulse-3" cx="100" cy="50" r="3" />
            <circle className="neural-pulse pulse-4" cx="100" cy="150" r="3" />
            <circle className="neural-pulse pulse-5" cx="85" cy="120" r="3" />
            <circle className="neural-pulse pulse-6" cx="115" cy="120" r="3" />
          </svg>
        </div>
        
        <div className="loading-progress-container">
          <div className="loading-message">{getMessage()}</div>
          <div className="loading-progress-bar">
            <div 
              className="loading-progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="loading-percentage">{Math.round(progress)}% Complete</div>
        </div>
        
        <div className="loading-tips">
          <h4>Did you know?</h4>
          <p>{getFact()}</p>
        </div>
      </div>
      
      <style jsx>{`
        .neural-network {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .neuron {
          position: absolute;
          width: 6px;
          height: 6px;
          background-color: var(--primary-color);
          border-radius: 50%;
          animation: pulse 4s infinite;
        }
        
        .neural-connection {
          position: absolute;
          background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
          animation: flash 3s infinite;
        }
        
        @keyframes flash {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.5; }
        }
        
        .loading-spinner {
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;