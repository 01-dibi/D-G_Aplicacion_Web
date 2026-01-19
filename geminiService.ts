
import { GoogleGenAI, Type } from "@google/genai";

// Acceso seguro a la variable de entorno definida en vite.config.ts
const apiKey = process.env.API_KEY || '';

export async function analyzeOrderText(text: string) {
  if (!apiKey) {
    console.error("Error: API_KEY no configurada en Vercel.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza este pedido y extrae cliente y artículos en JSON: "${text}"`,
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
    console.error("Error en el servicio Gemini:", error);
    return null;
  }
}
