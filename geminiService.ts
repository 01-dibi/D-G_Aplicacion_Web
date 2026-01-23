
import { GoogleGenAI, Type } from "@google/genai";

// Inicialización con la variable de entorno obligatoria
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Procesa texto (mensajes de WhatsApp/Informales) para extraer datos de logística.
 */
export async function analyzeOrderText(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extrae ÚNICAMENTE el nombre del cliente y la localidad del siguiente mensaje de pedido. 
      INSTRUCCIÓN CRÍTICA: Ignora por completo cualquier lista de productos, artículos, cantidades o precios. 
      Solo nos interesa quién es el cliente y a dónde va el envío.
      
      Mensaje: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { 
              type: Type.STRING, 
              description: "Nombre de la razón social o comercio" 
            },
            locality: { 
              type: Type.STRING, 
              description: "Ciudad, pueblo o localidad del destino" 
            }
          },
          required: ["customerName", "locality"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error en Gemini Text Analysis:", error);
    return null;
  }
}

/**
 * Procesa imágenes (Fotos de remitos) o PDFs utilizando capacidades multimodales.
 */
export async function analyzeOrderMedia(base64Data: string, mimeType: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          {
            text: "Analiza este documento de pedido. Extrae ÚNICAMENTE el nombre del cliente (razón social) y la localidad. Ignora productos, ítems, precios y firmas. Responde solo con el JSON solicitado."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            locality: { type: Type.STRING }
          },
          required: ["customerName", "locality"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error en Gemini Media Analysis:", error);
    return null;
  }
}
