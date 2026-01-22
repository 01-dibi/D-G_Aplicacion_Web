import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  let key = '';
  try {
    // @ts-ignore
    key = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';
    if (!key) {
      // @ts-ignore
      key = (import.meta && import.meta.env && import.meta.env.VITE_API_KEY) || '';
    }
    if (!key && typeof window !== 'undefined') {
      // @ts-ignore
      key = window.API_KEY || '';
    }
  } catch (e) {
    console.error("Error obteniendo API_KEY:", e);
  }
  return key;
};

// Función para analizar texto (WhatsApp)
export async function analyzeOrderText(text: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Falta API_KEY para Gemini");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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

// Función para analizar fotos o PDFs
export async function analyzeOrderMedia(base64Data: string, mimeType: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Falta API_KEY para Gemini Media");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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
            text: "Analiza esta imagen o documento de un pedido. Extrae el nombre del cliente (razón social) y la localidad. Ignora los productos e información irrelevante."
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
    console.error("Error Gemini Media:", error);
    return null;
  }
}