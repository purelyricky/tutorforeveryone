# AI Tutor Platform

This platform transforms the voice-ai-js-starter project into an interactive AI tutoring system where students can learn various topics with synchronized speech and whiteboard visuals.

![AI Tutor Platform](https://placeholder-for-screenshot.png)

## Overview

The AI Tutor Platform provides an immersive learning experience by combining:

- Voice interaction with an AI tutor
- Real-time synchronized whiteboard that displays text and diagrams
- Interactive topic selection and learning sessions
- Visual indicators for AI speech and actions

The tutor breaks down complex topics in simple steps, writing on the whiteboard as it explains, drawing diagrams when needed, and highlighting important points for emphasis.

## Key Features

- **Synchronized Speech and Whiteboard**: Text appears on the whiteboard precisely as the AI explains concepts
- **Handwritten-Style Text**: Content appears with a friendly, approachable handwritten font
- **Visual Teaching Tools**: Drawing shapes, highlighting content, and organizing information
- **Topic Selection**: Choose from predefined topics or enter a custom one
- **Interruption Handling**: Ask questions during explanations for clarification
- **Mathematical Notation**: Support for equations and mathematical symbols

## Architecture

The project follows a client-server architecture:

```
┌───────────────────┐        ┌───────────────────┐
│  Client (Web App) │◄──────►│  Server (Node.js) │
│     React UI      │  WebSocket  │     AI Integration   │
└───────────────────┘        └───────────────────┘
```

### Communication Flow

1. **User selects a topic** to learn about
2. **Client sends request** to server via WebSocket
3. **Server processes request** and sends to OpenAI
4. **AI generates response** with:
   - Speech text (what to say)
   - Whiteboard actions (what to write/draw/highlight)
5. **Server sends back** both speech and actions to client
6. **Client synchronizes** audio playback with whiteboard actions

## File Structure

### Server-Side Components

- `server/index.js`: WebSocket server configuration and AI tutor initialization
- `server/lib/assistant.js`: Core AI assistant implementation with whiteboard support
- `server/lib/conversation.js`: Manages conversation flow and whiteboard actions
- `server/lib/tts.js`: Text-to-Speech integration (OpenAI, ElevenLabs, etc)
- `server/lib/stt.js`: Speech-to-Text integration (OpenAI Whisper, Deepgram)

### Client-Side Components

- `web/src/app.tsx`: Main application component and WebSocket management
- `web/src/components/Dashboard.jsx`: Main UI component for the tutor interface
- `web/src/components/Whiteboard.jsx`: Custom whiteboard implementation
- `web/src/components/TopicSelector.jsx`: Topic selection interface
- `web/src/components/PulsingIndicator.jsx`: Visual indicator for AI speech
- `web/src/utils/ResponseSynchronizer.js`: Synchronizes speech with whiteboard actions

## How It Works

### 1. AI Response Format

The AI is prompted to provide responses in a specific format that includes:

- **Timestamps** for synchronization: `[MM:SS]`
- **Text to speak**: Regular text content
- **Whiteboard actions**: Special commands for the whiteboard

Example AI response:

```
[00:00] {write: "Integration by Substitution"} Today we'll learn about integration by substitution.
[00:03] {write: "∫u·dv = uv - ∫v·du"} This is the integration by parts formula.
[00:08] {highlight: "∫u·dv"} This part represents the original integral.
```

### 2. Response Parsing

In `server/lib/assistant.js`, the `parseResponseForWhiteboard` method extracts:

- Timestamps
- Speech text (for TTS)
- Whiteboard actions (with their timestamps)

```javascript
// From server/lib/assistant.js
parseResponseForWhiteboard(content) {
  const lines = content.split('\n');
  const parsedResult = {
    speech: '',
    actions: []
  };

  let currentTime = 0;
  
  for (let line of lines) {
    // Check for timestamp pattern [MM:SS]
    const timeMatch = line.match(/^\[(\d+):(\d+)\]/);
    // Check for whiteboard actions
    const writeMatch = line.match(/{write:\s*"([^"]+)"}/);
    
    // Process and add to appropriate result
    // ...
  }
  
  return parsedResult;
}
```

### 3. Whiteboard Synchronization

The `ResponseSynchronizer` class in `web/src/utils/ResponseSynchronizer.js` handles the timing:

```javascript
// From web/src/utils/ResponseSynchronizer.js
startSync(audio) {
  this.currentAudio = audio;
  this.isPlaying = true;
  this.startTime = Date.now();
  
  // Immediately trigger actions with time=0
  this._triggerImmediateActions();
  
  // Start the synchronization loop
  this.syncLoop();
}

syncLoop() {
  const elapsedSeconds = (Date.now() - this.startTime) / 1000;
  
  // Find actions that should be triggered based on their timestamps
  const actionsToTrigger = this.actions.filter(action => 
    action.time <= elapsedSeconds && !action.triggered
  );
  
  // Execute each action by calling the callback
  actionsToTrigger.forEach(action => {
    this.onActionCallback(action);
    action.triggered = true;
  });
  
  // Continue the loop
  requestAnimationFrame(() => this.syncLoop());
}
```

### 4. Whiteboard Rendering

The `Whiteboard` component in `web/src/components/Whiteboard.jsx` renders actions on a canvas:

```javascript
// From web/src/components/Whiteboard.jsx
useEffect(() => {
  if (!ctx || content.length === 0) return;

  // Current cursor position for writing text
  let cursorX = 30;
  let cursorY = 50;
  
  // Clear canvas first
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);
  ctx.fillStyle = textColor;
  
  // Draw all content
  content.forEach(item => {
    switch (item.type) {
      case 'write':
        // Handle writing text with wrapping
        // ...
        break;
      case 'draw':
        // Handle drawing shapes
        // ...
        break;
      case 'highlight':
        // Handle highlighting
        // ...
        break;
    }
  });
}, [content, ctx, dimensions]);
```

## System Prompt

The AI tutor is guided by a detailed system prompt in `server/lib/assistant.js`:

```javascript
// From server/lib/assistant.js
const TUTOR_SYSTEM_PROMPT = `You are an intelligent, friendly, and engaging AI tutor.
Your role is to teach complex topics in simple, understandable ways.
You have access to a digital whiteboard where you can write text, draw shapes, highlight content, and erase items.

IMPORTANT FORMATTING RULES:
1. All your responses MUST include whiteboard actions. NEVER give a response without writing something on the whiteboard.
2. Begin EVERY response with a writing action at timestamp [00:00] to ensure immediate visual feedback.
...
`;
```

## Setup and Running

### Prerequisites

- Node.js 14+ 
- npm or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd voice-ai-js-starter
```

2. Create a `.env` file in the server directory:
```
OPENAI_API_KEY=<your-openai-api-key>
```

3. Install dependencies and start the application:

For the server:
```bash
cd server
npm install
npm start
```

For the web client:
```bash
cd web
npm install
npm start
```

4. Open your browser to `http://localhost:3000`

## Customization Options

### Adding New Topics

Edit `web/src/components/TopicSelector.jsx` to modify the available topics:

```javascript
const topicCategories = [
  {
    name: 'Mathematics',
    topics: [
      'Calculus - Integration by Substitution',
      'Calculus - Differentiation',
      // Add more topics here
    ]
  },
  // Add more categories here
];
```

### Modifying Whiteboard Tools

The whiteboard supports these action types:
- `write`: Writing text
- `draw`: Drawing shapes (rectangle, circle, arrow, line)
- `highlight`: Highlighting existing content
- `erase`: Erasing content

Add more shapes or actions by extending the whiteboard component.

### Changing the Tutor Voice

In `server/index.js`, modify the voice settings in the AiTutor initialization:

```javascript
const AiTutor = new Assistant(
  `...instructions...`,
  {
    // Change voice model and voice name here
    voiceModel: "openai/tts-1",
    voiceName: "nova", // Try different voices: alloy, echo, fable, onyx, shimmer
  }
);
```

## Troubleshooting

### No Whiteboard Actions

If text isn't appearing on the whiteboard:

1. Check browser console for errors
2. Verify the AI response format in logs (look for `[AI Response Raw]` entries)
3. Ensure WebSocket connection is established
4. Check if actions are being parsed correctly

### Audio Not Playing

If you can't hear the AI:

1. Ensure your browser allows audio
2. Check headphone connections
3. Verify the TTS service is working (see logs for errors)

### Sync Issues

If whiteboard actions aren't synchronized with speech:

1. Check for timestamp parsing issues
2. Ensure the ResponseSynchronizer is receiving the correct actions
3. Verify audio duration calculations

## Advanced: Adding Custom Whiteboard Actions

To add new whiteboard action types:

1. Update the system prompt to include the new action format
2. Add parsing logic in `parseResponseForWhiteboard`
3. Implement rendering in the Whiteboard component

Example for adding a new "circle" action:

```javascript
// In parseResponseForWhiteboard
const circleMatch = line.match(/{circle:\s*"(\d+),(\d+),(\d+)"}/);
if (circleMatch) {
  parsedResult.actions.push({
    type: 'circle',
    x: parseInt(circleMatch[1]),
    y: parseInt(circleMatch[2]),
    radius: parseInt(circleMatch[3]),
    time: currentTime
  });
  line = line.replace(circleMatch[0], '').trim();
}

// In Whiteboard component's useEffect
case 'circle':
  ctx.beginPath();
  ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
  ctx.stroke();
  break;
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Based on the [voice-ai-js-starter](https://github.com/botany-labs/voice-ai-js-starter) project
- Uses OpenAI for AI capabilities