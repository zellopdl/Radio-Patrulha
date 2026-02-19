
import { GoogleGenAI, Type } from "@google/genai";

export interface VisualValidation {
  isCorrectSpot: boolean;
  confidence: number;
  feedback: string;
}

export const validateVisualAnchor = async (
  currentImage: string,
  referenceImage: string
): Promise<VisualValidation> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: currentImage.split(',')[1] || currentImage,
            },
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: referenceImage.split(',')[1] || referenceImage,
            },
          },
          {
            text: `Compare estas duas imagens. A primeira é a visão atual do patrulheiro, a segunda é a foto de referência do local exato. 
            Verifique se o usuário está na mesma posição e perspectiva (tolerância de alguns centímetros).
            Responda em JSON: { "isCorrectSpot": boolean, "confidence": number (0-100), "feedback": "texto curto em português" }`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrectSpot: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
          },
          required: ['isCorrectSpot', 'confidence', 'feedback'],
        },
      },
    });

    return JSON.parse(response.text || '{}') as VisualValidation;
  } catch (error) {
    console.error('Visual Validation Error:', error);
    return {
      isCorrectSpot: false,
      confidence: 0,
      feedback: 'Erro na análise visual. Tente alinhar melhor.'
    };
  }
};
