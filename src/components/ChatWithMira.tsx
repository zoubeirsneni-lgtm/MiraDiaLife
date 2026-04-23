import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
import { HealthLog, UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getAI } from '../services/aiService';

const ChatWithMira = ({ logs, profile }: { logs: HealthLog[], profile: UserProfile | null }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { role: 'model', content: "Bonjour ! Je suis Mira, votre assistante MiraDiaLife. Comment puis-je vous aider aujourd'hui avec vos données de santé ?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const ai = getAI();
      if (!ai) {
        setMessages(prev => [...prev, { role: 'model', content: "Désolée, je ne peux pas répondre car ma clé API n'est pas configurée dans le fichier .env de votre ordinateur." }]);
        setLoading(false);
        return;
      }
      
      // Filtrer les messages pour s'assurer que l'historique commence par l'utilisateur
      // et alterner correctement entre user et model
      const history = messages
        .filter((m, index) => !(index === 0 && m.role === 'model')) // Skip le "Bonjour" initial de Mira
        .map(m => ({ role: m.role, parts: [{ text: m.content }] }));

      // Contextual data preparation
      const recentLogs = logs.slice(0, 30).map(l => ({
        type: l.type,
        value: l.value,
        medication: l.medicationName,
        meal: l.mealType,
        time: l.timestamp?.seconds ? new Date(l.timestamp.seconds * 1000).toLocaleString() : 'N/A'
      }));

      const systemInstruction = `
        Vous êtes Mira, une assistante experte en diabétologie pour l'application MiraDiaLife.
        Votre but est d'aider l'utilisateur à comprendre ses données de santé.
        Voici les données de l'utilisateur :
        - Type de diabète : ${profile?.diabetesType || 'Non spécifié'}
        - Dernières données (30 logs) : ${JSON.stringify(recentLogs)}
        
        Règles :
        1. Soyez empathique, professionnel et encourageant.
        2. Utilisez les données fournies pour répondre de manière personnalisée.
        3. Si l'utilisateur demande une analyse, regardez les tendances (glycémie haute/basse, lien avec les repas).
        4. Ne donnez jamais de prescriptions médicales fermes, suggérez toujours de consulter le Docteur Sneni pour les changements de traitement.
        5. Répondez en Français.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          systemInstruction
        }
      });

      const modelReply = response.text || "Désolée, je n'ai pas pu générer une réponse.";
      setMessages(prev => [...prev, { role: 'model', content: modelReply }]);
    } catch (error) {
      console.error("Mira Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Désolée, j'ai rencontré une petite erreur technique. Pouvez-vous répéter ?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-[32px] border-4 border-slate-900 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-white font-black text-sm uppercase tracking-wider">Mira AI Assistant</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">En ligne</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mira réfléchit...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Posez une question à Mira..."
            className="w-full pl-4 pr-14 py-4 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 p-2.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-30 disabled:hover:bg-slate-900"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWithMira;
