import { useState, useRef, useEffect } from "react";
import * as vad from "@ricky0123/vad-web";
import EventEmitter from "events";
import LearningDashboard from "./components/LearningDashboard";

// WebSocket connection URL - fallback to localhost if not set in environment
const SERVER_WS_URL = process.env.REACT_APP_SERVER_WS_URL ?? "ws://localhost:8000";

// Communication tokens
const START_LISTENING_TOKEN = "RDY"; // Sent by server to indicate start VAD
const END_OF_SPEECH_TOKEN = "EOS"; // End of speech on client side
const INTERRUPT_TOKEN = "INT"; // Interrupt reported from client side
const CLEAR_BUFFER_TOKEN = "CLR"; // Clear playback buffer request from server

// Audio context settings - shared between streamer and playback
// We're using float32arrays of PCM 24k 16bit mono
const AudioContextSettings = {
  sampleRate: 24000,
  bitDepth: 16,
  numChannels: 1,
  echoCancellation: true,
  autoGainControl: true,
  noiseSuppression: true,
  channelCount: 1,
};

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);
  const streamer = useRef<Streamer | null>(null);
  const playback = useRef<Playback | null>(null);
  const lastEOS = useRef<Date | null>(null);

  // Initialize the app with animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording(true);
    };
  }, []);

  const stopRecording = (graceful: boolean = false) => {
    setIsRecording(false);
    streamer.current?.stop(graceful);
    playback.current?.stop(graceful);
    
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close();
    }
    
    ws.current = null;
    lastEOS.current = null;
    setConnectionError(null);
  };

  const startRecording = async () => {
    if (isRecording || isConnecting) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Check if we already have a connection or need a new one
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        ws.current = new WebSocket(SERVER_WS_URL);
        ws.current.binaryType = "arraybuffer";
        
        // Set up connection promise
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Connection timeout"));
          }, 10000);
          
          if (ws.current) {
            ws.current.onopen = () => {
              clearTimeout(timeout);
              resolve();
            };
            
            ws.current.onerror = (event) => {
              clearTimeout(timeout);
              reject(new Error("Failed to connect to the server"));
            };
          }
        });
        
        // Configure message handling after successful connection
        if (ws.current) {
          ws.current.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
              playback.current?.addSamples(new Float32Array(event.data));
            } else if (event.data === CLEAR_BUFFER_TOKEN) {
              playback.current?.clear().then((didInterrupt: boolean) => {
                if (didInterrupt) {
                  console.log("--- interrupt recorded", didInterrupt);
                  ws.current && ws.current.send(INTERRUPT_TOKEN);
                }
              });
            } else if (event.data === START_LISTENING_TOKEN) {
              playback.current?.once("playbackEnd", () => {
                console.log("--- starting vad");
                streamer.current?.startVoiceDetection();
              });
            } 
            // Other messages are handled by the Dashboard component
          };
          
          ws.current.onclose = () => {
            console.log("WebSocket connection closed");
            stopRecording(true);
          };
        }
      }
      
      // Initialize audio components
      console.log("Starting recording session", new Date());
      
      // Create playback handler
      playback.current = new Playback(new AudioContext(AudioContextSettings));
      playback.current.on("playbackStart", () => {
        if (lastEOS.current) {
          const responseTime = new Date().getTime() - lastEOS.current.getTime();
          console.log("--- Response time:", responseTime, "ms");
        }
      });
      playback.current.start();
      
      // Create audio streamer
      if (ws.current) {
        streamer.current = new Streamer(ws.current, console.log);
        
        streamer.current.on("speechStart", () => {
          playback.current?.clear().then((didInterrupt: boolean) => {
            if (didInterrupt) {
              console.log("--- User interrupt detected");
              ws.current && ws.current.send(INTERRUPT_TOKEN);
            }
          });
        });
        
        streamer.current.on("speechEnd", () => {
          lastEOS.current = new Date();
        });
        
        await streamer.current.start();
      }
      
      setIsRecording(true);
      setIsConnecting(false);
      
    } catch (error: any) {
      console.error("Connection error:", error);
      setConnectionError(error.message || "Failed to connect to AI tutor server");
      stopRecording(false);
      setIsConnecting(false);
    }
  };

  // Render app with transition effects
  return (
    <div className={`app-container ${appReady ? 'app-ready' : 'app-loading'}`}>
      <header className="app-header">
        <h1 className="app-title">AI Tutor Platform</h1>
        <div className="app-subtitle">Personalized Educational Experiences</div>
      </header>

      <main className="app-content">
        {!appReady ? (
          <div className="app-initializing">
            <div className="loader"></div>
            <p>Initializing AI Tutor Platform...</p>
          </div>
        ) : (
          <>
            {connectionError && (
              <div className="connection-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>{connectionError}</p>
                <button onClick={() => startRecording()}>Retry Connection</button>
              </div>
            )}
            
            <LearningDashboard 
              ws={ws.current} 
              startRecording={startRecording}
              stopRecording={stopRecording}
              isRecording={isRecording}
            />
          </>
        )}
      </main>
      
      <footer className="app-footer">
        <div className="app-footer-content">
          <p>Powered by AI • Voice-Enabled Learning</p>
          <a href="https://github.com/botany-labs/voice-ai-js-starter" target="_blank" rel="noopener noreferrer" className="github-link">
            <img src="/GitHub-Logo.svg" alt="GitHub" className="github-logo" />
          </a>
        </div>
      </footer>
      
      <style>{`
        .app-loading {
          opacity: 0;
          transform: translateY(10px);
        }
        
        .app-ready {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
        }
        
        .app-initializing {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-light);
        }
        
        .loader {
          width: 40px;
          height: 40px;
          border: 3px solid var(--primary-light);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s infinite linear;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .connection-error {
          background-color: #FEE2E2;
          border: 1px solid #EF4444;
          color: #B91C1C;
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        
        .connection-error button {
          background-color: #B91C1C;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 500;
          margin-left: auto;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .connection-error button:hover {
          background-color: #991B1B;
        }
      `}</style>
    </div>
  );
}

