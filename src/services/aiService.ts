import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, HealthLog, DiaCareInsights } from "../types";

let aiInstance: GoogleGenAI | null = null;

export function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn("⚠️ Clé API Gemini non détectée.");
      return null;
    }
    
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const DIA_CARE_SYSTEM_PROMPT = `
You are an advanced AI system called "Diagnostic Expert" specialized in diabetes management for the Tunisian population.
You act as a diabetes nutrition assistant, meal generator, and glucose prediction engine.

Output MUST be a valid JSON object matching the following interface:

{
  "tunisianMeal": {
    "name": "string",
    "ingredients": ["string"],
    "whySuitable": "string",
    "alternative": "string"
  },
  "dailyMealPlan": {
    "breakfast": "string",
    "lunch": "string",
    "dinner": "string",
    "explanation": "string",
    "score": number
  },
  "predictions": {
    "shortTerm": { "range": "string", "risk": "string", "cause": "string", "advice": "string" },
    "threeDay": { "trend": "string", "risk": "string" },
    "fiveDay": { "stability": "string", "factor": "string" },
    "sevenDay": { "trend": "string", "warning": "string" }
  },
  "healthScore": {
    "score": number,
    "status": "string",
    "explanation": "string",
    "action": "string"
  },
  "smartInsights": {
    "keyInsight": "string",
    "problem": "string",
    "recommendation": "string"
  },
  "dashboard": {
    "status": "string",
    "trend": "string",
    "risk": "string",
    "recommendation": "string",
    "outlook": "string"
  }
}

Use local Tunisian context for meals (Couscous, Ojja, Salad Mechouia, etc.) but adapted for diabetes.
Respond in French.
`;

function validateAndRepairInsights(data: any): DiaCareInsights {
  const fallback = {
    tunisianMeal: { name: "Salade Mechouia thon", ingredients: ["Poivrons", "Tomates", "Thon", "Huile d'olive"], whySuitable: "Riche en fibres et oméga-3, impact glycémique faible.", alternative: "Ojja aux crevettes sans pain" },
    dailyMealPlan: { breakfast: "Petit pain complet, fromage frais", lunch: "Couscous orge et légumes", dinner: "Dorade grillée, riz brun", explanation: "Apport équilibré en glucides complexes.", score: 85 },
    predictions: { shortTerm: { range: "90-140 mg/dL", risk: "Faible", cause: "Stabilité observée", advice: "Continuer ainsi" }, threeDay: { trend: "Stable", risk: "Minime" }, fiveDay: { stability: "Bonne", factor: "Activité régulière" }, sevenDay: { trend: "Amélioration attendue", warning: "" } },
    healthScore: { score: 75, status: "Correct", explanation: "Bonne gestion globale malgré quelques pics.", action: "Maintenir l'activité physique" },
    smartInsights: { keyInsight: "Bonne réactivité post-prandiale.", problem: "Légère tendance à l'hypo matinale.", recommendation: "Répartir mieux les glucides le soir" },
    dashboard: { status: "En contrôle", trend: "Stable", risk: "Bas", recommendation: "Suivi régulier", outlook: "Positif" }
  };

  return {
    tunisianMeal: { ...fallback.tunisianMeal, ...(data.tunisianMeal || {}) },
    dailyMealPlan: { ...fallback.dailyMealPlan, ...(data.dailyMealPlan || {}) },
    predictions: { ...fallback.predictions, ...(data.predictions || {}) },
    healthScore: { ...fallback.healthScore, ...(data.healthScore || {}) },
    smartInsights: { ...fallback.smartInsights, ...(data.smartInsights || {}) },
    dashboard: { ...fallback.dashboard, ...(data.dashboard || {}) }
  };
}

export async function analyzeMealImage(base64Image: string): Promise<{ name: string; estimateGlucides: string; advice: string } | null> {
  try {
    const ai = getAI();
    if (!ai) return null;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Identify this Tunisian meal, estimate carbs in grams, and give short advice. Return JSON with keys: name, estimateGlucides, advice." },
          { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] || base64Image } }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text?.replace(/```json|```/g, "").trim();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Meal Analysis Error:", error);
    return null;
  }
}

export async function getDiaCareInsights(profile: UserProfile, logs: HealthLog[]): Promise<DiaCareInsights | null> {
  try {
    const ai = getAI();
    if (!ai) return null;

    const userInput = {
      profile,
      glucose: logs.filter(l => l.type === 'glucose').slice(0, 15),
      meals: logs.filter(l => l.type === 'food').slice(0, 5)
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze health metrics and return DiaCareInsights JSON: ${JSON.stringify(userInput)}`,
      config: {
        systemInstruction: DIA_CARE_SYSTEM_PROMPT,
        responseMimeType: "application/json"
      }
    });

    const text = response.text?.replace(/```json|```/g, "").trim();
    if (!text) return null;
    const parsed = JSON.parse(text);
    return validateAndRepairInsights(parsed);
  } catch (error) {
    console.error("Diagnostic Expert Error:", error);
    return null;
  }
}

// Helper for chat components to use the same logic
export async function generateMiraResponse(history: any[], userMsg: string, systemInstruction: string) {
  try {
    const ai = getAI();
    if (!ai) return "Désolée, clé API non configurée.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userMsg }] }
      ],
      config: {
        systemInstruction
      }
    });

    return response.text || "Désolée, je n'ai pas pu générer une réponse.";
  } catch (error) {
    console.error("Mira AI Error:", error);
    return "Erreur technique Mira.";
  }
}
