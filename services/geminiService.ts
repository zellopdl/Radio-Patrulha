
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
            text: `Aja como um especialista em segurança e geolocalização visual. 
            A primeira imagem é a visão atual da câmera. 
            A segunda imagem é a referência salva.
            
            Sua tarefa é verificar se o usuário está de fato no mesmo local ou olhando para o mesmo objeto.
            REGRAS DE VALIDAÇÃO (SEJA EXTREMAMENTE TOLERANTE):
            1. NÃO exija alinhamento perfeito. Se os elementos principais (móveis, quadros, cores, portas, objetos específicos) estiverem presentes em ambas as imagens, considere CORRETO.
            2. Ignore mudanças de iluminação, granulação da imagem ou se a câmera está um pouco mais longe ou perto do que a referência.
            3. O objetivo é confirmar a presença no local, não a perfeição da sobreposição.
            4. Se você identificar que se trata do mesmo ambiente ou objeto, responda isCorrectSpot: true.
            
            Responda estritamente em JSON: 
            { 
              "isCorrectSpot": boolean, 
              "confidence": number (0-100), 
              "feedback": "uma frase curtíssima em português" 
            }`,
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

    const result = JSON.parse(response.text || '{}');
    return result as VisualValidation;
  } catch (error) {
    console.error('Visual Validation Error:', error);
    return {
      isCorrectSpot: false,
      confidence: 0,
      feedback: 'Erro na análise visual.'
    };
  }
};
