const { CallEvents } = require("./call");

/**
 * Conversation represents a conversation between a user and an assistant.
 * It listens for user messages, sends assistant messages, and handles tool selections.
 */
class Conversation {
    /**
     * Constructor
     * @param {Assistant} assistant - Assistant to use for the conversation.
     * @param {Call} call - Call to use for the conversation.
     * @param {object} options - Options for the conversation.
     * @param {(callLogs: Array<{timestamp: string, event: string, meta: object}>) => void} options.onEnd - Function to call when the conversation ends.
     */
    constructor(assistant, call, options = {}) {
        this.assistant = assistant;
        this.call = call;
        this.onEnd = options.onEnd || (() => { });
        this.history = assistant.prompt;
        this.callLog = [];
        this.call.on(CallEvents.CALL_ENDED, () => {
            this.addToCallLog("CALL_ENDED");
            this.onEnd && this.onEnd(this.callLog);
        });
        this.call.on(CallEvents.INTERRUPT, () => {
            this.noteWhatWasSaid("user", "[Interrupted your last message]");
        });
        this.addToCallLog("INIT", {
            assistant: JSON.stringify(this.assistant),
        });
        this.learningPhase = "initial"; // initial, assessment, preparation, learning
        this.currentSection = 0;
        this.sections = [];
        this.userResponses = [];
    }

    /**
     * Begins the conversation.
     * @param {number} delay - Delay in milliseconds before starting to listen for user messages.
     */
    async begin(delay = 0) {
        setTimeout(async () => {
            this.startListening();
            this.addToCallLog("READY");
            this.call.indicateReady();

            if (this.assistant.speakFirst) {
                let firstMessage = this.assistant.speakFirstOpeningMessage;
                if (!firstMessage) {
                    const { content, contentActions } = await this.assistant.createResponse(this.history);
                    firstMessage = content;
                    
                    // Send content actions if any
                    if (contentActions && contentActions.length > 0) {
                        this.sendContentActions(contentActions);
                    }
                }
                this.noteWhatWasSaid("assistant", firstMessage);
                const audio = await this.assistant.textToSpeech(firstMessage);
                this.call.pushAudio(audio);
            }
        }, delay);
    }

    /**
     * Sends content actions to the client
     * @param {Array} actions - Array of content actions
     */
    sendContentActions(actions) {
        if (actions && actions.length > 0) {
            this.call.pushMeta(JSON.stringify({
                type: "content_actions",
                actions: actions
            }));
        }
    }

    /**
     * Updates the learning phase
     * @param {string} phase - New learning phase
     */
    updateLearningPhase(phase, additionalInfo = {}) {
        this.learningPhase = phase;
        this.call.pushMeta(JSON.stringify({
            type: "learning_phase",
            phase: phase,
            ...additionalInfo
        }));
        this.addToCallLog("LEARNING_PHASE_CHANGE", { 
            phase, 
            additionalInfo 
        });

        // If changing to assessment phase, notify that as well
        if (phase === 'assessment') {
            const topic = additionalInfo.topic || this.getLatestTopic();
            if (topic) {
                this.call.pushMeta(JSON.stringify({
                    type: "learning_phase",
                    phase: "assessment",
                    topic: topic
                }));
            }
        }
    }

    /**
     * Extracts the latest topic from conversation history
     * @returns {string|null} Latest topic or null if not found
     */
    getLatestTopic() {
        // Try to find a user message that indicates a topic
        for (let i = this.history.length - 1; i >= 0; i--) {
            const message = this.history[i];
            if (message.role === 'user' && message.content.toLowerCase().includes('learn about')) {
                const match = message.content.match(/learn about\s+(.+?)(?:\.|\?|$)/i);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
        }
        return null;
    }

    /**
     * Starts listening for user messages.
     */
    startListening() {
        this.call.on(CallEvents.USER_MESSAGE, async (message) => {
            this.noteWhatWasSaid("user", message);
            this.userResponses.push(message);

            // Check if we need to change learning phase based on user message
            if (this.learningPhase === "initial" && message.length > 0) {
                // User has selected a topic, move to assessment phase
                const topic = this.extractTopicFromMessage(message);
                this.updateLearningPhase("assessment", { topic });
            } else if (this.learningPhase === "assessment" && this.userResponses.length >= 3) {
                // After collecting enough assessment responses, move to preparation phase
                this.updateLearningPhase("preparation");
                
                // Send preparation notification to client
                this.call.pushMeta(JSON.stringify({
                    type: "preparation_started"
                }));
                
                // Wait a moment to simulate content creation
                setTimeout(() => {
                    this.updateLearningPhase("learning");
                }, 3000);
            }
            
            const { content, selectedTool, contentActions } = await this.assistant.createResponse(
                this.history
            );
            
            if (content) {
                this.noteWhatWasSaid("assistant", content);
                const audio = await this.assistant.textToSpeech(content);
                
                // Send content actions if any
                if (contentActions && contentActions.length > 0) {
                    this.sendContentActions(contentActions);
                    
                    // Process sections if present
                    const sectionActions = contentActions.filter(action => action.type === 'section');
                    if (sectionActions.length > 0) {
                        this.sections = [...this.sections, ...sectionActions.map(action => action.title)];
                    }
                }
                
                if (selectedTool) {
                    await this.call.pushAudio(audio);
                } else {
                    this.call.pushAudio(audio);
                }
            }
            
            if (selectedTool) {
                this.addToCallLog("TOOL_SELECTED", {
                    tool: selectedTool,
                });
            }

            if (selectedTool === "endCall") {
                this.call.pushMeta("---- Assistant Hung Up ----");
                this.call.end();
                this.call.off("userMessage", this.startListening);
                return;
            } else if (selectedTool) {
                // TODO: implement custom tools
                console.warn(
                    "[CUSTOM TOOLS NOT YET SUPPORTED] Unhandled tool:",
                    selectedTool
                );
            }
        });
    }

    /**
     * Extract topic from user message
     * @param {string} message - User message
     * @returns {string|null} - Extracted topic or null
     */
    extractTopicFromMessage(message) {
        // Check for "learn about" pattern
        const learnAboutPattern = /(?:learn|teach me) about\s+(.+?)(?:\.|\?|$)/i;
        const learnMatch = message.match(learnAboutPattern);
        if (learnMatch && learnMatch[1]) {
            return learnMatch[1].trim();
        }
        
        // If no "learn about" pattern, just return the message
        return message.trim();
    }

    /**
     * Adds an event to the call log.
     * @param {string} event - Event to add to the call log.
     * @param {object} meta - Meta data to add to the call log.
     */
    addToCallLog(event, meta) {
        const timestamp = new Date().toISOString();
        this.callLog.push({ timestamp, event, meta });
    }

    /**
     * Adds a message to the call log and history.
     * @param {string} who - Who said the message.
     * @param {string} message - Message to add to the call log and history.
     */
    noteWhatWasSaid(speaker, message) {
        this.addToCallLog(`TRANSCRIPT`, { speaker, message });
        this.history.push({ role: speaker, content: message });
        
        // Send the complete message separately to ensure it's displayed in the UI
        this.call.pushMeta(`${speaker}: ${message}`);
    }
}

module.exports = { Conversation };