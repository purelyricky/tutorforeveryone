import { useState, useRef, useEffect } from "react";
import * as vad from "@ricky0123/vad-web";
import EventEmitter from "events";
import Dashboard from "./components/Dashboard";

const SERVER_WS_URL =
  process.env.REACT_APP_SERVER_WS_URL ?? "ws://localhost:8000";

const START_LISTENING_TOKEN = "RDY"; // Sent by server to indicate start VAD
const END_OF_SPEECH_TOKEN = "EOS"; // End of speech on client side
const INTERRUPT_TOKEN = "INT"; // Interrupt reported from client side
const CLEAR_BUFFER_TOKEN = "CLR"; // Clear playback buffer request from server

// These are shared between streamer and playback but
// we are using float32arrays of pcm 24k 16bit mono
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
  const ws = useRef<WebSocket | null>(null);
  const streamer = useRef<Streamer | null>(null);
  const playback = useRef<Playback | null>(null);
  const lastEOS = useRef<Date | null>(null);

  const stopRecording = (graceful: boolean = false) => {
    setIsRecording(false);
    streamer.current?.stop(graceful);
    playback.current?.stop(graceful);
    ws.current?.close();
    ws.current = null;
    lastEOS.current = null;
  };

  const startRecording = async () => {
    setIsRecording(true);
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      ws.current = new WebSocket(SERVER_WS_URL);
      ws.current.binaryType = "arraybuffer";
      ws.current.onopen = () => {
        ws.current &&
          (ws.current.onmessage = (event) => {
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
            // Dashboard handles other messages
          });

        console.log("start recording", new Date());
        playback.current = new Playback(new AudioContext(AudioContextSettings));
        playback.current.on("playbackStart", () => {
          if (!lastEOS.current) {
            return;
          }
          const responseTime = new Date().getTime() - lastEOS.current.getTime();
          console.log("--- time.TOTAL_RESPONSE ", responseTime, " ms");
        });
        playback.current.start();
        streamer.current = new Streamer(ws.current!, console.log);
        streamer.current.on("speechStart", () => {
          playback.current?.clear().then((didInterrupt: boolean) => {
            if (didInterrupt) {
              console.log("--- interrupt recorded", didInterrupt);
              ws.current && ws.current.send(INTERRUPT_TOKEN);
            }
          });
        });
        streamer.current.on("speechEnd", () => {
          lastEOS.current = new Date();
        });
        streamer.current.start();

        ws.current &&
          (ws.current.onclose = () => {
            console.log("websocket closed");
            stopRecording(true);
          });
      };

      ws.current.onerror = (event) => {
        console.log("websocket error", event);
      };
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">AI Tutor Platform</h1>
      </header>

      <main className="app-content">
        <Dashboard 
          ws={ws.current} 
          startRecording={startRecording}
          stopRecording={stopRecording}
          isRecording={isRecording}
        />
      </main>
    </div>
  );
}

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
    (await this.vadMic!).start();
  }

  async start(startVoiceDetection: boolean = false) {
    const constraints = {
      audio: true,
    };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      this.stream = stream;
      const audioContext = new AudioContext({
        sampleRate: 24000,
      });
      this.logMessage("audio context sample rate", audioContext.sampleRate);
      const source = audioContext.createMediaStreamSource(stream);
      this.logMessage("media stream source created");
      this.processor = audioContext.createScriptProcessor(1024, 1, 1);
      this.processor.onaudioprocess = (event) => {
        if (this.ws.readyState === WebSocket.OPEN && this.userIsSpeaking) {
          this.ws.send(event.inputBuffer.getChannelData(0));
        }
      };
      source.connect(this.processor);
      this.processor.connect(audioContext.destination);
    });
    if (startVoiceDetection) {
      await this.startVoiceDetection();
    }
  }

  async stop(graceful: boolean = false) {
    this.audioContext?.suspend();

    this.stream?.getTracks().forEach((track) => {
      track.stop();
      this.stream?.removeTrack(track);
    });
    this.processor && (this.processor.onaudioprocess = null);
    const vadMic = await this.vadMic;
    vadMic && vadMic.destroy();
    this.vadMic = null;
  }
}

class Playback extends EventEmitter {
  samples: Float32Array[] = [];
  lastFramePlayed: "silence" | "non-silence" = "silence";

  constructor(public audioContext: AudioContext) {
    super();
    this.audioContext.suspend();
    const scriptNode = this.audioContext.createScriptProcessor(1024, 1, 1);
    scriptNode.onaudioprocess = (event) => {
      if (this.samples.length > 0) {
        if (this.lastFramePlayed === "silence") {
          this.emit("playbackStart");
        }
        this.lastFramePlayed = "non-silence";
        event.outputBuffer.getChannelData(0).set(this.samples[0]);
        this.samples.shift();
      } else {
        if (this.lastFramePlayed === "non-silence") {
          this.emit("playbackEnd");
        }
        this.lastFramePlayed = "silence";
        const silence = new Float32Array(1024);
        event.outputBuffer.getChannelData(0).set(silence);
      }
    };

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0.5;
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
    if (graceful) {
      if (this.samples.length > 0) {
        return setTimeout(() => {
          this.stop(true);
        }, 1000);
      }
    } else {
      this.audioContext.suspend();
    }
  }

  addSamples(samples: Float32Array) {
    this.samples.push(samples);
  }
}