import React, { useState } from 'react';

// Better icons with more modern design
const Icons = {
  Mathematics: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="topic-icon">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="14.31" y1="8" x2="20.05" y2="17.94"></line>
      <line x1="9.69" y1="8" x2="21.17" y2="8"></line>
      <line x1="7.38" y1="12" x2="13.12" y2="2.06"></line>
      <line x1="9.69" y1="16" x2="3.95" y2="6.06"></line>
      <line x1="14.31" y1="16" x2="2.83" y2="16"></line>
      <line x1="16.62" y1="12" x2="10.88" y2="21.94"></line>
    </svg>
  ),
  Physics: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="topic-icon">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-9-9M12 12v9"></path>
      <path d="M12 12h9"></path>
      <path d="M19.4 15a18 18 0 0 1-14.8 0M15 4.6c5 2.08 5 12.72 0 14.8M9 4.6c-5 2.08-5 12.72 0 14.8"></path>
    </svg>
  ),
  CompSci: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="topic-icon">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
      <line x1="19" y1="4" x2="5" y2="20"></line>
    </svg>
  ),
  Science: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="topic-icon">
      <path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2v-3.08"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
      <rect x="8" y="14" width="8" height="4" rx="1" ry="1"></rect>
      <path d="M17 9.06v5.89c0 2.8-5 2.8-5 0V9.06c0-2.8 5-2.8 5 0z"></path>
    </svg>
  ),
  Check: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="check-icon">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  Arrow: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arrow-icon">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  )
};

const topicCategories = [
  {
    name: 'Mathematics',
    icon: Icons.Mathematics,
    color: '#4285F4',
    topics: [
      'Calculus - Integration by Substitution',
      'Calculus - Differentiation',
      'Linear Algebra',
      'Probability and Statistics',
      'Trigonometry'
    ]
  },
  {
    name: 'Physics',
    icon: Icons.Physics,
    color: '#34A853',
    topics: [
      'Classical Mechanics',
      'Thermodynamics',
      'Electromagnetism',
      'Quantum Mechanics',
      'Relativity'
    ]
  },
  {
    name: 'Computer Science',
    icon: Icons.CompSci,
    color: '#EA4335',
    topics: [
      'Data Structures',
      'Algorithms',
      'Object-Oriented Programming',
      'Web Development',
      'Machine Learning'
    ]
  },
  {
    name: 'Science & Language',
    icon: Icons.Science,
    color: '#FBBC05',
    topics: [
      'Biology Fundamentals',
      'Chemistry Basics',
      'Environmental Science',
      'English Grammar',
      'Creative Writing'
    ]
  }
];

const TopicSelector = ({ onSelectTopic, onCustomTopic }) => {
  const [customTopic, setCustomTopic] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [animationClass, setAnimationClass] = useState('');
  
  const handleCustomTopicSubmit = (e) => {
    e.preventDefault();
    if (customTopic.trim()) {
      setAnimationClass('slide-out');
      setTimeout(() => {
        onCustomTopic(customTopic);
      }, 500);
    }
  };
  
  const handleCategoryClick = (categoryIndex) => {
    setSelectedCategory(categoryIndex);
  };
  
  const handleTopicClick = (topic) => {
    setAnimationClass('slide-out');
    setTimeout(() => {
      onSelectTopic(topic);
    }, 500);
  };
  
  return (
    <div className={`topic-selector ${animationClass}`}>
      <div className="selector-header">
        <h2 className="topic-selector-title">Welcome to Your AI Tutor Experience</h2>
        <p className="topic-selector-subtitle">Select a topic to begin your personalized learning journey</p>
      </div>
      
      <div className="category-selection">
        <div className="category-buttons">
          {topicCategories.map((category, index) => (
            <button
              key={category.name}
              className={`category-button ${selectedCategory === index ? 'active' : ''}`}
              style={{
                '--category-color': category.color,
                '--border-width': selectedCategory === index ? '3px' : '2px'
              }}
              onClick={() => handleCategoryClick(index)}
            >
              <div className="category-icon" style={{ color: category.color }}>
                {category.icon}
              </div>
              <span className="category-label">{category.name}</span>
            </button>
          ))}
        </div>
        
        <div className="topic-list-wrapper">
          {selectedCategory !== null && (
            <div className="selected-category-topics" style={{ '--topic-color': topicCategories[selectedCategory].color }}>
              <h3 className="selected-category-name" style={{ color: topicCategories[selectedCategory].color }}>
                {topicCategories[selectedCategory].name}
              </h3>
              <ul className="topic-grid">
                {topicCategories[selectedCategory].topics.map((topic) => (
                  <li key={topic} className="topic-card" onClick={() => handleTopicClick(topic)}>
                    <div className="topic-card-content">
                      <span className="topic-name">{topic}</span>
                      <span className="topic-arrow">{Icons.Arrow}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {selectedCategory === null && (
            <div className="no-selection-message">
              <p>Please select a category to view available topics</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="custom-topic-section">
        <h3>Want to learn something specific?</h3>
        <form onSubmit={handleCustomTopicSubmit} className="custom-topic-form">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Enter any topic you'd like to learn..."
            className="custom-topic-input"
          />
          <button type="submit" className="custom-topic-button" disabled={!customTopic.trim()}>
            <span>Start Learning</span>
            {Icons.Arrow}
          </button>
        </form>
      </div>
      
      <div className="topic-selector-features">
        <div className="feature">
          <div className="feature-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v6a2 2 0 0 0 2 2h6"></path>
              <path d="M22 12v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8"></path>
              <circle cx="16" cy="16" r="2"></circle>
              <path d="M22 12a6 6 0 0 0-6-6"></path>
            </svg>
          </div>
          <h4>Personalized Learning</h4>
          <p>Curriculum tailored to your learning style and pace</p>
        </div>
        
        <div className="feature">
          <div className="feature-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
              <path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"></path>
              <path d="M16 3v3a2 2 0 0 0 2 2h3"></path>
              <path d="M12 12v.01"></path>
              <path d="M12 16v.01"></path>
              <path d="M8 12h8"></path>
              <path d="M8 16h8"></path>
            </svg>
          </div>
          <h4>Interactive Content</h4>
          <p>Engage with diagrams, quizzes, and visual examples</p>
        </div>
        
        <div className="feature">
          <div className="feature-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h4>Ask Questions</h4>
          <p>Get immediate clarification on complex topics</p>
        </div>
      </div>
    </div>
  );
};

export default TopicSelector;