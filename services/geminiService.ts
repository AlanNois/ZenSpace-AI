import { GoogleGenAI, Modality, Type } from "@google/genai";
import { decode, decodeAudioData, createAudioContext } from "../utils/audioUtils";

// Helper to get API Key safely
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API Key is missing. Please set process.env.API_KEY");
    throw new Error("API Key missing");
  }
  return key;
};

// 1. Chat Service
export const sendChatMessage = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history,
    config: {
      systemInstruction: "You are a wise, calming, and empathetic meditation coach. Keep answers concise, supportive, and focused on mindfulness.",
    }
  });

  const result = await chat.sendMessage({ message: newMessage });
  return result.text;
};

// 2. Content Generation Service (Script + Image Prompt)
export const generateMeditationPlan = async (userPrompt: string): Promise<{ title: string; description: string; script: string; imagePrompt: string }> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const prompt = `
    Create a guided meditation session plan based on this user request: "${userPrompt}".
    
    Return ONLY a valid JSON object with this structure:
    {
      "title": "A short title",
      "description": "A brief 1 sentence summary",
      "script": "The full meditation script to be read aloud (approx 100-150 words). Keep it soothing.",
      "imagePrompt": "A detailed prompt for an AI image generator to create a calming background scene matching the script."
    }
  `;

  const result = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          script: { type: Type.STRING },
          imagePrompt: { type: Type.STRING },
        },
        required: ['title', 'description', 'script', 'imagePrompt']
      }
    }
  });

  const text = result.text;
  if (!text) throw new Error("No plan generated");
  
  return JSON.parse(text);
};

// 3. Image Generation Service
export const generateMeditationImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  // Optimize prompt for Imagen
  const enhancedPrompt = `High quality, photorealistic, calm, cinematic lighting, 8k resolution, soft colors: ${prompt}`;

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: enhancedPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '16:9', 
    },
  });

  const base64ImageBytes = response.generatedImages[0]?.image?.imageBytes;
  if (!base64ImageBytes) throw new Error("Failed to generate image");
  
  return `data:image/jpeg;base64,${base64ImageBytes}`;
};

// 4. Audio (TTS) Generation Service
export const generateMeditationAudio = async (script: string): Promise<AudioBuffer> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: script }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore, Puck, Charon, Fenrir, Zephyr
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!base64Audio) {
    throw new Error("No audio data received");
  }

  // Decode the raw PCM audio
  const audioContext = createAudioContext();
  const audioBuffer = await decodeAudioData(
    decode(base64Audio),
    audioContext,
    24000,
    1
  );
  
  // We don't close the context here because we might reuse the global one, 
  // but for simplicity in this app structure, we let the component manage playback context.
  // Ideally, we return the buffer and let the component attach it to its own context.
  
  return audioBuffer;
};