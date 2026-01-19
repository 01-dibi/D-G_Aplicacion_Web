
import { GoogleGenAI, Type } from "@google/genai";

// El API_KEY se inyecta automáticamente desde el entorno de Vercel/Node
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeOrderText(text: string) {
  if (!process.env.API_KEY) {
    console.error("API_KEY no configurada en las variables de entorno.");
    return null;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analiza el siguiente texto de un pedido y extrae el nombre del cliente y la lista de artículos con sus cantidades. Texto: "${text}"`,
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

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Error al procesar la respuesta de Gemini", e);
    return null;
  }
}
