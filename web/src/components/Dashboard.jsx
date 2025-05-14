import React, { useState, useEffect, useRef } from 'react';
import Whiteboard from './Whiteboard';
import TopicSelector from './TopicSelector';
import { PulsingIndicator, PulsingStyles } from './PulsingIndicator';
import ResponseSynchronizer from '../utils/ResponseSynchronizer';

const Dashboard = ({ ws, startRecording, stopRecording, isRecording }) => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [whiteboardActions, setWhiteboardActions] = useState([]);
  
  const audioRef = useRef(new Audio());
  const syncRef = useRef(new ResponseSynchronizer());
  
  // Initial default text for the whiteboard
  useEffect(() => {
    // Add a welcome message to the whiteboard when it first loads
    setWhiteboardActions([
      {
        type: 'write',
        content: 'Welcome to your AI Tutor! Select a topic to begin learning.',
        time: 0
      }
    ]);
  }, []);
  
  // Initialize the synchronizer
  useEffect(() => {
    syncRef.current.setActionCallback(action => {
      setWhiteboardActions(prev => [...prev, action]);
    });
    
    syncRef.current.setSpeakingCallback(isSpeaking => {
      setIsAiSpeaking(isSpeaking);
    });
  }, []);
  
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
        
        // Start synchronization when audio starts playing
        syncRef.current.startSync(audioRef.current);
        setIsAiSpeaking(true);
      } else {
        try {
          // Try to parse as JSON first
          const data = JSON.parse(event.data);
          
          if (data && data.type === 'whiteboard_actions') {
            // Add a default write action if no actions exist
            if (!data.actions || data.actions.length === 0) {
              // If no actions, create a default one based on the last message
              if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                if (lastMessage.role === 'assistant') {
                  syncRef.current.processMessage({
                    type: 'whiteboard_actions',
                    actions: [{
                      type: 'write',
                      content: lastMessage.content,
                      time: 0
                    }]
                  });
                }
              }
            } else {
              syncRef.current.processMessage(data);
            }
          } else {
            // Regular JSON message
            setMessages(prev => [...prev, { role: 'assistant', content: event.data }]);
          }
        } catch (e) {
          // Not JSON, treat as regular text message
          setMessages(prev => [...prev, { role: 'assistant', content: event.data }]);
          
          // For non-JSON messages, create a default whiteboard action to display the text
          // This ensures something is always shown on the whiteboard
          const newAction = {
            type: 'write',
            content: event.data.replace(/^assistant: /, ''), // Remove prefix if present
            time: 0
          };
          
          setWhiteboardActions(prev => [...prev, newAction]);
        }
      }
    };
    
    ws.onmessage = handleMessage;
    
    return () => {
      if (ws) {
        ws.onmessage = null;
      }
    };
  }, [ws, messages]);
  
  // Handle topic selection
  const handleSelectTopic = (topic) => {
    setSelectedTopic(topic);
    
    // Clear previous whiteboard content
    setWhiteboardActions([{
      type: 'write',
      content: `Let's learn about ${topic}...`,
      time: 0
    }]);
    
    // Start recording if not already
    if (!isRecording) {
      startRecording();
    }
    
    // Send topic to the server
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = `I want to learn about ${topic}. Please teach me step by step, explaining concepts clearly. Use the whiteboard to write and draw as you explain.`;
      ws.send(message);
      
      // Add user message to the conversation
      setMessages(prev => [...prev, { role: 'user', content: message }]);
    }
  };
  
  // Handle custom topic input
  const handleCustomTopic = (topic) => {
    handleSelectTopic(topic);
  };
  
  // Handle session end
  const handleEndSession = () => {
    stopRecording(false);
    setSelectedTopic(null);
    setMessages([]);
    setWhiteboardActions([{
      type: 'write',
      content: 'Welcome to your AI Tutor! Select a topic to begin learning.',
      time: 0
    }]);
    syncRef.current.reset();
  };
  
  // Render the dashboard
  return (
    <div className="dashboard">
      <PulsingStyles />
      
      {!selectedTopic ? (
        // Topic selection screen
        <div className="topic-selection-screen">
          <TopicSelector 
            onSelectTopic={handleSelectTopic}
            onCustomTopic={handleCustomTopic}
          />
        </div>
      ) : (
        // Learning dashboard with whiteboard
        <div className="learning-dashboard">
          <div className="dashboard-header">
            <h2 className="current-topic">{selectedTopic}</h2>
            <div className="controls">
              <button 
                onClick={handleEndSession}
                className="control-button stop"
              >
                End Session
              </button>
            </div>
          </div>
          
          <div className="whiteboard-section">
            <Whiteboard 
              actions={whiteboardActions} 
              isAiSpeaking={isAiSpeaking}
            />
            
            <div className="speaking-indicator-container">
              <PulsingIndicator isActive={isAiSpeaking} size={30} />
              {isAiSpeaking && <span className="speaking-text">AI Tutor Speaking</span>}
            </div>
          </div>
          
          <div className="conversation-log">
            <h3>Session Transcript</h3>
            <div className="messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;