import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Calculator, AlertTriangle, CheckCircle2, Info, Utensils, Droplets } from 'lucide-react';
import { Button } from './ui/button';

interface InsulinCalculatorProps {
  profile: UserProfile;
  currentGlucose?: number;
}

export const InsulinCalculator: React.FC<InsulinCalculatorProps> = ({ profile, currentGlucose: initialGlucose }) => {
  const [carbs, setCarbs] = useState<string>('');
  const [glucose, setGlucose] = useState<string>(initialGlucose?.toString() || '');
  const [result, setResult] = useState<{ dose: number; mealDose: number; correctionDose: number } | null>(null);

  const icr = profile.insulinToCarbRatio || 10;
  const isf = profile.insulinSensitivityFactor || 50;
  const target = (profile.targetMin || 70) + ((profile.targetMax || 130) - (profile.targetMin || 70)) / 2; // Midpoint of target range

  const calculate = () => {
    const carbGrams = parseFloat(carbs) || 0;
    const currentG = parseFloat(glucose) || target;

    const mealDose = carbGrams / icr;
    const correctionDose = Math.max(0, (currentG - target) / isf);
    const totalDose = mealDose + correctionDose;

    setResult({
      dose: Math.round(totalDose * 10) / 10,
      mealDose: Math.round(mealDose * 10) / 10,
      correctionDose: Math.round(correctionDose * 10) / 10
    });
  };

  useEffect(() => {
    if (carbs || glucose) {
      calculate();
    } else {
      setResult(null);
    }
  }, [carbs, glucose]);

  return (
    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
            <Calculator size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm">BOLUS EXPERT</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculateur d'Insuline</p>
          </div>
        </div>
        <div className="bg-white px-3 py-1 rounded-full border border-slate-200">
           <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Cible: {Math.round(target)} mg/dL</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Repas (Glucides g)</label>
          <div className="relative">
            <input 
              type="number"
              className="w-full pl-4 pr-10 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-100 transition-all font-black text-lg text-slate-800"
              placeholder="0"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
            <Utensils size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Glycémie (mg/dL)</label>
          <div className="relative">
            <input 
              type="number"
              className="w-full pl-4 pr-10 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-100 transition-all font-black text-lg text-slate-800"
              placeholder={target.toString()}
              value={glucose}
              onChange={(e) => setGlucose(e.target.value)}
            />
            <Droplets size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-[32px] p-6 border-2 border-slate-100 shadow-xl shadow-slate-200/50 animate-in zoom-in duration-500">
          <div className="flex flex-col items-center text-center space-y-2 mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dose Suggérée</p>
            <div className="flex items-baseline gap-2">
               <span className="text-6xl font-black text-slate-900 tracking-tighter">{result.dose}</span>
               <span className="text-sm font-black text-blue-600 uppercase">Unités</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase tracking-wider">
               <CheckCircle2 size={12} />
               Calculé avec vos réglages
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
             <div className="bg-slate-50/50 p-4">
               <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dose Repas</p>
               <p className="text-sm font-black text-slate-700">{result.mealDose} U</p>
               <p className="text-[9px] text-slate-400 font-bold tracking-tight">Ratio: 1u/{icr}g</p>
             </div>
             <div className="bg-slate-50/50 p-4">
               <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Correction</p>
               <p className="text-sm font-black text-slate-700">{result.correctionDose} U</p>
               <p className="text-[9px] text-slate-400 font-bold tracking-tight">Sens: 1u/{isf}mg</p>
             </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-orange-50/50 rounded-2xl flex gap-3 items-start border border-orange-100/50">
        <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-orange-900 font-semibold leading-relaxed">
          <span className="font-black">SÉCURITÉ :</span> Cette suggestion ne remplace pas un avis médical. Validez toujours la dose avec votre protocole de soin.
        </p>
      </div>
    </div>
  );
};
