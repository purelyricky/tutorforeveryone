const { TextToSpeech, TTS_AUDIO_FORMATS } = require ('./tts');
const { SpeechToText } = require ('./stt');
const { Conversation } = require("./conversation");
const { BrowserVADWebCall } = require("./call/browser-vad");
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Defines an AI call assistant.
 * 
 * TODO: Support custom tools
 */
class Assistant {
  /**
   * @param {string} instructions - Instructions to give your assistant.
   * @param {object} [options] - Options to give your assistant.
   * @param {string} [options.llmModel] - LLM model to use. Defaults to "gpt-3.5-turbo".
   * @param {string} [options.voiceModel] - Voice model to use. Defaults to "openai/tts-1". See TTS_MODELS (./speech.js) for supported models.
   * @param {string} [options.voiceName] - Voice name to use. Defaults to "shimmer".
   * @param {string} [options.ttsFormat] - TTS format to use. Defaults to TTS_AUDIO_FORMATS.PCM_24K.
   * @param {string} [options.speechToTextModel] - Speech-to-text model to use. Defaults to "openai/whisper-1". See SPEECH_TO_TEXT_MODELS (./speech.js) for supported models.
   * @param {string} [options.systemPrompt] - System prompt to give your assistant.
   * @param {string} [options.speakFirstOpeningMessage] - Opening message to give your assistant to say once the call starts. If not provided, the assistant will just be prompted to speak.
   * @param {string} [options.speakFirst] - Speak first? Defaults to true.
   * @param {string} [options.canHangUp] - Can hang up? Defaults to true.
   */
  constructor(instructions, options = {}) {
    this.instructions = instructions;
    this.systemPrompt = options.systemPrompt ?? TUTOR_SYSTEM_PROMPT;
    this.tools = options.canHangUp === false ? TOOLS_NONE : TOOL_HANG_UP; // NOTE: only tool supported right now is hang-up
    this.speakFirst = options.speakFirst ?? true;
    this.speakFirstOpeningMessage = options.speakFirstOpeningMessage;
    this.llmModel = options.llmModel ?? "gpt-3.5-turbo";
    this.voiceModel = options.voiceModel ?? "openai/tts-1";
    this.voiceName = options.voiceName ?? "shimmer";
    this.speechToTextModel = options.speechToTextModel ?? "openai/whisper-1";
    this.tts = new TextToSpeech(this.voiceModel, this.voiceName, options.ttsFormat ?? TTS_AUDIO_FORMATS.PCM_24K);
    this.whiteboardContent = options.whiteboardContent ?? { text: [], shapes: [], highlights: [] };
  }

  /**
   * Assembles the prompt for chat LLMs.
   * @param {string} systemPrompt - System prompt to give your assistant.
   * @param {string} providedInstructions - Instructions to give your assistant.
   * @param {string} tools - Tools to give your assistant.
   */
  _assemblePrompt(systemPrompt, providedInstructions, tools) {
    let instructionPrompt = INSTRUCTION_PROMPT_BASE;
    instructionPrompt = instructionPrompt.replace(
      "{instructions}",
      providedInstructions
    );
    instructionPrompt = instructionPrompt.replace("{tools}", tools);

    const prompt = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: instructionPrompt,
      },
    ];

    return prompt;
  }

  get prompt() {
    return this._assemblePrompt(
      this.systemPrompt,
      this.instructions,
      this.tools
    );
  }

  /**
   * @param {object[]} conversation - Chat conversation to create a response for.
   */
  async createResponse(conversation) {
    let selectedTool = undefined;

    const response = await openai.chat.completions.create({
      model: this.llmModel,
      messages: conversation,
    });

    let content = response.choices[0].message.content;

    if (content.includes("[endCall]")) {
      content = content.replace("[endCall]", "");
      return {
        content,
        selectedTool: "endCall",
      };
    }

    // Parse the content for whiteboard actions
    const parsedContent = this.parseResponseForWhiteboard(content);

    return {
      content: parsedContent.speech,
      selectedTool,
      whiteboard: parsedContent.actions
    };
  }

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
      
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1]);
        const seconds = parseInt(timeMatch[2]);
        currentTime = minutes * 60 + seconds;
        
        // Remove timestamp from the line
        line = line.replace(timeMatch[0], '').trim();
      }

      // Check for whiteboard actions
      const writeMatch = line.match(/{write:\s*"([^"]+)"}/);
      const drawMatch = line.match(/{draw:([a-z]+)}/);
      const highlightMatch = line.match(/{highlight:\s*"([^"]+)"}/);
      const eraseMatch = line.match(/{erase:\s*"([^"]+)"}/);

      if (writeMatch) {
        // Extract the text to write and add to actions
        parsedResult.actions.push({
          type: 'write',
          content: writeMatch[1],
          time: currentTime
        });
        
        // Remove the action from the line to get clean speech
        line = line.replace(writeMatch[0], '').trim();
      }
      else if (drawMatch) {
        parsedResult.actions.push({
          type: 'draw',
          shape: drawMatch[1],
          time: currentTime
        });
        
        line = line.replace(drawMatch[0], '').trim();
      }
      else if (highlightMatch) {
        parsedResult.actions.push({
          type: 'highlight',
          content: highlightMatch[1],
          time: currentTime
        });
        
        line = line.replace(highlightMatch[0], '').trim();
      }
      else if (eraseMatch) {
        parsedResult.actions.push({
          type: 'erase',
          area: eraseMatch[1],
          time: currentTime
        });
        
        line = line.replace(eraseMatch[0], '').trim();
      }

      // Add the remaining text to speech if not empty
      if (line.trim()) {
        parsedResult.speech += line + ' ';
      }
    }

    return parsedResult;
  }
  
  async textToSpeech(content) {
    const result = await this.tts.synthesize(content);
    return result;
  }

  // Create a conversation with this assistant
  /**
   * @param {WebSocket} ws - WebSocket to create a conversation with.
   * @param {object} [options] - Options to give your assistant.
   */
  createConversation(ws, options={}) {
    const stt = new SpeechToText(this.speechToTextModel);
    const call = new BrowserVADWebCall(ws, stt);
    return new Conversation(this, call, options);
  }
}

