
import { GoogleGenAI } from "@google/genai";

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
    
    // Purifica o base64 removendo o prefixo data:image/jpeg;base64,
    const cleanBase64 = (base64: string) => {
      const parts = base64.split(',');
      return parts.length > 1 ? parts[1] : parts[0];
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(currentImage),
            },
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(referenceImage),
            },
          },
          {
            text: `AJA COMO UM SISTEMA DE SEGURANÇA.
            Sua tarefa é validar se o local nas duas fotos é o mesmo.
            Seja EXTREMAMENTE PERMISSIVO. Se houver qualquer semelhança de contexto (mesmo objeto, móvel, parede ou chão), considere correto.
            Retorne APENAS um JSON: {"isCorrectSpot": boolean, "confidence": number, "feedback": "string curta"}`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '{"isCorrectSpot": false, "confidence": 0, "feedback": "Erro na resposta"}';
    const cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    // Retorna um erro silencioso para o modo automático não travar
    return {
      isCorrectSpot: false,
      confidence: 0,
      feedback: `Erro: ${error?.message || 'Conexão'}`
    };
  }
};
