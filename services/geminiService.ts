
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
    
    // Limpeza de base64 para garantir envio puro
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
            text: `Comparação visual ultra-tolerante para ronda.
            A imagem 1 é a câmera atual. A imagem 2 é a referência.
            Objetivo: Confirmar se o usuário está no mesmo lugar.
            Considere: mesmas cores de parede, objetos próximos, mesmo tipo de móvel ou textura de chão.
            Ignore: iluminação, ângulo, desordem ou pessoas.
            Responda EXCLUSIVAMENTE em JSON: {"isCorrectSpot": boolean, "confidence": number, "feedback": "string curta"}`,
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
      feedback: result.feedback ?? 'Validado'
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    // Se falhar a conexão, não queremos travar o app no modo auto-scan
    return {
      isCorrectSpot: false,
      confidence: 0,
      feedback: 'Erro de comunicação temporário.'
    };
  }
};
