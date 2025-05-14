import React, { useRef, useEffect, useState } from "react";

const Whiteboard = ({ actions, isAiSpeaking }) => {
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [content, setContent] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Font settings
  const fontFamily = "'Handlee', cursive";
  const fontSize = 24;
  const textColor = "#333";
  const highlightColor = "rgba(255, 255, 0, 0.4)";
  
  // Set up canvas and context
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      // Set canvas size to fill container
      const parentDiv = canvas.parentElement;
      canvas.width = parentDiv.clientWidth;
      canvas.height = parentDiv.clientHeight;
      setDimensions({ width: canvas.width, height: canvas.height });
      
      // Set up context with default styles
      context.font = `${fontSize}px ${fontFamily}`;
      context.fillStyle = textColor;
      context.lineWidth = 2;
      setCtx(context);
      
      // Initial clear
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = textColor;
    }
  }, []);

  // Clear the whiteboard
  const clearWhiteboard = () => {
    if (ctx) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      ctx.fillStyle = textColor;
      setContent([]);
    }
  };

  // Process new actions
  useEffect(() => {
    if (!ctx || !actions || actions.length === 0) return;
    
    // Add new actions to content
    const newActions = actions.filter(
      action => !content.some(existing => 
        JSON.stringify(existing) === JSON.stringify(action)
      )
    );
    
    if (newActions.length > 0) {
      setContent(prev => [...prev, ...newActions]);
    }
  }, [actions, ctx]);

  // Render content on the whiteboard
  useEffect(() => {
    if (!ctx || content.length === 0) return;

    // Current cursor position for writing text
    let cursorX = 30;
    let cursorY = 50;
    const lineHeight = fontSize * 1.5;
    
    // Clear first
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    ctx.fillStyle = textColor;
    
    // Draw all content
    content.forEach(item => {
      switch (item.type) {
        case 'write':
          // Write text to the whiteboard
          ctx.font = `${fontSize}px ${fontFamily}`;
          ctx.fillStyle = textColor;
          
          // Handle text wrapping
          const words = item.content.split(' ');
          let line = '';
          
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > dimensions.width - 60 && n > 0) {
              ctx.fillText(line, cursorX, cursorY);
              line = words[n] + ' ';
              cursorY += lineHeight;
            } else {
              line = testLine;
            }
          }
          
          ctx.fillText(line, cursorX, cursorY);
          cursorY += lineHeight * 1.5; // Add extra space after text block
          break;
          
        case 'draw':
          // Draw shapes
          ctx.strokeStyle = textColor;
          ctx.lineWidth = 2;
          
          switch(item.shape) {
            case 'rectangle':
              ctx.beginPath();
              ctx.rect(cursorX, cursorY, 150, 100);
              ctx.stroke();
              cursorY += 120; // Move cursor below the shape
              break;
              
            case 'circle':
              ctx.beginPath();
              ctx.arc(cursorX + 75, cursorY + 50, 50, 0, Math.PI * 2);
              ctx.stroke();
              cursorY += 120;
              break;
              
            case 'line':
              ctx.beginPath();
              ctx.moveTo(cursorX, cursorY);
              ctx.lineTo(cursorX + 200, cursorY);
              ctx.stroke();
              cursorY += 30;
              break;
              
            case 'arrow':
              // Draw arrow line
              ctx.beginPath();
              ctx.moveTo(cursorX, cursorY);
              ctx.lineTo(cursorX + 180, cursorY);
              ctx.stroke();
              
              // Draw arrowhead
              ctx.beginPath();
              ctx.moveTo(cursorX + 180, cursorY);
              ctx.lineTo(cursorX + 170, cursorY - 10);
              ctx.lineTo(cursorX + 170, cursorY + 10);
              ctx.closePath();
              ctx.fill();
              
              cursorY += 40;
              break;
          }
          break;
          
        case 'highlight':
          // Find the text to highlight
          const textToHighlight = item.content;
          
          // Search all previous content for the text to highlight
          for (let y = 0; y < cursorY; y += 5) {
            for (let x = 0; x < dimensions.width - 60; x += 5) {
              // This is a simplified approach - a real implementation would need to track text positions
              // For now, we'll just highlight around the current cursor position
              const testWidth = ctx.measureText(textToHighlight).width;
              
              // Put a yellow highlight behind the text
              ctx.fillStyle = highlightColor;
              ctx.fillRect(cursorX, cursorY - fontSize, testWidth, fontSize * 1.2);
              ctx.fillStyle = textColor;
              break;
            }
          }
          break;
          
        case 'erase':
          // For now, we'll just add a small white area
          ctx.fillStyle = "#fff";
          ctx.fillRect(cursorX, cursorY - lineHeight, 200, lineHeight);
          ctx.fillStyle = textColor;
          break;
      }
    });
    
  }, [content, ctx, dimensions]);

  return (
    <div className="whiteboard-container" style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#fff' }}>
      {/* Pulsing indicator when AI is speaking */}
      {isAiSpeaking && (
        <div className="ai-speaking-indicator" style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#4285F4',
          animation: 'pulse 1.5s infinite',
          zIndex: 10
        }} />
      )}
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      />
    </div>
  );
};

export default Whiteboard;