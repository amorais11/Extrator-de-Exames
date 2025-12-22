
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResponse, ExamResult } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

export const extractLabData = async (file: File): Promise<ExtractionResponse> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
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
    Extraia os nomes dos exames (parâmetros), seus respectivos resultados numéricos e as unidades de medida.
    
    Regras estritas:
    1. NÃO inclua valores de referência.
    2. O campo 'value' deve conter apenas o número (use '.' como separador decimal).
    3. O campo 'unit' deve conter a unidade de medida (ex: mg/dL, g/L, mm3, etc).
    4. NÃO forneça diagnósticos ou interpretações médicas.
  `;

  try {
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
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            exams: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  parameter: { type: Type.STRING, description: "Nome do exame/parâmetro" },
                  value: { type: Type.STRING, description: "Valor numérico do resultado" },
                  unit: { type: Type.STRING, description: "Unidade de medida (ex: mg/dL)" }
                },
                required: ["parameter", "value", "unit"]
              }
            }
          },
          required: ["exams"]
        },
        systemInstruction: "Você é um extrator de dados laboratoriais preciso. Sua única tarefa é converter imagens/PDFs de exames em uma lista JSON estruturada de resultados, incluindo o nome do parâmetro, o valor numérico e a unidade."
      }
    });

    const jsonResponse = JSON.parse(response.text || '{"exams": []}');
    const results: ExamResult[] = jsonResponse.exams;

    // Formata o texto bruto para exibição amigável
    const rawText = results.map(r => `${r.parameter}: ${r.value} ${r.unit}`).join('\n');

    return {
      results,
      rawText
    };
  } catch (error: any) {
    console.error("Erro na extração Gemini:", error);
    throw error;
  }
};
