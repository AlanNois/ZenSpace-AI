import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MeditationSession } from '../types';
import { X, Play, Pause, Volume2, VolumeX, Mic, MicOff, Trees } from 'lucide-react';

interface MediaPlayerProps {
  session: MeditationSession;
  onClose: () => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({ session, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAmbientOn, setIsAmbientOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  
  // Refs for accessing fresh state inside speech callback
  const isPlayingRef = useRef(isPlaying);
  const isMutedRef = useRef(isMuted);
  const isAmbientOnRef = useRef(isAmbientOn);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isAmbientOnRef.current = isAmbientOn;
  }, [isAmbientOn]);

  // Initialize Ambient Audio
  useEffect(() => {
    // Using a soothing forest morning sound
    ambientAudioRef.current = new Audio('https://actions.google.com/sounds/v1/nature/forest_morning.ogg');
    ambientAudioRef.current.loop = true;
    ambientAudioRef.current.volume = 0.15; // Low volume for background

    return () => {
      ambientAudioRef.current?.pause();
      ambientAudioRef.current = null;
    };
  }, []);

  // Sync Ambient Playback with Main Playback
  useEffect(() => {
    if (isPlaying && isAmbientOn) {
      ambientAudioRef.current?.play().catch(e => console.warn("Ambient play failed:", e));
    } else {
      ambientAudioRef.current?.pause();
    }
  }, [isPlaying, isAmbientOn]);

  // Initialize Audio Context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);
    
    // Auto-play when mounted
    playAudio();

