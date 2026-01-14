
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
    Analise este documento de exame laboratorial e extraia os dados técnicos.
    
    Campos necessários para cada exame:
    1. 'parameter': Nome do exame (ex: Glicose, Anti-HIV).
    2. 'value': Resultado. Capture números (ex: 95) ou termos qualitativos (ex: REAGENTE, NÃO REAGENTE). Se houver ambos, combine-os (ex: "1.2 - REAGENTE").
    3. 'unit': Unidade de medida (ex: mg/dL, UI/mL). Deixe vazio se não houver.

    Regras Críticas:
    - NÃO inclua valores de referência.
    - NÃO inclua interpretações médicas.
    - Foque apenas nos resultados encontrados.
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
                  parameter: { type: Type.STRING },
                  value: { type: Type.STRING },
                  unit: { type: Type.STRING }
                },
                required: ["parameter", "value", "unit"]
              }
            }
          },
          required: ["exams"]
        },
        systemInstruction: "Você é um sistema de OCR médico que extrai dados brutos. Retorne apenas JSON puro seguindo o schema. Seja conciso para evitar truncamento de texto."
      }
    });

    let results: ExamResult[] = [];
    const rawResponseText = response.text || "";

    try {
      // Tenta limpar possíveis caracteres de controle ou blocos de código markdown que a IA possa ter inserido
      const sanitizedJson = rawResponseText.trim().replace(/^```json\s*|```$/g, "");
      const jsonResponse = JSON.parse(sanitizedJson);
      results = jsonResponse.exams || [];
    } catch (parseError) {
      console.warn("Falha no parse JSON, tentando recuperação manual:", parseError);
      
      // Fallback: Tenta extrair informações básicas usando Regex se o JSON estiver quebrado/truncado
      const regex = /"parameter":\s*"([^"]+)",\s*"value":\s*"([^"]+)",\s*"unit":\s*"([^"]*)"/g;
      let match;
      while ((match = regex.exec(rawResponseText)) !== null) {
        results.push({
          parameter: match[1],
          value: match[2],
          unit: match[3]
        });
      }
      
      if (results.length === 0) {
        throw new Error("Não foi possível processar a estrutura dos dados do exame. Por favor, tente uma imagem mais nítida.");
      }
    }

    // Formata o texto bruto para exibição amigável e copia/cola
    const rawText = results.map(r => {
      const unitPart = r.unit ? ` ${r.unit}` : "";
      return `${r.parameter}: ${r.value}${unitPart}`;
    }).join('\n');

    return {
      results,
      rawText
    };
  } catch (error: any) {
    console.error("Erro na extração Gemini:", error);
    throw error;
  }
};
