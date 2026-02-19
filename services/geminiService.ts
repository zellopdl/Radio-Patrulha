
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
            text: `Sua tarefa é validar se o usuário chegou ao ponto de ronda correto.
            
            DIRETRIZES DE VALIDAÇÃO (SEJA EXTREMAMENTE TOLERANTE):
            1. NÃO exija alinhamento ou ângulo idêntico.
            2. Se você identificar o mesmo móvel, o mesmo objeto, a mesma cor de parede ou o mesmo tipo de chão, valide como CORRETO.
            3. O objetivo é apenas confirmar que o usuário está no ambiente certo.
            4. Se houver o mínimo de semelhança contextual, retorne isCorrectSpot: true.
            
            Responda APENAS em JSON: 
            { 
              "isCorrectSpot": boolean, 
              "confidence": number (0-100), 
              "feedback": "mensagem motivacional curta" 
            }`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      }
    });

    let text = response.text || '';
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    const result = JSON.parse(text);
    return {
      isCorrectSpot: !!result.isCorrectSpot,
      confidence: result.confidence ?? 0,
      feedback: result.feedback ?? 'Local confirmado!'
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      isCorrectSpot: false,
      confidence: 0,
      feedback: 'Erro de conexão. Tente novamente.'
    };
  }
};
