import React, { useState } from 'react';
import { Card } from './Card';
import { Camera, Sparkles, Utensils, CheckCircle2, AlertTriangle, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeMeal } from '../services/aiService';

export const MealAnalysis = () => {
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [description, setDescription] = useState("");

  const handleAnalyze = async () => {
    if (!description.trim()) return;
    setAnalysing(true);
    try {
      const data = await analyzeMeal(description);
      if (data) setResult(data);
    } catch (e) {
      console.error(e);
    }
    setAnalysing(false);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white border-2 border-slate-100 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Utensils className="text-blue-600" size={20} />
            <h3 className="font-bold text-slate-800">Analyser mon Repas</h3>
          </div>
          
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrit ton repas (ex: 200g de Couscous avec poulet et légumes...)"
              className="w-full bg-slate-50 border-0 rounded-xl p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button 
                onClick={handleAnalyze}
                disabled={analysing || !description.trim()}
                className="bg-blue-600 text-white p-2 rounded-lg shadow-lg shadow-blue-200 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                {analysing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Sparkles size={20} />
                  </motion.div>
                ) : <Search size={20} />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center italic">Mira analysera les glucides et l'impact de ton plat tunisien.</p>
        </div>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-slate-900 text-white overflow-hidden relative">
              <button 
                onClick={() => setResult(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <Utensils className="text-orange-500" />
                <h4 className="font-black text-lg">{result.name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Glucides</p>
                  <p className="text-xl font-black">{result.carbs}g</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Impact Glycémique</p>
                  <p className="text-xl font-black text-orange-400">{result.impact}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="text-yellow-500 shrink-0" size={16} />
                  <p className="text-slate-300 italic">{result.warning}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase font-black text-blue-400 tracking-widest">Conseils de Mira</p>
                {result.tips.map((tip: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
