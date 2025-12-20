
import { GoogleGenAI } from "@google/genai";
import { ExtractionResponse } from "../types";

// Fix: Use gemini-3-pro-preview for complex reasoning tasks like medical lab data extraction
const MODEL_NAME = 'gemini-3-pro-preview';

export const extractLabData = async (file: File): Promise<ExtractionResponse> => {
  // Criamos a instância aqui para garantir que ela use a API_KEY atualizada do ambiente/diálogo
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

  const mimeType = file.type;

  const prompt = `
    Analise este documento de exame laboratorial.
    Extraia APENAS os nomes dos exames (parâmetros) e seus respectivos resultados numéricos.
    Regras estritas:
    1. NÃO inclua valores de referência.
    2. NÃO inclua unidades de medida (ex: mg/dL), apenas o número.
    3. NÃO forneça diagnósticos, interpretações ou comentários médicos.
    4. Formate a saída como uma lista simples: "Nome do Exame: Valor".
    5. Se houver vários exames, coloque um em cada linha.
  `;

  try {
    // Corrected contents parameter to use single Content object for multi-part input as per guidelines
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ]
      },
      config: {
        temperature: 0.1,
        topP: 0.95,
        systemInstruction: "Você é um assistente especializado em extração de dados brutos de exames. Você nunca fornece diagnósticos. Você apenas lista o nome do exame e o valor numérico encontrado."
      }
    });

    // Use .text property directly as per guidelines (do not use text())
    const text = response.text || "";
    
    const lines = text.split('\n').filter(line => line.trim() !== "");
    const results = lines.map(line => {
      const parts = line.split(':');
      return {
        parameter: parts[0]?.trim() || "Desconhecido",
        value: parts[1]?.trim() || "N/A"
      };
    });

    return {
      results,
      rawText: text
    };
  } catch (error: any) {
    console.error("Erro na extração Gemini:", error);
    // Handle specific error to trigger re-authentication via dialog
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("AUTH_REQUIRED");
    }
    throw new Error("Falha ao processar o documento. Verifique sua conexão ou permissões da chave.");
  }
};
