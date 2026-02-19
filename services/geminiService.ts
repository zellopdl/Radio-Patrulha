
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
            text: `Verifique se o local nas duas fotos é o mesmo.
            Ignore completamente o alinhamento, a luz e a distância.
            Se houver qualquer pista (mesmo objeto, mesma cor de parede, mesmo chão) que indique que o usuário está no lugar certo, retorne isCorrectSpot: true.
            
            Retorne APENAS um JSON puro, sem markdown, no formato:
            { 
              "isCorrectSpot": boolean, 
              "confidence": number (0-100), 
              "feedback": "string curta" 
            }`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    // Sanitização para garantir que o JSON seja lido corretamente mesmo com markdown backticks
    let text = response.text || '{}';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const result = JSON.parse(text);
    return {
      isCorrectSpot: result.isCorrectSpot ?? false,
      confidence: result.confidence ?? 0,
      feedback: result.feedback ?? 'Análise concluída'
    };
  } catch (error) {
    console.error('Visual Validation Error:', error);
    return {
      isCorrectSpot: false,
      confidence: 0,
      feedback: 'Verifique sua conexão ou tente novamente.'
    };
  }
};