    return () => {
      stopAudio();
      audioContextRef.current?.close();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const playAudio = useCallback(() => {
    if (!audioContextRef.current || !session.audioBuffer || !gainNodeRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    sourceRef.current = audioContextRef.current.createBufferSource();
    sourceRef.current.buffer = session.audioBuffer;
    sourceRef.current.connect(gainNodeRef.current);
    
    // Handle start time for pause/resume
    const offset = pauseTimeRef.current;
    sourceRef.current.start(0, offset);
    startTimeRef.current = audioContextRef.current.currentTime - offset;

    setIsPlaying(true);
    
    // Animation loop for progress
    const updateProgress = () => {
      if (!audioContextRef.current) return;
      const current = audioContextRef.current.currentTime - startTimeRef.current;
      const duration = session.audioBuffer?.duration || 1;
      const percent = (current / duration) * 100;
      
      if (percent >= 100) {
        setIsPlaying(false);
        setProgress(100);
        pauseTimeRef.current = 0;
      } else {
        setProgress(percent);
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    updateProgress();
    
    sourceRef.current.onended = () => {
       // Optionally handle end state
    };
  }, [session]);

  const pauseAudio = useCallback(() => {
    if (sourceRef.current && audioContextRef.current) {
      sourceRef.current.stop();
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) { /* ignore if already stopped */ }
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  const togglePlay = () => {
    if (isPlaying) pauseAudio();
    else playAudio();
  };

  const toggleMute = useCallback(() => {
    if (gainNodeRef.current) {
      const nextState = !isMutedRef.current;
      gainNodeRef.current.gain.value = nextState ? 0 : 1;
      setIsMuted(nextState);
    }
  }, []);

  const toggleAmbient = useCallback(() => {
    setIsAmbientOn(prev => !prev);
  }, []);

  const toggleVoiceControl = () => {
    setIsListening(!isListening);
  };

  // Speech Recognition Logic
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Track if this specific effect instance is active
    let isEffectActive = true;

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase().trim();
      console.log("Voice Command:", command);

      if (command.includes('pause') || command.includes('stop') || command.includes('wait')) {
        if (isPlayingRef.current) pauseAudio();
      } 
      else if (command.includes('play') || command.includes('start') || command.includes('resume') || command.includes('begin')) {
        if (!isPlayingRef.current) playAudio();
      }
      else if (command.includes('mute') || command.includes('quiet') || command.includes('silence')) {
        if (!isMutedRef.current) toggleMute();
      }
      else if (command.includes('unmute') || command.includes('sound') || command.includes('volume')) {
        if (isMutedRef.current) toggleMute();
      }
      else if (command.includes('nature on') || command.includes('ambient on') || command.includes('background on')) {
        if (!isAmbientOnRef.current) setIsAmbientOn(true);
      }
      else if (command.includes('nature off') || command.includes('ambient off') || command.includes('background off')) {
        if (isAmbientOnRef.current) setIsAmbientOn(false);
      }
    };

    recognition.onerror = (event: any) => {
      // Silently ignore 'no-speech' as it's a normal part of the loop
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
         console.error("Speech recognition permission denied.");
         if (isEffectActive) setIsListening(false);
         return;
      }
      
      console.warn("Speech recognition warning:", event.error);
    };

    recognition.onend = () => {
      // Auto-restart if we are still listening and the component is mounted
      if (isEffectActive && isListening) {
        setTimeout(() => {
           if (isEffectActive && isListening) {
              try {
                recognition.start();
              } catch (e) {
                // Ignore start errors (e.g. already started)
              }
           }
        }, 200);
      }
    };

    recognitionRef.current = recognition;

    if (isListening) {
      try {
        recognition.start();
      } catch(e) {
        console.error("Failed to start recognition", e);
      }
    } else {
      recognition.stop();
    }

    return () => {
      isEffectActive = false;
      recognition.stop();
    };
  }, [isListening, playAudio, pauseAudio, toggleMute]);

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-80 transition-opacity duration-1000"
        style={{ backgroundImage: `url(${session.imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />

      {/* Top Bar */}
      <div className="relative z-10 p-6 flex justify-between items-start">
        <div className="text-white">
           <h2 className="text-3xl font-serif font-bold drop-shadow-md">{session.title}</h2>
           <p className="text-white/80 max-w-md drop-shadow-sm">{session.description}</p>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 mt-auto p-8 pb-12">
         <div className="max-w-2xl mx-auto bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-white/20 rounded-full mb-6 overflow-hidden">
               <div 
                 className="h-full bg-teal-400 transition-all duration-100 ease-linear"
                 style={{ width: `${progress}%` }}
               />
            </div>

            <div className="flex items-center justify-between">
               {/* Voice Control Toggle */}
               <button 
                 onClick={toggleVoiceControl}
                 className={`p-3 rounded-full transition-all ${
                   isListening 
                     ? 'bg-white text-teal-600 shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse' 
                     : 'text-white/70 hover:text-white bg-white/10'
                 }`}
                 title={isListening ? "Listening for commands..." : "Enable voice commands"}
               >
                 {isListening ? <Mic size={20} /> : <MicOff size={20} />}
               </button>

               {/* Main Controls */}
               <div className="flex items-center gap-6">
                  <button 
                    onClick={toggleAmbient}
                    className={`p-3 rounded-full transition-all ${
                      isAmbientOn 
                        ? 'bg-teal-600/80 text-white shadow-lg' 
                        : 'text-white/70 hover:text-white bg-white/10'
                    }`}
                    title="Toggle Nature Sounds"
                  >
                    <Trees size={20} />
                  </button>

                  <button 
                    onClick={togglePlay}
                    className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
                  >
                    {isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" className="ml-1" />}
                  </button>

                  <button onClick={toggleMute} className="p-3 rounded-full text-white/70 hover:text-white bg-white/10 transition-colors">
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
               </div>

               {/* Spacer to balance layout */}
               <div className="w-12"></div>
            </div>
            
            {isListening && (
              <div className="text-center mt-4 text-xs text-white/70 animate-fade-in">
                Try saying "Pause meditation", "Nature on", or "Mute sound"
              </div>
            )}
         </div>
         <div className="text-center mt-4">
             <p className="text-white/60 text-sm font-medium tracking-wide uppercase">AI Generated Session</p>
         </div>
      </div>
    </div>
  );
};
