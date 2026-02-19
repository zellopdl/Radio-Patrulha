
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
            text: `Você é um sistema de verificação de ronda. Sua única missão é confirmar se o usuário chegou ao destino.
            
            IMAGEM 1: Visão atual do usuário.
            IMAGEM 2: Foto de referência do local.
            
            DIRETRIZES DE VALIDAÇÃO (MUITO IMPORTANTE):
            1. SEJA EXTREMAMENTE PERMISSIVO. Se você reconhecer o mesmo ambiente, o mesmo móvel, o mesmo objeto central ou a mesma parede, diga que está CORRETO.
            2. NÃO exija alinhamento. O usuário pode estar um pouco mais longe, em um ângulo diferente ou com luz diferente.
            3. Se houver 40% de chance de ser o mesmo lugar, considere CORRETO (isCorrectSpot: true).
            4. Ignore borrões de movimento ou granulação.
            5. O objetivo é ajudar o usuário, não bloqueá-lo por detalhes técnicos.
            
            Responda em JSON: 
            { 
              "isCorrectSpot": boolean, 
              "confidence": number (0-100), 
              "feedback": "Mensagem curta de incentivo" 
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
      feedback: 'Erro de conexão.'
    };
  }
};
