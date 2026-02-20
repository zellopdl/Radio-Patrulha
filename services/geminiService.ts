
import { GoogleGenAI } from "@google/genai";

export interface VisualValidation {
  isCorrectSpot: boolean;
  confidence: number;
  feedback: string;
  matchType: 'EXACT' | 'SIMILAR' | 'NONE';
}

export const validateVisualAnchor = async (
  currentImage: string,
  referenceImage: string
): Promise<VisualValidation> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
            text: `AJA COMO UM DETECTOR DE OBJETOS SEMÂNTICO.
            Sua missão é validar se o usuário encontrou o objeto/lugar da foto de referência.
            
            REGRAS DE OURO:
            1. IDENTIDADE DE CATEGORIA: Se a referência é uma xícara e o atual é uma xícara (mesmo que de outra cor), considere SIMILAR.
            2. CONTEXTO AMBIENTAL: Se o objeto for difícil de ver mas o fundo (móveis, paredes) for claramente o mesmo local, considere EXACT.
            3. DIFERENCIAÇÃO: Nunca valide se os objetos forem de classes diferentes (ex: monitor vs xícara).
            4. TOLERÂNCIA TOTAL: Ignore luz, sombras, ângulo torto ou se o objeto mudou de lugar na mesa.
            
            Se houver qualquer semelhança de identidade, marque "isCorrectSpot" como true.
            
            Retorne APENAS JSON: 
            {"isCorrectSpot": boolean, "confidence": number, "matchType": "EXACT" | "SIMILAR" | "NONE", "feedback": "string curta"}`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '{"isCorrectSpot": false, "confidence": 0, "matchType": "NONE", "feedback": "..."}';
    const cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return {
      isCorrectSpot: false,
      confidence: 0,
      matchType: 'NONE',
      feedback: "Erro de visão"
    };
  }
};
