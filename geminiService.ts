import { GoogleGenAI, Type } from "@google/genai";

// Fix: Moved GoogleGenAI initialization inside analyzeOrderText function and used process.env.API_KEY directly to align with SDK guidelines
export async function analyzeOrderText(text: string) {
  if (!process.env.API_KEY) {
    console.error("Falta API_KEY");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza el siguiente texto de un pedido. EXTRAE ÚNICAMENTE el nombre del cliente y la localidad. 
      IMPORTANTE: Ignora por completo cualquier lista de productos, artículos o mercadería. No incluyas detalles de qué contiene el pedido.
      
      Texto a analizar: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            locality: { type: Type.STRING, description: "Ciudad o localidad del cliente" }
          },
          required: ["customerName", "locality"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error Gemini:", error);
    return null;
  }
}