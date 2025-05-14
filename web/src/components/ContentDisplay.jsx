import React, { useRef, useEffect, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with better styling
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter',
  fontSize: 16,
  flowchart: {
    htmlLabels: true,
    curve: 'basis'
  },
  themeVariables: {
    primaryColor: '#4285F4',
    primaryTextColor: '#fff',
    primaryBorderColor: '#3367d6',
    lineColor: '#5F6368',
    secondaryColor: '#34A853',
    tertiaryColor: '#FBBC05'
  }
});

const ContentDisplay = ({ content, currentHighlight, isAiSpeaking }) => {
  const contentRef = useRef(null);
  const [renderedMermaidDiagrams, setRenderedMermaidDiagrams] = useState({});
  
  // Initialize highlighting effect
  useEffect(() => {
    if (!contentRef.current || !currentHighlight) return;
    
    // Find all text nodes in the content area
    const findTextNodes = (element) => {
      let textNodes = [];
      const walk = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walk.nextNode()) {
        if (node.nodeValue.trim() !== '') {
          textNodes.push(node);
        }
      }
      
      return textNodes;
    };
    
    // Find the highlight text in the content
    const textNodes = findTextNodes(contentRef.current);
    
    // Create a safer regex pattern (escaping special regex characters)
    const safePattern = currentHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlightRegex = new RegExp(safePattern, 'i');
    
    let hasHighlighted = false;
    
    textNodes.forEach(node => {
      const text = node.nodeValue;
      const match = text.match(highlightRegex);
      
      if (match && !hasHighlighted) {
        hasHighlighted = true; // Only highlight the first occurrence
        const matchIndex = match.index;
        const beforeText = text.substring(0, matchIndex);
        const matchText = match[0];
        const afterText = text.substring(matchIndex + matchText.length);
        
        // Create new nodes
        const span = document.createElement('span');
        span.className = 'highlighted-text';
        span.textContent = matchText;
        
        // Replace the original text node
        const fragment = document.createDocumentFragment();
        fragment.appendChild(document.createTextNode(beforeText));
        fragment.appendChild(span);
        fragment.appendChild(document.createTextNode(afterText));
        
        node.parentNode.replaceChild(fragment, node);
        
        // Scroll to the highlighted element
        span.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    
    // Clean up highlighting after a few seconds
    const timer = setTimeout(() => {
      const highlights = contentRef.current?.querySelectorAll('.highlighted-text');
      if (highlights) {
        highlights.forEach(highlight => {
          const parent = highlight.parentNode;
          const text = highlight.textContent;
          const textNode = document.createTextNode(text);
          parent.replaceChild(textNode, highlight);
          
          // Normalize to combine adjacent text nodes
          parent.normalize();
        });
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [currentHighlight]);

  // Render mermaid diagrams
  useEffect(() => {
    if (!content || content.length === 0) return;
    
    const mermaidDiagrams = content.filter(item => item.type === 'mermaid');
    
    mermaidDiagrams.forEach((diagram, index) => {
      const id = `mermaid-diagram-${index}`;
      
      if (!renderedMermaidDiagrams[id]) {
        try {
          mermaid.render(id, diagram.diagram).then(({ svg }) => {
            setRenderedMermaidDiagrams(prev => ({
              ...prev,
              [id]: svg
            }));
          });
        } catch (error) {
          console.error('Failed to render mermaid diagram:', error);
        }
      }
    });
  }, [content, renderedMermaidDiagrams]);

  // Group content by sections
  const groupContentBySections = () => {
    if (!content || content.length === 0) return [];
    
    const groups = [];
    let currentGroup = { title: 'Introduction', items: [] };
    
    content.forEach(item => {
      if (item.type === 'section') {
        if (currentGroup.items.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = { title: item.title, items: [] };
      } else if (item.type !== 'highlight') { // Skip highlight actions as they're handled separately
        currentGroup.items.push(item);
      }
    });
    
    if (currentGroup.items.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  };

  const contentGroups = groupContentBySections();
  
  // Handle empty content with a nice placeholder
  if (content.length === 0) {
    return (
      <div className="content-display" ref={contentRef}>
        <div className="empty-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <path d="M13 8l4 0"></path>
            <path d="M13 12l4 0"></path>
            <path d="M13 16l4 0"></path>
          </svg>
          <h3>Your Learning Content Will Appear Here</h3>
          <p>The AI tutor is preparing your personalized educational material...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-display" ref={contentRef}>
      {contentGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="content-section">
          <h3 className="section-title">{group.title}</h3>
          
          <div className="section-content">
            {group.items.map((item, itemIndex) => {
              const key = `${groupIndex}-${itemIndex}`;
              
              switch (item.type) {
                case 'mermaid':
                  const diagId = `mermaid-diagram-${itemIndex}`;
                  return (
                    <div key={key} className="mermaid-diagram-container">
                      {renderedMermaidDiagrams[diagId] ? (
                        <div 
                          className="mermaid-diagram" 
                          dangerouslySetInnerHTML={{ __html: renderedMermaidDiagrams[diagId] }}
                        />
                      ) : (
                        <div className="diagram-loading">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="loading-spinner">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 6v6l4 2"></path>
                          </svg>
                          <p>Rendering diagram...</p>
                        </div>
                      )}
                    </div>
                  );
                  
                case 'image':
                  return (
                    <figure key={key} className="content-image">
                      <img src={item.url} alt="Learning visual" loading="lazy" />
                      {item.caption && <figcaption>{item.caption}</figcaption>}
                    </figure>
                  );
                
                case 'question':
                  // Questions are handled by the parent component
                  return null;
                  
                case 'page_break':
                  return null;
                
                default:
                  // For plain text or unknown types
                  return (
                    <div key={key} className="content-item">
                      {item.content && <p>{item.content}</p>}
                    </div>
                  );
              }
            })}
          </div>
        </div>
      ))}
      
      {/* Pulse animation when AI is speaking */}
      {isAiSpeaking && (
        <div className="content-pulse-overlay">
          <div className="pulse-ring"></div>
        </div>
      )}
    </div>
  );
};

export default ContentDisplay;