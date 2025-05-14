import React from 'react';

const topicCategories = [
  {
    name: 'Mathematics',
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
    topics: [
      'Data Structures',
      'Algorithms',
      'Object-Oriented Programming',
      'Web Development',
      'Machine Learning'
    ]
  },
  {
    name: 'General Science',
    topics: [
      'Biology Fundamentals',
      'Chemistry Basics',
      'Environmental Science',
      'Astronomy',
      'Geology'
    ]
  }
];

const TopicSelector = ({ onSelectTopic, onCustomTopic }) => {
  const [customTopic, setCustomTopic] = React.useState('');
  
  const handleCustomTopicSubmit = (e) => {
    e.preventDefault();
    if (customTopic.trim()) {
      onCustomTopic(customTopic);
    }
  };
  
  return (
    <div className="topic-selector">
      <h2 className="topic-selector-title">Select a Topic to Learn</h2>
      
      <div className="topic-categories">
        {topicCategories.map((category) => (
          <div className="topic-category" key={category.name}>
            <h3 className="category-name">{category.name}</h3>
            <ul className="topic-list">
              {category.topics.map((topic) => (
                <li 
                  key={topic} 
                  className="topic-item"
                  onClick={() => onSelectTopic(topic)}
                >
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <div className="custom-topic-section">
        <h3>Want to learn something else?</h3>
        <form onSubmit={handleCustomTopicSubmit} className="custom-topic-form">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Enter any topic you'd like to learn..."
            className="custom-topic-input"
          />
          <button type="submit" className="custom-topic-button">Start Learning</button>
        </form>
      </div>
    </div>
  );
};

export default TopicSelector;