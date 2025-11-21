import { GoogleGenAI } from "@google/genai";

// Initialize the client with the system environment key
const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize Gemini client:", e);
  }
} else {
  console.warn("Gemini API Key is missing. AI features will be disabled.");
}

export const generateDevotionalInsight = async (
  verseOrTopic: string,
  userNotes: string
): Promise<string> => {
  if (!ai) {
    return "IA indisponível: Chave de API não configurada. Verifique o arquivo .env.local.";
  }

  try {
    const model = 'gemini-2.5-flash';

    const prompt = `
      Você é um assistente espiritual sábio, jovem e encorajador.
      O usuário está escrevendo um devocional sobre: "${verseOrTopic}".
      As anotações atuais do usuário são: "${userNotes}".
      
      Por favor, forneça um insight curto, profundo e motivacional (máximo de 2 parágrafos) 
      que complemente o pensamento do usuário. Use uma linguagem moderna e acolhedora.
      Se o usuário apenas forneceu um versículo, explique o contexto brevemente e traga uma aplicação prática.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast response
      }
    });

    return response.text || "Não foi possível gerar um insight no momento.";
  } catch (error) {
    console.error("Error generating insight:", error);
    return "Desculpe, tive um problema ao conectar com a sabedoria digital. Tente novamente mais tarde.";
  }
};

export const suggestTags = async (content: string): Promise<string[]> => {
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following devotional text and extract 3 to 5 relevant one-word tags (in Portuguese) for categorization (e.g. Gratidão, Fé, Oração). Return ONLY a JSON array of strings. Text: ${content}`,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (e) {
    console.error(e);
    return [];
  }
}