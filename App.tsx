import React, { useState } from 'react';
import { AppMode, MeditationSession } from './types';
import { ChatBot } from './components/ChatBot';
import { Generator } from './components/Generator';
import { MediaPlayer } from './components/MediaPlayer';
import { Sparkles, MessageCircle } from 'lucide-react';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.CREATE);
  const [activeSession, setActiveSession] = useState<MeditationSession | null>(null);

  const handleSessionCreated = (session: MeditationSession) => {
    setActiveSession(session);
    setCurrentMode(AppMode.PLAYER);
  };

  const closePlayer = () => {
    setCurrentMode(AppMode.CREATE);
    // Keep the session in activeSession if we want to resume? For now, just close.
    // setActiveSession(null); 
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden relative">
      {/* Main Navigation / Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 fixed top-0 w-full z-30">
        <div className="flex items-center gap-2 text-teal-700">
          <Sparkles size={24} />
          <h1 className="text-xl font-serif font-bold tracking-tight">ZenSpace AI</h1>
        </div>
        <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setCurrentMode(AppMode.CREATE)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentMode === AppMode.CREATE ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Generate
          </button>
          <button 
             onClick={() => setCurrentMode(AppMode.CHAT)}
             className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentMode === AppMode.CHAT ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Chat
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 pb-6 px-4 h-screen max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Generator or Active View */}
        <div className="lg:col-span-8 h-full flex flex-col">
            {currentMode === AppMode.CREATE && (
                <Generator onSessionCreated={handleSessionCreated} />
            )}
            {currentMode === AppMode.CHAT && (
                 <div className="h-full flex items-center justify-center text-slate-400 bg-white/50 rounded-2xl border border-slate-200">
                    <div className="text-center p-8">
                        <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Use the chat panel on the right for guidance.</p>
                        <p className="text-sm mt-2">Or switch to "Generate" to create a session.</p>
                    </div>
                 </div>
            )}
        </div>

        {/* Right Panel: Always Chat (On Desktop) or toggle on Mobile */}
        <div className={`lg:col-span-4 h-full ${currentMode === AppMode.CHAT ? 'block' : 'hidden lg:block'}`}>
           <ChatBot />
        </div>

      </main>

      {/* Full Screen Player Overlay */}
      {currentMode === AppMode.PLAYER && activeSession && (
        <div className="fixed inset-0 z-50 animate-in fade-in duration-300">
          <MediaPlayer session={activeSession} onClose={closePlayer} />
        </div>
      )}
    </div>
  );
}