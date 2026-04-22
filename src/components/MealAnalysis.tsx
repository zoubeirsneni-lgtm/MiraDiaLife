import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, Info } from 'lucide-react';
import { Button } from './ui/button';
import { analyzeMealImage } from '../services/aiService';

interface MealAnalysisProps {
  onAnalysisSuccess?: (data: { name: string; estimateGlucides: string; advice: string }) => void;
}

export const MealAnalysis: React.FC<MealAnalysisProps> = ({ onAnalysisSuccess }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; estimateGlucides: string; advice: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    setResult(null);
    try {
      const data = await analyzeMealImage(base64);
      if (data) {
        setResult(data);
        if (onAnalysisSuccess) onAnalysisSuccess(data);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-500 rounded-lg text-white">
          <Camera size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Analyse Photo de Repas</h3>
          <p className="text-xs text-slate-600">Prenez une photo pour estimer les glucides</p>
        </div>
      </div>

      <div className="space-y-4">
        {!preview ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-orange-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-100 transition-colors bg-white/50"
          >
            <ImageIcon size={40} className="text-orange-300 mb-2" />
            <p className="text-sm font-medium text-orange-600">Cliquez pour ajouter une photo</p>
            <p className="text-[10px] text-slate-400 mt-1">Plat tunisien, repas complet, etc.</p>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
            <img src={preview} alt="Repas" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            <div className="absolute top-2 right-2">
              <Button size="sm" variant="secondary" onClick={() => { setPreview(null); setResult(null); }} className="h-8 text-xs">
                Changer
              </Button>
            </div>
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                <Loader2 size={32} className="animate-spin mb-2" />
                <p className="text-sm font-bold">Analyse par l'IA...</p>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl p-4 border border-orange-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-900">{result.name}</h4>
              <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Est: {result.estimateGlucides}
              </span>
            </div>
            <div className="flex gap-2 items-start">
              <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600 leading-relaxed italic">{result.advice}</p>
            </div>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
};
