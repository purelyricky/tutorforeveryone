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
    this.systemPrompt = options.systemPrompt ?? EDUCATIONAL_TUTOR_SYSTEM_PROMPT;
    this.tools = options.canHangUp === false ? TOOLS_NONE : TOOL_HANG_UP; // NOTE: only tool supported right now is hang-up
    this.speakFirst = options.speakFirst ?? true;
    this.speakFirstOpeningMessage = options.speakFirstOpeningMessage;
    this.llmModel = options.llmModel ?? "gpt-3.5-turbo";
    this.voiceModel = options.voiceModel ?? "openai/tts-1";
    this.voiceName = options.voiceName ?? "shimmer";
    this.speechToTextModel = options.speechToTextModel ?? "openai/whisper-1";
    this.tts = new TextToSpeech(this.voiceModel, this.voiceName, options.ttsFormat ?? TTS_AUDIO_FORMATS.PCM_24K);
    this.contentStructure = options.contentStructure ?? { sections: [], currentSection: 0, questions: [] };
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

    // Parse the content for sections, highlights, and questions
    const parsedContent = this.parseResponseForContent(content);

    return {
      content: parsedContent.speech,
      selectedTool,
      contentActions: parsedContent.actions
    };
  }

  parseResponseForContent(content) {
    const parsedResult = {
      speech: '',
      actions: []
    };
    
    // Regular expressions for parsing different content elements
    const sectionRegex = /{section:\s*"([^"]+)"}/g;
    const highlightRegex = /{highlight:\s*"([^"]+)"}/g;
    const questionRegex = /{question:\s*"([^"]+)",\s*options:\s*\[(.*?)\]}/g;
    const pageBreakRegex = /{page_break}/g;
    const mermaidRegex = /{mermaid:\s*```([^`]+)```}/g;
    const imageRegex = /{image:\s*"([^"]+)"}/g;
    
    // Process the content for different actions
    let modifiedContent = content;
    
    // Extract sections
    let match;
    while ((match = sectionRegex.exec(modifiedContent)) !== null) {
      parsedResult.actions.push({
        type: 'section',
        title: match[1]
      });
      modifiedContent = modifiedContent.replace(match[0], '');
    }
    
    // Extract highlights
    while ((match = highlightRegex.exec(modifiedContent)) !== null) {
      parsedResult.actions.push({
        type: 'highlight',
        content: match[1]
      });
      modifiedContent = modifiedContent.replace(match[0], '');
    }
    
    // Extract questions
    while ((match = questionRegex.exec(modifiedContent)) !== null) {
      const options = match[2].split(',').map(opt => opt.trim().replace(/^"|"$/g, ''));
      parsedResult.actions.push({
        type: 'question',
        content: match[1],
        options: options
      });
      modifiedContent = modifiedContent.replace(match[0], '');
    }
    
    // Extract page breaks
    while ((match = pageBreakRegex.exec(modifiedContent)) !== null) {
      parsedResult.actions.push({
        type: 'page_break'
      });
      modifiedContent = modifiedContent.replace(match[0], '');
    }
    
    // Extract mermaid diagrams
    while ((match = mermaidRegex.exec(modifiedContent)) !== null) {
      parsedResult.actions.push({
        type: 'mermaid',
        diagram: match[1]
      });
      modifiedContent = modifiedContent.replace(match[0], '');
    }
    
    // Extract image references
    while ((match = imageRegex.exec(modifiedContent)) !== null) {
      parsedResult.actions.push({
        type: 'image',
        url: match[1]
      });
      modifiedContent = modifiedContent.replace(match[0], '');
    }
    
    // The remaining content is the speech
    parsedResult.speech = modifiedContent.trim();
    
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

const EDUCATIONAL_TUTOR_SYSTEM_PROMPT = `You are an exceptional educational AI tutor designed to create engaging, interactive learning experiences.

CORE FUNCTIONALITY:
1. You create structured educational content divided into clear sections with a beginning, middle, and end.
2. You ask follow-up questions to assess understanding before progressing to new sections.
3. You use visual elements like diagrams, illustrations, and highlighting to enhance learning.
4. You adapt your teaching style based on the learner's responses and engagement.

CONTENT STRUCTURE FORMAT:
When creating educational content, follow this structured format:

1. INITIAL ASSESSMENT: Begin by asking the learner questions to understand their:
   - Current knowledge level
   - Learning style preferences
   - Specific goals or interests within the topic

2. CONTENT ORGANIZATION: Once you understand their needs, create content with:
   - Clear section headers using {section: "Section Title"}
   - Page breaks between major concepts using {page_break}
   - Highlighted key points using {highlight: "text to highlight"}
   - Interactive questions using {question: "What's your understanding of X?", options: ["Option 1", "Option 2", "Option 3"]}

3. VISUAL ELEMENTS:
   - Create diagrams using Mermaid syntax: {mermaid: \`\`\`graph TD; A[Concept A] --> B[Concept B]\`\`\`}
   - Reference images when useful: {image: "description of needed image"}

4. NARRATIVE STRUCTURE:
   - Begin each section with a clear introduction
   - Present concepts from simple to complex
   - Use examples and analogies to illustrate points
   - End each section with a brief summary

5. ENGAGEMENT STRATEGY:
   - Ask questions after each major concept
   - Provide immediate feedback on responses
   - Encourage the learner to explain concepts in their own words
   - Acknowledge progress and correct misconceptions

TEACHING TONE AND APPROACH:
- Maintain a friendly, encouraging tone
- Use simple language to explain complex concepts
- Break down difficult ideas into manageable steps
- Use metaphors and real-world examples
- Show enthusiasm for the subject matter
- Be patient and supportive with learner questions

IMPORTANT: Your content will be displayed like pages in a book, one section at a time. Design your content with this format in mind, making each section self-contained but connected to the overall learning progression.`;

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