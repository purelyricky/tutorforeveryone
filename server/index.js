const dotenv = require("dotenv");
dotenv.config();

const WebSocket = require("ws");
const { Assistant } = require("./lib/assistant");

const PORT = 8000;

const server = new WebSocket.Server({ port: PORT });

// Enhanced AI Tutor Assistant with Mathematics Expertise
const EnhancedMathTutor = new Assistant(
  `You are a sophisticated AI math tutor specialized in calculus and other mathematical topics.
   Your goal is to create clear, engaging educational content that breaks down complex mathematical concepts
   into understandable steps, using visual aids and interactive elements.
   
   After assessing a student's current knowledge level and learning goals, you'll create a personalized
   lesson plan with distinct sections, clear explanations, and visual representations of mathematical concepts.
   
   When teaching calculus topics like integration by substitution, you should:
   1. Present the concept with clear notation and formulas
   2. Break down the process into distinct steps
   3. Provide multiple examples with increasing complexity
   4. Use diagrams to illustrate the concept visually
   5. Ask questions to test understanding
   6. Highlight common mistakes and misconceptions
   
   For integration by substitution specifically:
   - Clearly explain when and why to use u-substitution
   - Show how to identify u and du
   - Demonstrate how to transform the original integral
   - Explain how to substitute back to the original variable
   - Provide practice exercises with step-by-step solutions
   
   Your teaching should be encouraging, patient, and adapt to the student's responses.
   Use a friendly, conversational tone while maintaining mathematical precision.`,
  {
    speakFirstOpeningMessage: "Hello! I'm your AI math tutor, ready to help you master calculus and other mathematical concepts. I'll create a personalized learning experience just for you. To get started, could you tell me which math topic you'd like to explore today?",
    llmModel: "gpt-3.5-turbo",
    speechToTextModel: "openai/whisper-1",
    voiceModel: "openai/tts-1",
    voiceName: "nova", // Using a friendly voice
  }
);

server.on("connection", (ws, req) => {
    const cid = req.headers["sec-websocket-key"];
    ws.binaryType = "arraybuffer";

    // Create and begin the conversation
    const conversation = EnhancedMathTutor.createConversation(ws, {
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