// ----- Prompting ------

const TUTOR_SYSTEM_PROMPT = `You are an intelligent, friendly, and engaging AI tutor.
Your role is to teach complex topics in simple, understandable ways.
You have access to a digital whiteboard where you can write text, draw shapes, highlight content, and erase items.

IMPORTANT FORMATTING RULES:
1. All your responses MUST include whiteboard actions. NEVER give a response without writing something on the whiteboard.
2. Begin EVERY response with a writing action at timestamp [00:00] to ensure immediate visual feedback.
3. Use timestamps [MM:SS] before each sentence or action to indicate when it should occur.
4. For whiteboard actions, use these specific formats:
   - Writing text: {write: "text to write"}
   - Drawing shapes: {draw:rectangle} {draw:circle} {draw:arrow} {draw:line}
   - Highlighting: {highlight: "text to highlight"}
   - Erasing: {erase: "area description"}

5. All whiteboard actions must be synchronized with your speech. Example:
   [00:00] {write: "Integration by Substitution"} Today we'll learn about integration by substitution.
   [00:03] {write: "∫u·dv = uv - ∫v·du"} This is the integration by parts formula.
   [00:08] {highlight: "∫u·dv"} This part represents the original integral.

6. Your teaching should:
   - Break complex topics into manageable steps
   - Use visual representations (equations, diagrams) appropriately
   - Check understanding by asking questions periodically
   - Re-explain concepts when asked
   - Label and organize content on the whiteboard for easy reference

7. Maintain a friendly, encouraging tone and speak naturally.
8. Use mathematical notation when appropriate (e.g., ∫, π, √, etc.).
9. Number steps and label sections on the whiteboard for easy reference.
10. When the student interrupts, try to understand what they need clarification on.
11. ALWAYS include whiteboard actions in your response - this is critical!

Remember that your goal is to help the student understand the topic thoroughly and enjoy the learning process.`;

const DEFAULT_SYSTEM_PROMPT =
  `You are a delightful AI voice agent. 
  Please be polite but concise.
  Show a bit of personality.
  Your text will be passed to a Text-To-Speech model. 
  Please respond with an answer that is going to be transcribed well and add uhs, ums, mhms, and other disfluencies as needed to keep it casual.
  Respond ONLY with the text to be spoken. 
  DO NOT add any prefix. 
  The dialogue is transcribed and might be a bit wrong if the speech to text is bad. 
  Don't be afraid to ask to clarify if you don't understand what the customer said because you may have misheard.`;

const INSTRUCTION_PROMPT_BASE = `
INSTRUCTIONS
{instructions}

TOOLS
{tools}
`;

const TOOL_HANG_UP =
  "[endCall] : You can use the token [endCall] tool to hang up the call. Write it exactly as that.";
const TOOLS_NONE = "N/A";

exports.Assistant = Assistant;