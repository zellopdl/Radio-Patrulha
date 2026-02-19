
import { GoogleGenAI, Type } from "@google/genai";

export interface ValidationResult {
  isMatch: boolean;
  reasoning: string;
}

export const validateObject = async (
  imageBase64: string,
  targetObject: string
): Promise<ValidationResult> => {
  try {
    // Inicializamos o cliente apenas no momento da chamada para evitar erros de top-level
    // e garantir que o process.env.API_KEY injetado pelo ambiente esteja disponível.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64.split(',')[1] || imageBase64,
            },
          },
          {
            text: `Analyze this photo. Does it clearly contain a ${targetObject}? Respond only in JSON format with two fields: 'isMatch' (boolean) and 'reasoning' (a short explanation in Portuguese).`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isMatch: { type: Type.BOOLEAN },
            reasoning: { type: Type.STRING },
          },
          required: ['isMatch', 'reasoning'],
        },
      },
    });

    if (!response.text) {
      throw new Error("Resposta vazia da IA");
    }

    return JSON.parse(response.text) as ValidationResult;
  } catch (error) {
    console.error('Gemini Validation Error:', error);
    return {
      isMatch: false,
      reasoning: 'Erro ao conectar com o servidor de IA. Verifique se a API_KEY foi configurada corretamente no Vercel.',
    };
  }
};
