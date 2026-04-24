import { GoogleGenAI } from "@google/genai";
import { UserProfile, HealthLog, DiaCareInsights } from "../types";

const getAiClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('CONFIG_MISSING');
  }
  return new GoogleGenAI({ apiKey: key });
};

export const getDiaCareInsights = async (profile: UserProfile, logs: HealthLog[]): Promise<DiaCareInsights | null> => {
  try {
    const ai = getAiClient();
    const context = `
      Profil: ${JSON.stringify(profile)}
      Données récentes: ${JSON.stringify(logs.slice(0, 20))}
    `;

    const prompt = `
      Tu es Mira, l'experte IA de DiaCare. Analyse les données de ce patient tunisien.
      Toutes tes réponses doivent être en FRANÇAIS.
      
      Réponds UNIQUEMENT avec un objet JSON respectant strictement cette structure:
      {
        "tunisianMeal": { "name": string, "ingredients": string[], "whySuitable": string, "alternative": string },
        "dailyMealPlan": { "breakfast": string, "lunch": string, "dinner": string, "explanation": string, "score": number },
        "predictions": {
          "shortTerm": { "range": string, "risk": string, "cause": string, "advice": string },
          "threeDay": { "trend": string, "risk": string },
          "fiveDay": { "stability": string, "factor": string },
          "sevenDay": { "trend": string, "warning": string }
        },
        "healthScore": { "score": number, "status": string, "explanation": string, "action": string },
        "smartInsights": { "keyInsight": string, "problem": string, "recommendation": string },
        "dashboard": { "status": string, "trend": string, "risk": string, "recommendation": string, "outlook": string }
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: 'user', parts: [{ text: context + "\n\n" + prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "";
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Échec du parsing JSON de l'IA:", text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Format JSON invalide de l'IA");
    }
  } catch (error) {
    console.error("Erreur Diagnostic Expert Detail:", error);
    throw error;
  }
};

export const chatWithMira = async (profile: UserProfile | null, logs: HealthLog[], message: string, history: any[] = []) => {
  try {
    const ai = getAiClient();
    const context = `
      Tu es Mira, l'experte IA de DiaCare. Tu aides les patients diabétiques tunisiens.
      Profil: ${JSON.stringify(profile)}
      Derniers relevés: ${JSON.stringify(logs.slice(0, 10))}
      Réponds toujours de manière empathique, courte et en français (avec quelques mots tunisiens si approprié).
    `;

    const contents = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.parts[0].text }]
    }));

    if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
      contents.push({ role: 'user', parts: [{ text: context + "\n\n" + message }] });
    }

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: contents
    });

    return response.text || "Désolée, je rencontre un problème technique.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Désolée, je rencontre un problème de connexion avec mon cerveau IA. Réessaie plus tard.";
  }
};

export const analyzeMeal = async (mealDescription: string) => {
  try {
    const ai = getAiClient();
    const prompt = `
      Analyse ce repas tunisien: "${mealDescription}".
      Retourne un JSON avec:
      {
        "name": string,
        "carbs": number (estimation en grammes),
        "impact": "Faible" | "Modéré" | "Élevé",
        "tips": string[] (3 conseils courts),
        "warning": string (un avertissement si nécessaire)
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "";
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
    }
  } catch (error) {
    console.error("Meal Analysis Error:", error);
    return null;
  }
};

