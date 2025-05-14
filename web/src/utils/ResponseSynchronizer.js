/**
 * ResponseSynchronizer handles the synchronization between AI speech and whiteboard actions.
 * It extracts actions and text from AI responses and schedules them based on timestamps.
 */
class ResponseSynchronizer {
    constructor() {
      this.actions = [];
      this.currentAudio = null;
      this.isPlaying = false;
      this.startTime = null;
      this.onActionCallback = null;
      this.onSpeakingCallback = null;
    }
  
    /**
     * Set the callback for when actions should be executed
     * @param {Function} callback - Function to call when an action should be executed
     */
    setActionCallback(callback) {
      this.onActionCallback = callback;
    }
  
    /**
     * Set the callback for speaking status changes
     * @param {Function} callback - Function to call when speaking status changes
     */
    setSpeakingCallback(callback) {
      this.onSpeakingCallback = callback;
    }
  
    /**
     * Process incoming message from the server
     * @param {string|object} message - Message from the server
     * @returns {boolean} - Whether the message was a whiteboard action
     */
    processMessage(message) {
      try {
        // If the message is a string, try to parse it as JSON
        const data = typeof message === 'string' ? JSON.parse(message) : message;
        
        if (data && data.type === 'whiteboard_actions') {
          this.actions = data.actions.map(action => ({
            ...action,
            triggered: false
          }));
          
          // Immediately trigger actions with time=0 or very small time
          this._triggerImmediateActions();
          
          return true;
        }
      } catch (e) {
        // Not JSON or not our message format
        return false;
      }
      
      return false;
    }
  
    /**
     * Immediately trigger actions with time=0 or very small timestamps
     * This ensures something appears on the whiteboard right away
     */
    _triggerImmediateActions() {
      if (!this.actions.length || !this.onActionCallback) return;
      
      // Find actions with time <= 1 second to show immediately
      const immediateActions = this.actions.filter(action => 
        action.time <= 1 && !action.triggered
      );
      
      // Execute these actions right away
      immediateActions.forEach(action => {
        this.onActionCallback(action);
        action.triggered = true;
      });
    }
  
    /**
     * Start synchronization when audio starts playing
     * @param {Audio} audio - Audio element that's playing
     */
    startSync(audio) {
      this.currentAudio = audio;
      this.isPlaying = true;
      this.startTime = Date.now();
      
      // Notify that speaking has started
      if (this.onSpeakingCallback) {
        this.onSpeakingCallback(true);
      }
      
      // Trigger any immediate actions again to ensure something is shown
      this._triggerImmediateActions();
      
      // Start the synchronization loop
      this.syncLoop();
      
      // Listen for audio end
      this.currentAudio.addEventListener('ended', () => {
        this.isPlaying = false;
        if (this.onSpeakingCallback) {
          this.onSpeakingCallback(false);
        }
      });
    }
  
    /**
     * Stop synchronization
     */
    stopSync() {
      this.isPlaying = false;
      if (this.onSpeakingCallback) {
        this.onSpeakingCallback(false);
      }
    }
  
    /**
     * Synchronization loop - checks for actions to execute based on current time
     */
    syncLoop() {
      if (!this.isPlaying) return;
      
      const elapsedSeconds = (Date.now() - this.startTime) / 1000;
      
      // Find actions that should be triggered based on their timestamps
      const actionsToTrigger = this.actions.filter(action => 
        action.time <= elapsedSeconds && !action.triggered
      );
      
      // Execute each action
      actionsToTrigger.forEach(action => {
        if (this.onActionCallback) {
          this.onActionCallback(action);
        }
        
        // Mark as triggered
        action.triggered = true;
      });
      
      // Continue the loop if we're still playing and there are untriggered actions
      if (this.isPlaying && this.actions.some(action => !action.triggered)) {
        requestAnimationFrame(() => this.syncLoop());
      }
    }
    
    /**
     * Reset synchronizer state
     */
    reset() {
      this.actions = [];
      this.isPlaying = false;
      this.startTime = null;
      
      if (this.onSpeakingCallback) {
        this.onSpeakingCallback(false);
      }
    }
  }
  
  export default ResponseSynchronizer;