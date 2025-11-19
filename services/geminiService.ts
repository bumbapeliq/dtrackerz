import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "../types";

// Initialize the client with the API Key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseReceiptImage = async (base64Image: string): Promise<ReceiptData> => {
  try {
    // Remove header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const prompt = `
      Analyze this receipt image. Extract the bill details.
      I need the list of items purchased, their individual prices, quantities, subtotal, tax, service charge, and the final total.
      If tax or service charge is not explicitly stated but there is a difference between sum of items and total, categorize it as tax.
      Return the data in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using flash for fast multimodal processing
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming JPEG, API is flexible
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER }
                }
              }
            },
            subtotal: { type: Type.NUMBER },
            tax: { type: Type.NUMBER },
            serviceCharge: { type: Type.NUMBER },
            total: { type: Type.NUMBER }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as ReceiptData;
  } catch (error) {
    console.error("Error parsing receipt with Gemini:", error);
    throw error;
  }
};
