
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
    
    // Removemos o cabeçalho base64 para evitar strings duplicadas e reduzir payload
    const currentData = currentImage.includes(',') ? currentImage.split(',')[1] : currentImage;
    const referenceData = referenceImage.includes(',') ? referenceImage.split(',')[1] : referenceImage;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: currentData,
            },
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: referenceData,
            },
          },
          {
            text: `Verifique se o local nas duas fotos é o mesmo ambiente ou objeto.
            REGRAS: 
            1. NÃO exija alinhamento. 
            2. Se houver qualquer semelhança visual (mesmo objeto central, cor de parede ou padrão), considere CORRETO.
            3. Responda APENAS um JSON: {"isCorrectSpot": boolean, "confidence": number, "feedback": "texto"}.`,
          },
        ],
      }
    });

    let text = response.text || '';
    // Limpeza agressiva de markdown para evitar erro de JSON.parse
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    const result = JSON.parse(text);
    return {
      isCorrectSpot: !!result.isCorrectSpot,
      confidence: result.confidence ?? 0,
      feedback: result.feedback ?? 'Validado'
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    // Em caso de erro de conexão, vamos ser amigáveis e permitir uma segunda tentativa ou logar o erro
    return {
      isCorrectSpot: false,
      confidence: 0,
      feedback: 'Erro ao conectar. Verifique sua internet.'
    };
  }
};
