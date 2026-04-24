import React, { useState, useRef, useEffect } from 'react';
import { Card } from './Card';
import { Send, Brain, Bot, User, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithMira } from '../services/aiService';
import { UserProfile, HealthLog } from '../types';

export default function ChatWithMira({ profile, logs }: { profile: UserProfile | null, logs: HealthLog[] }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const response = await chatWithMira(profile, logs, userMsg, history);
    setMessages(prev => [...prev, { role: 'model', content: response }]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md pb-4">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          Chat avec Mira <Sparkles className="text-blue-600" size={20} />
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Votre experte santé personnelle</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-1" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-60 px-10">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600">
              <Bot size={44} />
            </div>
            <div className="space-y-2">
              <p className="font-bold text-slate-800 italic">"Aslema ! Je suis Mira. Comment puis-je t'aider aujourd'hui ?"</p>
              <p className="text-[10px] uppercase font-black tracking-widest text-blue-600">Posez vos questions sur votre alimentation ou vos glycémies</p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {msg.role === 'user' ? <User size={12} className="opacity-60" /> : <Brain size={12} className="text-blue-600" />}
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                    {msg.role === 'user' ? 'Vous' : 'Mira'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none border border-slate-200">
               <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 pb-2">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-300"></div>
          <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-2 pr-3">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Question sur votre diabète..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2"
            />
            <button 
              onClick={handleSend}
              className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
