
import { GoogleGenAI, Type } from "@google/genai";

// Acceso a la API_KEY inyectada por el entorno
const apiKey = process.env.API_KEY || '';

export async function analyzeOrderText(text: string) {
  if (!apiKey) {
    console.error("Falta API_KEY");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza este pedido de un bazar y extrae únicamente el nombre del cliente y los artículos con sus cantidades en formato JSON. Texto: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER }
                },
                required: ["name", "quantity"]
              }
            }
          },
          required: ["customerName", "items"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error Gemini:", error);
    return null;
  }
}
