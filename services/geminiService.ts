
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
            text: `AJA COMO UM SISTEMA DE VISÃO COMPUTACIONAL INTELIGENTE.
            Você deve comparar a IMAGEM 1 (câmera atual) com a IMAGEM 2 (referência salva).
            
            DIRETRIZES DE RECONHECIMENTO:
            1. IDENTIDADE DO OBJETO: Se o objeto principal for o mesmo (ex: uma cafeteira, um monitor, uma planta específica), considere um acerto.
            2. TOLERÂNCIA: Ignore variações de iluminação, ângulo, sombras, desordem na mesa ou se o objeto foi levemente movido.
            3. DIFERENCIAÇÃO: Não confunda objetos de classes diferentes (ex: não confunda uma xícara com um computador).
            4. AMBIENTE: Se o objeto não for claro, mas o fundo (parede, móveis ao redor) for claramente o mesmo lugar, considere um acerto.
            
            Se houver pelo menos 40% de semelhança contextual, marque "isCorrectSpot" como true.
            
            Responda APENAS com este JSON: 
            {"isCorrectSpot": boolean, "confidence": number, "feedback": "string curta e motivadora"}`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '{"isCorrectSpot": false, "confidence": 0, "feedback": "Tentando alinhar..."}';
    const cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return {
      isCorrectSpot: false,
      confidence: 0,
      feedback: "Problema de conexão com a visão IA."
    };
  }
};
