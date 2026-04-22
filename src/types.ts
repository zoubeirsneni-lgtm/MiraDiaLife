export type DiabetesType = 'type1' | 'type2' | 'gestational';

export interface UserProfile {
  name: string;
  diabetesType: DiabetesType;
  age?: number;
  since?: string;
  targetMin?: number;
  targetMax?: number;
  insulinToCarbRatio?: number; // Grams of carbs covered by 1 unit
  insulinSensitivityFactor?: number; // mg/dL drop per 1 unit
}

export interface HealthLog {
  id: string;
  userId: string;
  timestamp: any; // Firestore Timestamp
  type: 'glucose' | 'activity' | 'food' | 'weight' | 'medication';
  value: number; // For medication, this could be the dose
  medicationName?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealTime?: 'before' | 'after';
  unit?: string;
  notes?: string;
}

export interface DiaCareInsights {
  tunisianMeal: {
    name: string;
    ingredients: string[];
    whySuitable: string;
    alternative: string;
  };
  dailyMealPlan: {
    breakfast: string;
    lunch: string;
    dinner: string;
    explanation: string;
    score: number;
  };
  predictions: {
    shortTerm: { range: string; risk: string; cause: string; advice: string };
    threeDay: { trend: string; risk: string };
    fiveDay: { stability: string; factor: string };
    sevenDay: { trend: string; warning: string };
  };
  healthScore: {
    score: number;
    status: string;
    explanation: string;
    action: string;
  };
  smartInsights: {
    keyInsight: string;
    problem: string;
    recommendation: string;
  };
  dashboard: {
    status: string;
    trend: string;
    risk: string;
    recommendation: string;
    outlook: string;
  };
}
