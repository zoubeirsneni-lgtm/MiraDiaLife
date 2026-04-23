import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, HealthLog, DiaCareInsights } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const DIA_CARE_SYSTEM_PROMPT = `
You are an advanced AI system called "Diagnostic Expert" specialized in diabetes management.

You act as:
- diabetes nutrition assistant
- Tunisian meal generator
- glucose prediction engine (short + long term)
- health scoring system (0–100)
- intelligent daily dashboard generator
- Firebase-ready data structurer

IMPORTANT RULES:
- Never give medical diagnosis
- Never replace a doctor
- Only provide safe lifestyle and nutrition guidance
- Be clear, structured, and practical
- Tunisian foods only for Task 1
- Use French or English as preferred by the user, but default to French if the context suggests so (since the app is in French).

Output MUST be valid JSON matching the provided schema.
`;

export async function analyzeMealImage(base64Image: string): Promise<{ name: string; estimateGlucides: string; advice: string } | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Analyze this Tunisian meal for a diabetic person. Identify the dish, estimate the carbs (glucides) in grams, and provide short advice. Return JSON." },
            { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] || base64Image } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            estimateGlucides: { type: Type.STRING },
            advice: { type: Type.STRING }
          },
          required: ["name", "estimateGlucides", "advice"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Meal Analysis Error:", error);
    return null;
  }
}

export async function getDiaCareInsights(profile: UserProfile, logs: HealthLog[]): Promise<DiaCareInsights | null> {
  try {
    const glucoseLogs = logs.filter(l => l.type === 'glucose').slice(0, 20);
    const mealsLogs = logs.filter(l => l.type === 'food').slice(0, 10);
    const activityLogs = logs.filter(l => l.type === 'activity').slice(0, 10);
    const medLogs = logs.filter(l => l.type === 'medication').slice(0, 5);
    const weightLogs = logs.filter(l => l.type === 'weight').slice(0, 3);

    const userInput = {
      profile,
      currentGlucose: glucoseLogs[0]?.value,
      glucoseHistory: glucoseLogs.map(l => ({ val: l.value, time: l.timestamp?.seconds })),
      meals: mealsLogs.map(l => ({ notes: l.notes, type: l.mealType, time: l.mealTime })),
      activity: activityLogs.map(l => ({ val: l.value, notes: l.notes })),
      medication: medLogs.map(l => ({ name: l.medicationName, dose: l.value })),
      weight: weightLogs[0]?.value
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Calculate insights for: ${JSON.stringify(userInput)}`,
      config: {
        systemInstruction: DIA_CARE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tunisianMeal: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                whySuitable: { type: Type.STRING },
                alternative: { type: Type.STRING }
              },
              required: ["name", "ingredients", "whySuitable", "alternative"]
            },
            dailyMealPlan: {
              type: Type.OBJECT,
              properties: {
                breakfast: { type: Type.STRING },
                lunch: { type: Type.STRING },
                dinner: { type: Type.STRING },
                explanation: { type: Type.STRING },
                score: { type: Type.NUMBER }
              },
              required: ["breakfast", "lunch", "dinner", "explanation", "score"]
            },
            predictions: {
              type: Type.OBJECT,
              properties: {
                shortTerm: {
                  type: Type.OBJECT,
                  properties: {
                    range: { type: Type.STRING },
                    risk: { type: Type.STRING },
                    cause: { type: Type.STRING },
                    advice: { type: Type.STRING }
                  },
                  required: ["range", "risk", "cause", "advice"]
                },
                threeDay: {
                  type: Type.OBJECT,
                  properties: {
                    trend: { type: Type.STRING },
                    risk: { type: Type.STRING }
                  },
                  required: ["trend", "risk"]
                },
                fiveDay: {
                  type: Type.OBJECT,
                  properties: {
                    stability: { type: Type.STRING },
                    factor: { type: Type.STRING }
                  },
                  required: ["stability", "factor"]
                },
                sevenDay: {
                  type: Type.OBJECT,
                  properties: {
                    trend: { type: Type.STRING },
                    warning: { type: Type.STRING }
                  },
                  required: ["trend", "warning"]
                }
              },
              required: ["shortTerm", "threeDay", "fiveDay", "sevenDay"]
            },
            healthScore: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                status: { type: Type.STRING },
                explanation: { type: Type.STRING },
                action: { type: Type.STRING }
              },
              required: ["score", "status", "explanation", "action"]
            },
            smartInsights: {
              type: Type.OBJECT,
              properties: {
                keyInsight: { type: Type.STRING, description: "Remarque principale sur l'état de santé" },
                problem: { type: Type.STRING },
                recommendation: { type: Type.STRING }
              },
              required: ["keyInsight", "problem", "recommendation"]
            },
            dashboard: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING },
                trend: { type: Type.STRING },
                risk: { type: Type.STRING },
                recommendation: { type: Type.STRING },
                outlook: { type: Type.STRING }
              },
              required: ["status", "trend", "risk", "recommendation", "outlook"]
            }
          },
          required: ["tunisianMeal", "dailyMealPlan", "predictions", "healthScore", "smartInsights", "dashboard"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as DiaCareInsights;
    }
    return null;
  } catch (error) {
    console.error("Diagnostic Expert Error:", error);
    return null;
  }
}