// Audio Streaming class
class Streamer extends EventEmitter {
  ws: WebSocket;
  stream: MediaStream | null = null;
  processor: ScriptProcessorNode | null = null;
  vadMic: Promise<vad.MicVAD> | null = null;
  audioContext: AudioContext | null = null;
  userIsSpeaking: boolean = false;

  constructor(ws: WebSocket, private logMessage: (...args: any[]) => void) {
    super();
    this.ws = ws;

    // Initialize voice activity detection
    this.vadMic = vad.MicVAD.new({
      onSpeechStart: () => {
        this.emit("speechStart");
        logMessage("--- vad: speech start");
        this.userIsSpeaking = true;
      },
      onSpeechEnd: (audio) => {
        this.emit("speechEnd");
        logMessage("--- vad: speech end");
        ws.send(END_OF_SPEECH_TOKEN);
        this.userIsSpeaking = false;
      },
    });
    
    this.audioContext = new AudioContext(AudioContextSettings);
  }

  async startVoiceDetection() {
    try {
      const mic = await this.vadMic;
      if (mic) {
        await mic.start();
        console.log("Voice detection started");
      }
    } catch (error) {
      console.error("Failed to start voice detection:", error);
    }
  }

  async start(startVoiceDetection: boolean = false) {
    try {
      // Request microphone access
      const constraints = { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      
      // Create audio processing pipeline
      const audioContext = new AudioContext({ sampleRate: 24000 });
      console.log("Audio context sample rate:", audioContext.sampleRate);
      
      const source = audioContext.createMediaStreamSource(stream);
      console.log("Media stream source created");
      
      this.processor = audioContext.createScriptProcessor(1024, 1, 1);
      this.processor.onaudioprocess = (event) => {
        if (this.ws.readyState === WebSocket.OPEN && this.userIsSpeaking) {
          this.ws.send(event.inputBuffer.getChannelData(0));
        }
      };
      
      source.connect(this.processor);
      this.processor.connect(audioContext.destination);
      
      // Start voice detection if requested
      if (startVoiceDetection) {
        await this.startVoiceDetection();
      }
    } catch (error) {
      console.error("Error starting audio stream:", error);
      throw error;
    }
  }

  async stop(graceful: boolean = false) {
    // Suspend audio context
    if (this.audioContext) {
      try {
        await this.audioContext.suspend();
      } catch (error) {
        console.warn("Error suspending audio context:", error);
      }
    }

    // Stop all audio tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
        if (this.stream) {
          this.stream.removeTrack(track);
        }
      });
    }
    
    // Clean up processor
    if (this.processor) {
      this.processor.onaudioprocess = null;
    }
    
    // Clean up VAD
    try {
      const vadMic = await this.vadMic;
      if (vadMic) {
        await vadMic.destroy();
      }
      this.vadMic = null;
    } catch (error) {
      console.warn("Error destroying VAD mic:", error);
    }
  }
}

// Audio Playback class
class Playback extends EventEmitter {
  samples: Float32Array[] = [];
  lastFramePlayed: "silence" | "non-silence" = "silence";

  constructor(public audioContext: AudioContext) {
    super();
    this.audioContext.suspend();
    
    // Create audio processing pipeline
    const scriptNode = this.audioContext.createScriptProcessor(1024, 1, 1);
    scriptNode.onaudioprocess = (event) => {
      if (this.samples.length > 0) {
        // Playing audio
        if (this.lastFramePlayed === "silence") {
          this.emit("playbackStart");
        }
        this.lastFramePlayed = "non-silence";
        event.outputBuffer.getChannelData(0).set(this.samples[0]);
        this.samples.shift();
      } else {
        // Not playing (silence)
        if (this.lastFramePlayed === "non-silence") {
          this.emit("playbackEnd");
        }
        this.lastFramePlayed = "silence";
        const silence = new Float32Array(1024);
        event.outputBuffer.getChannelData(0).set(silence);
      }
    };

    // Add gain control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0.5; // 50% volume
    scriptNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
  }

  async clear() {
    await this.audioContext.suspend();
    const dirty = this.samples.length > 0;
    this.samples = [];
    await this.audioContext.resume();
    this.emit("clear", { dirty });
    this.lastFramePlayed = "silence";
    return dirty;
  }

  start() {
    this.audioContext.resume();
  }

  stop(graceful: boolean = false) {
    if (graceful && this.samples.length > 0) {
      // If graceful and still playing, wait a bit before stopping
      return setTimeout(() => {
        this.stop(true);
      }, 1000);
    } else {
      // Force stop
      this.audioContext.suspend();
    }
  }

  addSamples(samples: Float32Array) {
    this.samples.push(samples);
  }
}