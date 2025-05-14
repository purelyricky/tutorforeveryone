import React, { useState } from 'react';

const QuestionPrompt = ({ question, options = [], onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [customAnswer, setCustomAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleOptionClick = (option) => {
    if (isSubmitting || isSubmitted) return;
    setSelectedOption(option);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    
    // Use selected option or custom answer
    const answer = options.length > 0 ? selectedOption : customAnswer;
    
    if (answer) {
      // Show feedback animation
      setIsSubmitted(true);
      
      // Send after a short delay to show animation
      setTimeout(() => {
        onAnswer(answer);
        
        // Reset state after submission
        setSelectedOption(null);
        setCustomAnswer('');
        setIsSubmitting(false);
        setIsSubmitted(false);
      }, 1000);
    } else {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={`question-prompt ${isSubmitted ? 'submitted' : ''}`}>
      <div className="question-container">
        <h3 className="question-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24" className="question-icon">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Let's check your understanding
        </h3>
        <p className="question-text">{question}</p>
        
        <form onSubmit={handleSubmit}>
          {options.length > 0 ? (
            <div className="options-container">
              {options.map((option, index) => (
                <div 
                  key={index} 
                  className={`option ${selectedOption === option ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(option)}
                >
                  <div className="option-marker">{String.fromCharCode(65 + index)}</div>
                  <div className="option-text">{option}</div>
                  {selectedOption === option && (
                    <div className="option-check">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="free-response-container">
              <textarea
                className="response-input"
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={4}
                disabled={isSubmitting || isSubmitted}
              />
            </div>
          )}
          
          <div className="question-actions">
            <button
              type="submit"
              className="submit-answer-btn"
              disabled={isSubmitting || isSubmitted || (!selectedOption && !customAnswer)}
            >
              {isSubmitting ? (
                <>
                  <svg className="loading-spinner" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                  Processing...
                </>
              ) : isSubmitted ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Submitted!
                </>
              ) : (
                <>
                  Submit Answer
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Success animation overlay */}
      {isSubmitted && (
        <div className="submission-overlay">
          <div className="success-animation">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
            <p>Great job! Processing your answer...</p>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .submission-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
          border-radius: var(--radius-lg);
          animation: fadeIn 0.3s ease-out;
        }
        
        .success-animation {
          text-align: center;
        }
        
        .success-animation p {
          margin-top: 1rem;
          font-weight: 600;
          color: var(--text-color);
        }
        
        .checkmark {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: block;
          margin: 0 auto;
          animation: fill 0.4s ease-in-out 0.4s forwards;
        }
        
        .checkmark-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 2;
          stroke: var(--secondary-color);
          stroke-miterlimit: 10;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        
        .checkmark-check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          stroke-width: 3;
          stroke: var(--secondary-color);
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
        }
        
        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes fill {
          100% {
            box-shadow: inset 0 0 0 30px rgba(52, 168, 83, 0.1);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .loading-spinner {
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .question-icon {
          vertical-align: middle;
          margin-right: 0.5rem;
        }
        
        .option-check {
          margin-left: auto;
          color: var(--accent-color);
        }
      `}</style>
    </div>
  );
};

export default QuestionPrompt;