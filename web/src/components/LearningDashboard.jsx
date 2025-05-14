import React, { useState, useEffect, useRef } from 'react';
import ContentDisplay from './ContentDisplay';
import TopicSelector from './TopicSelector';
import LoadingScreen from './LoadingScreen';
import QuestionPrompt from './QuestionPrompt';
import { PulsingIndicator } from './PulsingIndicator';

const LearningDashboard = ({ ws, startRecording, stopRecording, isRecording }) => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [contentActions, setContentActions] = useState([]);
  const [learningPhase, setLearningPhase] = useState('initial'); // initial, assessment, preparation, learning
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sections, setSections] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentHighlight, setCurrentHighlight] = useState(null);
  const [prepProgress, setPrepProgress] = useState(0);
  const [assessmentQuestions, setAssessmentQuestions] = useState(0);
  
  const audioRef = useRef(new Audio());
  const contentAreaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;
    
    const handleMessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Audio data
        const audioBlob = new Blob([event.data], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        
        setIsAiSpeaking(true);
        
        audioRef.current.onended = () => {
          setIsAiSpeaking(false);
        };
      } else {
        try {
          // Try to parse as JSON
          const data = JSON.parse(event.data);
          
          if (data && data.type === 'content_actions') {
            processContentActions(data.actions);
          } else if (data && data.type === 'learning_phase') {
            handleLearningPhaseChange(data);
          } else if (data && data.type === 'preparation_started') {
            // Start progress animation for preparation phase
            startPreparationProgress();
          } else {
            // Regular message that isn't a special type - add to conversation
            const messageContent = typeof data === 'string' ? data : JSON.stringify(data);
            addMessageToConversation('assistant', messageContent);
          }
        } catch (e) {
          // Not JSON, treat as regular text message
          // Check if it starts with "assistant:" prefix and remove it
          const content = event.data.startsWith('assistant: ') 
            ? event.data.substring('assistant: '.length) 
            : event.data;
            
          addMessageToConversation('assistant', content);
        }
      }
    };
    
    ws.onmessage = handleMessage;
    
    return () => {
      if (ws) {
        ws.onmessage = null;
      }
    };
  }, [ws]);

  // Add message to conversation and scroll to bottom
  const addMessageToConversation = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
    // Scroll after message is added
    setTimeout(scrollToBottom, 100);
  };

  // Handle learning phase changes
  const handleLearningPhaseChange = (data) => {
    const { phase } = data;
    
    console.log("Phase changing to:", phase);
    setLearningPhase(phase);
    
    if (phase === 'assessment' && data.topic) {
      setSelectedTopic(data.topic);
    }
  };

  // Process incoming content actions
  const processContentActions = (actions) => {
    console.log("Received content actions:", actions);
    setContentActions(prev => [...prev, ...actions]);
    
    // Process sections
    const sectionActions = actions.filter(action => action.type === 'section');
    if (sectionActions.length > 0) {
      setSections(prev => [...prev, ...sectionActions.map(action => action.title)]);
    }
    
    // Process page breaks to update total pages
    const pageBreaks = actions.filter(action => action.type === 'page_break');
    if (pageBreaks.length > 0) {
      setTotalPages(prev => prev + pageBreaks.length);
    }
    
    // Process questions
    const questionActions = actions.filter(action => action.type === 'question');
    if (questionActions.length > 0) {
      setCurrentQuestion(questionActions[0]);
    }
    
    // Process highlights
    const highlightActions = actions.filter(action => action.type === 'highlight');
    if (highlightActions.length > 0) {
      setCurrentHighlight(highlightActions[0].content);
      
      // Auto-clear highlight after 3 seconds
      setTimeout(() => {
        setCurrentHighlight(null);
      }, 3000);
    }
  };

  // Simulate content preparation progress
  const startPreparationProgress = () => {
    setPrepProgress(0);
    
    // Generate random target time between 5-10 seconds
    const targetTime = Math.floor(Math.random() * 5000) + 5000;
    const startTime = Date.now();
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const percentage = Math.min(Math.floor((elapsed / targetTime) * 100), 99);
      
      setPrepProgress(percentage);
      
      if (percentage < 99) {
        requestAnimationFrame(updateProgress);
      } else {
        // Final step to 100% after a short delay (simulates completion)
        setTimeout(() => {
          setPrepProgress(100);
          
          // After another short delay, move to learning phase
          setTimeout(() => {
            setLearningPhase('learning');
          }, 500);
        }, 800);
      }
    };
    
    requestAnimationFrame(updateProgress);
  };

  // Force set learning phase (for manual navigation)
  const forceSetPhase = (phase) => {
    setLearningPhase(phase);
    
    if (phase === 'preparation') {
      startPreparationProgress();
    }
  };

  // Handle topic selection
  const handleSelectTopic = (topic) => {
    // When a topic is selected, navigate to assessment phase
    setSelectedTopic(topic);
    setLearningPhase('assessment');
    
    // Start recording if not already
    if (!isRecording) {
      startRecording();
    }
    
    // Send topic to the server
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = `I want to learn about ${topic}. Please teach me step by step, explaining concepts clearly.`;
      ws.send(message);
      
      // Add user message to the conversation
      addMessageToConversation('user', `I want to learn about ${topic}`);
    }
  };

  // Handle custom topic input
  const handleCustomTopic = (topic) => {
    handleSelectTopic(topic);
  };

  // Handle user input submission
  const handleUserInput = (message) => {
    if (!message.trim()) return;
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      
      // Add user message to the conversation
      addMessageToConversation('user', message);
    }
  };

  // Handle question response
  const handleAnswerQuestion = (question, answer) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const response = `My answer to "${question}": ${answer}`;
      ws.send(response);
      
      // Add user message to the conversation
      addMessageToConversation('user', `My answer: ${answer}`);
      
      // Clear current question
      setCurrentQuestion(null);
      
      // In assessment phase, increment the question counter
      if (learningPhase === 'assessment') {
        setAssessmentQuestions(prev => {
          const newCount = prev + 1;
          
          // After 3 assessment questions, move to preparation phase
          if (newCount >= 3) {
            setLearningPhase('preparation');
            startPreparationProgress();
          }
          
          return newCount;
        });
      }
    }
  };

  // Handle page navigation
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      
      // Scroll to top when changing pages
      if (contentAreaRef.current) {
        contentAreaRef.current.scrollTop = 0;
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      
      // Scroll to top when changing pages
      if (contentAreaRef.current) {
        contentAreaRef.current.scrollTop = 0;
      }
    }
  };

  // Handle session end
  const handleEndSession = () => {
    stopRecording(false);
    setSelectedTopic(null);
    setMessages([]);
    setContentActions([]);
    setLearningPhase('initial');
    setCurrentPage(0);
    setTotalPages(0);
    setSections([]);
    setCurrentQuestion(null);
    setCurrentHighlight(null);
    setAssessmentQuestions(0);
  };

  // Get content for current page
  const getCurrentPageContent = () => {
    if (contentActions.length === 0) return [];
    
    let pageContent = [];
    let currentPageIndex = 0;
    
    for (const action of contentActions) {
      if (action.type === 'page_break') {
        currentPageIndex++;
        if (currentPageIndex > currentPage) break;
        continue;
      }
      
      if (currentPageIndex === currentPage) {
        pageContent.push(action);
      }
    }
    
    return pageContent;
  };

  // Manual navigation control component
  const PhaseNavigator = () => (
    <div className="phase-navigator">
      <h3>Navigate Learning Phases</h3>
      <div className="phase-buttons">
        <button 
          className={`phase-button ${learningPhase === 'initial' ? 'active' : ''}`}
          onClick={() => forceSetPhase('initial')}
        >
          Topic Selection
        </button>
        <button 
          className={`phase-button ${learningPhase === 'assessment' ? 'active' : ''}`}
          onClick={() => selectedTopic ? forceSetPhase('assessment') : null}
          disabled={!selectedTopic}
        >
          Assessment
        </button>
        <button 
          className={`phase-button ${learningPhase === 'preparation' ? 'active' : ''}`}
          onClick={() => selectedTopic ? forceSetPhase('preparation') : null}
          disabled={!selectedTopic}
        >
          Preparation
        </button>
        <button 
          className={`phase-button ${learningPhase === 'learning' ? 'active' : ''}`}
          onClick={() => selectedTopic ? forceSetPhase('learning') : null}
          disabled={!selectedTopic}
        >
          Learning Content
        </button>
      </div>
    </div>
  );

  // Render the dashboard based on the current learning phase
  return (
    <div className={`learning-dashboard phase-${learningPhase}`}>
      {/* Manual Phase Navigator - Always visible */}
      <PhaseNavigator />
      
      {/* Current Phase Status */}
      <div className="current-phase-indicator">
        <span>Current Phase: </span>
        <strong>{learningPhase === 'initial' ? 'Topic Selection' : 
                learningPhase === 'assessment' ? 'Assessment' :
                learningPhase === 'preparation' ? 'Preparation' : 'Learning Content'}</strong>
      </div>
      
      {learningPhase === 'initial' && (
        <div className="topic-selection-screen">
          <TopicSelector 
            onSelectTopic={handleSelectTopic}
            onCustomTopic={handleCustomTopic}
          />
        </div>
      )}
      
      {learningPhase === 'assessment' && (
        <div className="assessment-screen">
          <div className="assessment-header">
            <h2 className="assessment-title">Understanding Your Learning Needs: {selectedTopic}</h2>
          </div>
          
          <div className="assessment-content">
            <div className="conversation-log">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <div className="message-sender">{msg.role === 'user' ? 'You' : 'AI Tutor'}</div>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="user-input-area">
              <form onSubmit={(e) => {
                e.preventDefault();
                const input = e.target.elements.userMessage;
                handleUserInput(input.value);
                input.value = '';
              }}>
                <input 
                  name="userMessage"
                  type="text" 
                  placeholder="Type your response here..."
                  className="user-input-field"
                />
                <button type="submit" className="user-input-button">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </div>
          </div>
          
          <div className="assessment-footer">
            <div className="speaking-indicator-container">
              <PulsingIndicator isActive={isAiSpeaking} size={30} />
              {isAiSpeaking && <span className="speaking-text">AI Tutor Speaking</span>}
            </div>
          </div>
        </div>
      )}
      
      {learningPhase === 'preparation' && (
        <LoadingScreen 
          progress={prepProgress} 
          topic={selectedTopic}
        />
      )}
      
      {learningPhase === 'learning' && (
        <div className="learning-screen">
          <div className="learning-header">
            <h2 className="current-topic">{selectedTopic}</h2>
            <div className="navigation-controls">
              <button 
                onClick={handlePrevPage}
                className={`nav-button prev ${currentPage === 0 ? 'disabled' : ''}`}
                disabled={currentPage === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Previous
              </button>
              <span className="page-indicator">{currentPage + 1} / {Math.max(1, totalPages || 1)}</span>
              <button 
                onClick={handleNextPage}
                className={`nav-button next ${currentPage === totalPages ? 'disabled' : ''}`}
                disabled={currentPage === totalPages}
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <polyline points="9 6 15 12 9 18"></polyline>
                </svg>
              </button>
            </div>
            <button 
              onClick={handleEndSession}
              className="control-button stop"
            >
              End Session
            </button>
          </div>
          
          <div className="learning-container">
            <div className="content-area" ref={contentAreaRef}>
              <ContentDisplay 
                content={getCurrentPageContent()}
                currentHighlight={currentHighlight}
                isAiSpeaking={isAiSpeaking}
              />
              
              {currentQuestion && (
                <QuestionPrompt 
                  question={currentQuestion.content}
                  options={currentQuestion.options}
                  onAnswer={(answer) => handleAnswerQuestion(currentQuestion.content, answer)}
                />
              )}
            </div>
            
            <div className="conversation-sidebar">
              <h3>Conversation</h3>
              <div className="conversation-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`sidebar-message ${msg.role}`}>
                    <div className="message-sender">{msg.role === 'user' ? 'You' : 'AI Tutor'}</div>
                    <div className="message-content">{msg.content}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="user-input-area">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.target.elements.userMessage;
                  handleUserInput(input.value);
                  input.value = '';
                }}>
                  <input 
                    name="userMessage"
                    type="text" 
                    placeholder="Ask a question..."
                    className="user-input-field"
                  />
                  <button type="submit" className="user-input-button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
          
          <div className="learning-footer">
            <div className="sections-progress">
              {sections.map((section, index) => (
                <div key={index} className="section-indicator">
                  <div className={`section-dot ${index <= currentPage ? 'completed' : ''}`}></div>
                  <span className="section-name">{section}</span>
                </div>
              ))}
            </div>
            
            <div className="speaking-indicator-container">
              <PulsingIndicator isActive={isAiSpeaking} size={30} />
              {isAiSpeaking && <span className="speaking-text">AI Tutor Speaking</span>}
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .phase-navigator {
          background-color: var(--card-color);
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
        }
        
        .phase-navigator h3 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1rem;
          color: var(--text-light);
        }
        
        .phase-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .phase-button {
          padding: 0.5rem 1rem;
          background-color: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          transition: all var(--transition-fast);
        }
        
        .phase-button:not(:disabled):hover {
          background-color: var(--primary-light);
          border-color: var(--primary-color);
        }
        
        .phase-button.active {
          background-color: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }
        
        .phase-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .current-phase-indicator {
          background-color: var(--surface-light);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1rem;
          display: inline-block;
          font-size: 0.9rem;
          color: var(--text-light);
          border: 1px solid var(--border-color);
        }
        
        .current-phase-indicator strong {
          color: var(--primary-color);
        }
        
        .conversation-log {
          flex: 1;
          overflow-y: auto;
          background-color: var(--card-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          max-height: 60vh;
          min-height: 300px;
        }
        
        .message {
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-lg);
          max-width: 85%;
          animation: fadeIn 0.3s ease-out;
          position: relative;
        }
        
        .message.user {
          align-self: flex-end;
          background: var(--primary-gradient);
          color: var(--text-inverse);
          border-bottom-right-radius: 0;
        }
        
        .message.assistant {
          align-self: flex-start;
          background-color: var(--surface-color);
          color: var(--text-color);
          border-bottom-left-radius: 0;
          box-shadow: var(--shadow-sm);
        }
        
        .message-sender {
          font-size: 0.8rem;
          opacity: 0.8;
          margin-bottom: 0.25rem;
          font-weight: 500;
        }
        
        .user-input-area {
          margin-top: 1rem;
        }
        
        .user-input-area form {
          display: flex;
          gap: 0.5rem;
        }
        
        .user-input-field {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-family: var(--font-primary);
          font-size: 1rem;
          transition: border-color var(--transition-fast);
        }
        
        .user-input-field:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
        }
        
        .user-input-button {
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        
        .user-input-button:hover {
          background-color: var(--primary-dark);
        }
        
        .learning-container {
          display: flex;
          gap: 1rem;
          height: calc(100vh - 250px);
          overflow: hidden;
        }
        
        .content-area {
          flex: 2;
          overflow-y: auto;
          padding-right: 1rem;
        }
        
        .conversation-sidebar {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: var(--card-color);
          border-radius: var(--radius-lg);
          padding: 1rem;
          box-shadow: var(--shadow-md);
          min-width: 300px;
          max-width: 400px;
        }
        
        .conversation-sidebar h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.2rem;
          color: var(--primary-color);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }
        
        .conversation-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        
        .sidebar-message {
          padding: 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          word-break: break-word;
        }
        
        .sidebar-message.user {
          background-color: rgba(66, 133, 244, 0.1);
          align-self: flex-end;
          border-right: 3px solid var(--primary-color);
        }
        
        .sidebar-message.assistant {
          background-color: rgba(52, 168, 83, 0.1);
          align-self: flex-start;
          border-left: 3px solid var(--secondary-color);
        }
        
        @media (max-width: 1024px) {
          .learning-container {
            flex-direction: column;
            height: auto;
          }
          
          .conversation-sidebar {
            max-width: none;
            min-width: 0;
            height: 300px;
          }
          
          .content-area {
            padding-right: 0;
            max-height: 500px;
          }
        }
      `}</style>
    </div>
  );
};

export default LearningDashboard;