
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
            text: `VOCÊ É UM ASSISTENTE DE RONDA. 
            A primeira imagem é a visão atual do segurança. A segunda é o local que ele deve visitar.
            
            MISSÃO: Confirmar se ele chegou ao destino.
            REGRA DE OURO: Seja EXTREMAMENTE TOLERANTE. 
            Ignore: ângulo, iluminação, objetos novos no cenário, desordem ou qualidade da foto.
            Confirme (isCorrectSpot: true) se as cores das paredes, o tipo de móvel ou o ambiente geral PARECEREM os mesmos.
            
            Responda APENAS com este JSON: 
            {"isCorrectSpot": boolean, "confidence": number, "feedback": "uma frase curta de incentivo"}`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '{"isCorrectSpot": false, "confidence": 0, "feedback": "Tentando novamente..."}';
    const cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return {
      isCorrectSpot: false,
      confidence: 0,
      feedback: "Aguardando sinal estável..."
    };
  }
};
