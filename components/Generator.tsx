import React, { useState } from 'react';
import { generateMeditationPlan, generateMeditationImage, generateMeditationAudio } from '../services/geminiService';
import { MeditationSession, GeneratorState } from '../types';
import { Wand2, Music, Image as ImageIcon, Loader2, PlayCircle } from 'lucide-react';

interface GeneratorProps {
  onSessionCreated: (session: MeditationSession) => void;
}

export const Generator: React.FC<GeneratorProps> = ({ onSessionCreated }) => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<GeneratorState>({
    isGeneratingScript: false,
    isGeneratingImage: false,
    isGeneratingAudio: false,
    error: null
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setStatus({ isGeneratingScript: true, isGeneratingImage: false, isGeneratingAudio: false, error: null });

    try {
      // 1. Generate Plan (Script + Prompts)
      const plan = await generateMeditationPlan(prompt);
      
      setStatus(prev => ({ ...prev, isGeneratingScript: false, isGeneratingImage: true, isGeneratingAudio: true }));

      // 2. Run Image and Audio generation in parallel for speed
      const [imageUrl, audioBuffer] = await Promise.all([
        generateMeditationImage(plan.imagePrompt).catch(e => {
            console.error("Image gen failed", e);
            return "https://picsum.photos/1920/1080"; // Fallback
        }),
        generateMeditationAudio(plan.script).catch(e => {
            console.error("Audio gen failed", e);
            throw e; // Audio is critical
        })
      ]);

      const newSession: MeditationSession = {
        id: Date.now().toString(),
        title: plan.title,
        description: plan.description,
        imagePrompt: plan.imagePrompt,
        script: plan.script,
        imageUrl,
        audioBuffer
      };

      setStatus(prev => ({ ...prev, isGeneratingImage: false, isGeneratingAudio: false }));
      onSessionCreated(newSession);

    } catch (error) {
      console.error(error);
      setStatus(prev => ({ 
        isGeneratingScript: false, 
        isGeneratingImage: false, 
        isGeneratingAudio: false, 
        error: "Something went wrong creating your session. Please try again." 
      }));
    }
  };

  return (
    <div className="bg-white/50 rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col justify-center h-full">
      <div className="max-w-lg mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wand2 size={24} />
          </div>
          <h2 className="text-2xl font-serif font-semibold text-slate-800">Create a Journey</h2>
          <p className="text-slate-500">Describe your ideal meditation environment. We'll generate the visuals, script, and voiceover for you.</p>
        </div>

        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A peaceful Japanese garden in autumn with falling leaves, focusing on gratitude..."
            className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-slate-700 h-32 resize-none shadow-sm"
          />
          
          <button
            onClick={handleGenerate}
            disabled={status.isGeneratingScript || status.isGeneratingImage || status.isGeneratingAudio || !prompt}
            className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(status.isGeneratingScript || status.isGeneratingImage || status.isGeneratingAudio) ? (
               <Loader2 className="animate-spin" />
            ) : (
               <PlayCircle size={20} />
            )}
            {status.isGeneratingScript ? 'Writing Script...' : 
             status.isGeneratingImage || status.isGeneratingAudio ? 'Synthesizing Media...' : 
             'Generate Meditation'}
          </button>
        </div>

        {/* Progress Indicators */}
        {(status.isGeneratingScript || status.isGeneratingImage || status.isGeneratingAudio) && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <StatusItem active={status.isGeneratingScript} completed={!status.isGeneratingScript && (status.isGeneratingImage || status.isGeneratingAudio)} label="Drafting guidance script" icon={<Wand2 size={16} />} />
            <StatusItem active={status.isGeneratingImage} completed={false} label="Rendering visual environment (Imagen 4)" icon={<ImageIcon size={16} />} />
            <StatusItem active={status.isGeneratingAudio} completed={false} label="Generating voiceover (Gemini TTS)" icon={<Music size={16} />} />
          </div>
        )}

        {status.error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
            {status.error}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusItem = ({ active, completed, label, icon }: { active: boolean, completed: boolean, label: string, icon: React.ReactNode }) => (
  <div className={`flex items-center gap-3 text-sm ${active ? 'text-teal-600' : completed ? 'text-emerald-600' : 'text-slate-400'}`}>
    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${active ? 'border-teal-600 animate-pulse' : completed ? 'bg-emerald-100 border-emerald-200' : 'border-slate-200'}`}>
        {completed ? '✓' : icon}
    </div>
    <span>{label}</span>
  </div>
);