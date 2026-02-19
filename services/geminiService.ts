
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
            A primeira imagem é o que o usuário está vendo AGORA. 
            A segunda imagem é a REFERÊNCIA do ponto de ronda.
            
            Sua tarefa é verificar se o usuário encontrou o local correto.
            REGRAS DE VALIDAÇÃO:
            1. Seja tolerante: Se os objetos principais, cores e estrutura do ambiente forem os mesmos, considere CORRETO (isCorrectSpot: true).
            2. Ignore variações leves de luz, sombras ou se o ângulo está ligeiramente diferente (até 30 graus de diferença).
            3. Se você reconhecer que é o mesmo lugar, dê uma confiança alta.
            
            Responda estritamente em JSON: 
            { 
              "isCorrectSpot": boolean, 
              "confidence": number (0-100), 
              "feedback": "uma frase curta e motivadora em português" 
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
      feedback: 'Erro na análise visual. Tente alinhar melhor.'
    };
  }
};
