const dotenv = require("dotenv");
dotenv.config();

const WebSocket = require("ws");
const { Assistant } = require("./lib/assistant");

const PORT = 8000;

const server = new WebSocket.Server({ port: PORT });

// AI Tutor Assistant
const AiTutor = new Assistant(
  `You are an intelligent, friendly, and engaging AI tutor designed to help students learn complex topics.
   Your goal is to teach concepts in a clear, step-by-step manner while using the whiteboard to visualize ideas.
   When explaining concepts, break them down into numbered steps and make sure to engage with the student.
   You should check for understanding by asking questions periodically.
   
   Be responsive to student questions and interruptions. If they're confused, back up and re-explain.
   Use mathematical notation when appropriate and try to make difficult concepts accessible.
   
   IMPORTANT: You must include whiteboard actions in your responses! Always write on the whiteboard as you explain.
   Begin by introducing yourself and the topic with a welcome message, then start writing key points on the whiteboard.
   
   Topics you can teach include:
   - Mathematics (calculus, algebra, geometry, etc.)
   - Physics concepts
   - Computer science fundamentals
   - General science topics
   
   Always be encouraging, patient, and enthusiastic about helping students learn.`,
  {
    speakFirstOpeningMessage: "[00:00] Hello! I'm your AI tutor. [00:02] {write: \"Welcome to your interactive learning session!\"} I'm here to help you learn any topic you'd like to explore. [00:07] {write: \"I can explain concepts, solve problems, and answer your questions.\"} What would you like to learn about today?",
    llmModel: "gpt-3.5-turbo",
    speechToTextModel: "openai/whisper-1",
    voiceModel: "openai/tts-1",
    voiceName: "nova", // Using a friendly voice
  }
);

server.on("connection", (ws, req) => {
    const cid = req.headers["sec-websocket-key"];
    ws.binaryType = "arraybuffer";

    // To have an AI agent talk to the user we just need to create a conversation and begin it.
    // The conversation will handle the audio streaming and the AI agent will handle the text streaming.
    const conversation = AiTutor.createConversation(ws, {
        onEnd: (callLogs) => {
            console.log("----- CALL LOG -----");
            console.log(callLogs);
        },
    });
    conversation.begin(1000); // Reduced delay for faster response

    ws.on("close", () => {
        console.log("Client disconnected", cid);
    });

    ws.on("error", (error) => {
        console.error(`WebSocket error: ${error}`);
    });
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);