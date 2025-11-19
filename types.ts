export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface MeditationSession {
  id: string;
  title: string;
  description: string;
  imagePrompt: string;
  script: string;
  imageUrl?: string;
  audioBuffer?: AudioBuffer;
}

export enum AppMode {
  HOME = 'HOME',
  CREATE = 'CREATE',
  CHAT = 'CHAT',
  PLAYER = 'PLAYER'
}

export interface GeneratorState {
  isGeneratingScript: boolean;
  isGeneratingImage: boolean;
  isGeneratingAudio: boolean;
  error: string | null;
}