/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, login, logout, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, getDocs, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Plus, 
  History as HistoryIcon, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Droplets, 
  Utensils, 
  Scale, 
  ChevronRight,
  TrendingUp,
  Brain,
  Calendar,
  AlertCircle,
  Pill,
  Sparkles,
  Zap,
  Target,
  LayoutDashboard,
  Loader2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';
import { UserProfile, HealthLog, DiabetesType, DiaCareInsights } from './types';
import { getDiaCareInsights } from './services/aiService';
import { ReportGenerator } from './components/ReportGenerator';
import { MealAnalysis } from './components/MealAnalysis';
import { InsulinCalculator } from './components/InsulinCalculator';
import ChatWithMira from './components/ChatWithMira';

const ADMIN_EMAIL = 'zoubeirsneni@gmail.com';

const checkAlert = (type: string, value: number) => {
  if (type === 'glucose') {
    if (value < 70) return { type: 'hypo', message: 'Hypoglycémie détectée ! Prenez 15g de sucre rapidement.', severity: 'critical' as const };
    if (value > 250) return { type: 'hyper', message: 'Hyperglycémie sévère ! Hydratez-vous et surveillez les cétones.', severity: 'warning' as const };
  }
  return null;
};

// --- Components ---
const AdminPanel = ({ onSelectPatient }: { onSelectPatient: (p: {id: string, profile: UserProfile}) => void }) => {
  const [patients, setPatients] = useState<{id: string, profile: UserProfile, hasAlert?: boolean}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        
        // Also fetch latest logs for each patient to detect alerts
        const patientsData = await Promise.all(snapshot.docs.map(async (userDoc) => {
          const profile = userDoc.data() as UserProfile;
          const logQ = query(collection(db, 'logs'), where('userId', '==', userDoc.id), orderBy('timestamp', 'desc'), limit(1));
          const logSnap = await getDocs(logQ);
          let hasAlert = false;
          if (!logSnap.empty) {
            const lastLog = logSnap.docs[0].data();
            const alert = checkAlert(lastLog.type, lastLog.value);
            if (alert) hasAlert = true;
          }

          return {
            id: userDoc.id,
            profile,
            hasAlert
          };
        }));

        setPatients(patientsData);
      } catch (err) {
        console.error("Admin fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
            <UserIcon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black">Espace Docteur</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Liste des Patients</p>
          </div>
        </div>
        {patients.some(p => p.hasAlert) && (
          <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
            <AlertCircle size={12} />
            Alertes en cours
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : (
        <div className="space-y-3">
          {patients.map((p) => (
            <Card 
              key={p.id} 
              hover 
              onClick={() => onSelectPatient(p)} 
              className={`flex items-center justify-between cursor-pointer p-4 border-2 ${p.hasAlert ? 'border-red-200 bg-red-50' : 'border-[#E2E8F0]'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm font-black ${p.hasAlert ? 'bg-white text-red-600 border-red-100' : 'bg-white text-blue-600 border-slate-100'}`}>
                  {p.profile.name?.[0] || 'P'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-800">{p.profile.name || 'Patient'}</p>
                    {p.hasAlert && <AlertCircle size={14} className="text-red-500" />}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Diabète {p.profile.diabetesType?.toUpperCase()}</p>
                </div>
              </div>
              <ChevronRight size={18} className={p.hasAlert ? 'text-red-300' : 'text-slate-300'} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Button = ({ children, onClick, className = "", variant = "primary", disabled = false }: any) => {
  const variants: any = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    outline: "border border-blue-500 text-blue-600 hover:bg-blue-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "text-gray-500 hover:bg-gray-100"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`px-4 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "", hover = false, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] transition-all ${hover ? 'hover:bg-[#E0F2FE] hover:border-[#7DD3FC]' : ''} ${className}`}
  >
    {children}
  </div>
);

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-medium text-gray-500 ml-1">{label}</label>}
    <input 
      {...props} 
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
    />
  </div>
);

const GlucoseChart = ({ logs, profile }: { logs: HealthLog[], profile: UserProfile | null }) => {
  const chartData = logs
    .filter(log => log.type === 'glucose')
    .slice(0, 10)
    .reverse()
    .map(log => ({
      time: log.timestamp?.seconds 
        ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '...',
      val: log.value
    }));

  if (chartData.length < 2) return null;

  const targetMin = profile?.targetMin || 70;
  const targetMax = profile?.targetMax || 130;

  return (
    <Card className="h-72 pt-6">
      <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B] mb-6 px-1 flex items-center gap-2">
        <TrendingUp size={14} className="text-blue-500" />
        Tendance Glycémique
      </h3>
      <div className="h-48 w-full" style={{ minHeight: '192px' }}>
        <ResponsiveContainer width="99%" height={192}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              dy={10}
            />
            <YAxis hide domain={['dataMin - 30', 'dataMax + 30']} />
            <ReferenceArea 
              y1={targetMin} 
              y2={targetMax} 
              fill="#3B82F6" 
              fillOpacity={0.05} 
              {...({} as any)}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                fontWeight: 'bold'
              }} 
              cursor={{ stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '5 5' }}
            />
            <Line 
              type="monotone" 
              dataKey="val" 
              stroke="#3B82F6" 
              strokeWidth={4} 
              dot={{ r: 6, fill: '#3B82F6', strokeWidth: 3, stroke: '#fff' }}
              activeDot={{ r: 8, strokeWidth: 0 }}
              animationDuration={2000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// --- Pages ---

const Dashboard = ({ user, profile, logs, onNavigate }: { user: User, profile: UserProfile | null, logs: HealthLog[], onNavigate: (tab: any) => void }) => {
  const lastGlucose = logs.find(l => l.type === 'glucose');
  const currentAlert = lastGlucose ? checkAlert('glucose', lastGlucose.value) : null;
  
  // Stats for DiabTrend features
  const glucoseLogs = logs.filter(l => l.type === 'glucose');
  const avgGlucose = glucoseLogs.length > 0
    ? Math.round(glucoseLogs.reduce((acc, curr) => acc + curr.value, 0) / glucoseLogs.length)
    : 0;
  
  // Estimation HbA1c: (AvgG + 46.7) / 28.7
  const estimatedHbA1c = avgGlucose > 0 ? ((avgGlucose + 46.7) / 28.7).toFixed(1) : '--';
  
  const inRangeCount = glucoseLogs.filter(l => l.value >= (profile?.targetMin || 70) && l.value <= (profile?.targetMax || 130)).length;
  const inRangePercent = glucoseLogs.length > 0 ? Math.round((inRangeCount / glucoseLogs.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex justify-between items-center px-2">
        <div className="bg-[#EFF6FF] text-[#1E40AF] px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
          {profile?.diabetesType ? `Diabète ${profile.diabetesType.toUpperCase()}` : 'MiraDiaLife'}
        </div>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 ring-2 ring-white">
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} referrerPolicy="no-referrer" alt="Avatar" />
        </div>
      </header>

      <AnimatePresence>
        {currentAlert && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }}
            className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${
              currentAlert.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'
            }`}
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">Alerte Sécurité</p>
              <p className="text-xs font-bold leading-tight">{currentAlert.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center justify-center pt-4 mb-2">
        <div className="relative flex items-center justify-center p-6">
          <div className="absolute inset-0 border border-dashed border-[#CBD5E1] rounded-full scale-110"></div>
          <div className="w-40 h-40 border-[10px] border-[#3B82F6] rounded-full flex flex-col items-center justify-center bg-white shadow-inner">
            <span className="text-4xl font-extrabold text-[#1E293B] tracking-tight">{lastGlucose?.value || '--'}</span>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mt-1">mg/dL Glycémie</span>
          </div>
        </div>
        <p className="text-[11px] text-[#64748B] mt-6 font-medium">
          Dernière mesure: {lastGlucose ? new Date(lastGlucose.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Indisponible'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center justify-center space-y-1 bg-white">
          <span className="text-2xl font-black text-blue-600">{estimatedHbA1c}%</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Est. HbA1c</span>
        </Card>
        <Card className="flex flex-col items-center justify-center space-y-1 bg-white">
          <span className="text-2xl font-black text-green-500">{inRangePercent}%</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Dans la cible</span>
        </Card>
      </div>

      <ReportGenerator profile={profile!} logs={logs} />

      <button 
        onClick={() => onNavigate('ai')}
        className="w-full relative group"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <Card className="relative bg-white border-0 flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Sparkles size={24} />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black text-slate-800">Diagnostic Expert</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Analyses & Prédictions</p>
            </div>
          </div>
          <ChevronRight className="text-blue-500" size={20} />
        </Card>
      </button>

      {logs.some(l => l.type === 'weight') && (
        <Card className="bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <Scale size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Poids</p>
              <p className="text-lg font-black text-slate-800">
                {logs.find(l => l.type === 'weight')?.value} 
                <span className="text-xs ml-1 font-bold text-gray-400">{logs.find(l => l.type === 'weight')?.unit || 'kg'}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 italic">Dernier relevé</p>
          </div>
        </Card>
      )}

      <GlucoseChart logs={logs} profile={profile} />

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onNavigate('diet')} className="text-left">
          <Card hover className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 bg-[#3B82F6] rounded-xl flex items-center justify-center text-white">
              <Utensils size={20} />
            </div>
            <h3 className="text-[13px] font-bold text-[#334155]">Régimes</h3>
          </Card>
        </button>
        <button onClick={() => onNavigate('lifestyle')} className="text-left">
          <Card hover className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 bg-[#3B82F6] rounded-xl flex items-center justify-center text-white">
              <Activity size={20} />
            </div>
            <h3 className="text-[13px] font-bold text-[#334155]">Hygiène</h3>
          </Card>
        </button>
      </div>
    </div>
  );
};

const AddLog = ({ profile, onAdded, initialLog }: { profile: UserProfile | null, onAdded: () => void, initialLog?: HealthLog | null }) => {
  const [type, setType] = useState<HealthLog['type']>(initialLog?.type || 'glucose');
  const [value, setValue] = useState(initialLog?.value?.toString() || '');
  const [medicationName, setMedicationName] = useState(initialLog?.medicationName || '');
  const [mealType, setMealType] = useState<HealthLog['mealType']>(initialLog?.mealType || 'breakfast');
  const [mealTime, setMealTime] = useState<HealthLog['mealTime']>(initialLog?.mealTime || 'before');
  const [unit, setUnit] = useState(initialLog?.unit || 'kg');
  const [notes, setNotes] = useState(initialLog?.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || !auth.currentUser) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'logs'), {
        userId: auth.currentUser.uid,
        type,
        value: parseFloat(value),
        medicationName: type === 'medication' ? medicationName : null,
        mealType: type === 'food' || type === 'glucose' ? mealType : null,
        mealTime: type === 'glucose' ? mealTime : null,
        unit: type === 'weight' ? unit : (types.find(t => t.id === type)?.unit || null),
        notes,
        timestamp: serverTimestamp()
      });
      setValue('');
      setMedicationName('');
      setNotes('');
      onAdded();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { id: 'glucose', icon: Droplets, label: 'Glycémie', unit: 'mg/dL', color: 'blue' },
    { id: 'activity', icon: Activity, label: 'Activité', unit: 'min', color: 'green' },
    { id: 'food', icon: Utensils, label: 'Repas', unit: 'carb', color: 'orange' },
    { id: 'weight', icon: Scale, label: 'Poids', unit: 'kg', color: 'purple' },
    { id: 'medication', icon: Pill, label: 'Médicament', unit: 'dose', color: 'red' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold">Nouveau Relevé</h2>
      
      {profile?.diabetesType === 'type1' && (type === 'food' || type === 'medication') && (
        <InsulinCalculator profile={profile} />
      )}
      
      <div className="grid grid-cols-2 gap-3">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id as any)}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${
              type === t.id 
                ? `border-blue-500 bg-blue-50 text-blue-600` 
                : 'border-gray-100 bg-white text-gray-400'
            }`}
          >
            <t.icon size={24} />
            <span className="text-xs font-semibold">{t.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {type === 'medication' && (
          <Input 
            label="Nom du médicament"
            placeholder="Ex: Insuline Rapide, Metformine..."
            value={medicationName}
            onChange={(e: any) => setMedicationName(e.target.value)}
            required
          />
        )}
        <Input 
          label={type === 'medication' ? "Dose / Quantité" : `Valeur (${type === 'weight' ? unit : (types.find(t => t.id === type)?.unit)})`}
          type="number" 
          step="0.1"
          placeholder="0.0"
          value={value}
          onChange={(e: any) => setValue(e.target.value)}
          required
        />

        {type === 'weight' && (
           <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 ml-1">Unité</label>
            <div className="flex gap-2">
              {['kg', 'lbs'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`flex-1 py-2 rounded-xl border-2 font-bold transition-all ${
                    unit === u 
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-100 bg-white text-gray-400'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        )}

        {(type === 'food' || type === 'glucose') && (
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 ml-1">Moment du repas</label>
              <select 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as any)}
              >
                <option value="breakfast">Petit déj.</option>
                <option value="lunch">Déjeuner</option>
                <option value="dinner">Dîner</option>
                <option value="snack">Collation</option>
              </select>
            </div>
            {type === 'glucose' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 ml-1">Par rapport au repas</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value as any)}
                >
                  <option value="before">Avant</option>
                  <option value="after">Après</option>
                </select>
              </div>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 ml-1">Notes (facultatif)</label>
          <textarea 
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            placeholder="Ex: Après le petit déjeuner..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button className="w-full py-4 text-lg shadow-lg shadow-blue-200" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
};

const History = ({ logs, onDuplicate }: { logs: HealthLog[], onDuplicate: (log: HealthLog) => void }) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');

  const filteredData = React.useMemo(() => {
    const now = new Date();
    let cutoff = new Date();
    
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    else if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);

    return logs
      .filter(l => l.type === 'glucose' && l.timestamp?.seconds && new Date(l.timestamp.seconds * 1000) >= cutoff)
      .map(l => ({
        date: new Date(l.timestamp.seconds * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        value: l.value,
        fullDate: new Date(l.timestamp.seconds * 1000).toLocaleString('fr-FR'),
        timestamp: l.timestamp.seconds
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [logs, period]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Historique</h2>
      </div>

      <Card className="p-4 bg-white border-2 border-blue-50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-700">Progression Glycémique</h3>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['week', 'month', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as any)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  period === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                }`}
              >
                {p === 'week' ? '7j' : p === 'month' ? '30j' : '1an'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[200px] w-full">
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }}
                  minTickGap={20}
                />
                <YAxis 
                  hide={false} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }}
                  domain={['dataMin - 20', 'dataMax + 20']}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                  labelStyle={{ display: 'none' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#1E40AF', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <TrendingUp size={32} className="opacity-20 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-center">Pas assez de données pour cette période</p>
            </div>
          )}
        </div>
      </Card>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Calendar size={48} className="mx-auto mb-4 opacity-20" />
          <p>Aucun historique disponible</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-xl bg-opacity-10 ${
                  log.type === 'glucose' ? 'bg-blue-500 text-blue-500' :
                  log.type === 'activity' ? 'bg-green-500 text-green-500' :
                  log.type === 'food' ? 'bg-orange-500 text-orange-500' :
                  log.type === 'medication' ? 'bg-red-500 text-red-500' :
                  'bg-purple-500 text-purple-500'
                }`}>
                   {log.type === 'glucose' ? <Droplets size={20} /> :
                    log.type === 'activity' ? <Activity size={20} /> :
                    log.type === 'food' ? <Utensils size={20} /> :
                    log.type === 'medication' ? <Pill size={20} /> :
                    <Scale size={20} />}
                </div>
                <div>
                  <p className="font-semibold capitalize">
                    {log.type === 'glucose' ? 'Glycémie' : 
                     log.type === 'medication' ? (log.medicationName || 'Médicament') : 
                     log.type}
                    {log.mealType && (
                      <span className="text-[10px] ml-2 text-gray-400 font-normal bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                        {log.mealTime === 'after' ? 'Après ' : 'Avant '}
                        {log.mealType === 'breakfast' ? 'P.déj' : log.mealType === 'lunch' ? 'Déj' : log.mealType === 'dinner' ? 'Dîner' : 'Coll.'}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('fr-FR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    }) : 'À l\'instant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold text-lg">{log.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase">
                    {log.unit || (
                      log.type === 'glucose' ? 'mg/dL' :
                      log.type === 'activity' ? 'min' :
                      log.type === 'food' ? 'glucides' :
                      log.type === 'medication' ? 'dose' :
                      'kg'
                    )}
                  </p>
                </div>
                <button 
                  onClick={() => onDuplicate(log)}
                  className="p-2 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded-lg transition-colors"
                  title="Dupliquer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Profile = ({ user, profile, setProfile, setActiveTab }: { user: User, profile: UserProfile | null, setProfile: any, setActiveTab: (t: any) => void }) => {
  const [editName, setEditName] = useState(profile?.name || user.displayName || '');
  const [editType, setEditType] = useState<DiabetesType>(profile?.diabetesType || 'type2');
  const [editAge, setEditAge] = useState(profile?.age?.toString() || '');
  const [editICR, setEditICR] = useState(profile?.insulinToCarbRatio?.toString() || '10');
  const [editISF, setEditISF] = useState(profile?.insulinSensitivityFactor?.toString() || '50');
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    setLoading(true);
    try {
      const data: UserProfile = {
        name: editName,
        diabetesType: editType,
        age: parseInt(editAge),
        targetMin: profile?.targetMin || 70,
        targetMax: profile?.targetMax || 130,
        insulinToCarbRatio: parseFloat(editICR),
        insulinSensitivityFactor: parseFloat(editISF)
      };
      await setDoc(doc(db, 'users', user.uid), data);
      setProfile(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center space-x-4">
        <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-md ring-4 ring-white">
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} referrerPolicy="no-referrer" alt="Avatar" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{user.displayName}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <Card className="space-y-4">
        <Input label="Nom complet" value={editName} onChange={(e: any) => setEditName(e.target.value)} />
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 ml-1">Type de diabète</label>
          <select 
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            value={editType}
            onChange={(e) => setEditType(e.target.value as any)}
          >
            <option value="type1">Type 1</option>
            <option value="type2">Type 2</option>
            <option value="gestational">Gestationnel</option>
          </select>
        </div>
        <Input label="Âge" type="number" value={editAge} onChange={(e: any) => setEditAge(e.target.value)} />
        
        {editType === 'type1' && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-600">Paramètres Insuline (Type 1)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Ratio Glucides (g/unité)" 
                type="number" 
                value={editICR} 
                onChange={(e: any) => setEditICR(e.target.value)} 
                placeholder="Ex: 10"
              />
              <Input 
                label="Sensibilité (mg/dL/unité)" 
                type="number" 
                value={editISF} 
                onChange={(e: any) => setEditISF(e.target.value)} 
                placeholder="Ex: 50"
              />
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Ces valeurs permettent au calculateur de estimer vos doses d'insuline.
            </p>
          </div>
        )}

        <Button className="w-full" onClick={saveProfile} disabled={loading}>
          {loading ? "Enregistrement..." : "Mettre à jour le profil"}
        </Button>
      </Card>

      {user.email === ADMIN_EMAIL && (
        <Card className="bg-slate-900 text-white border-0 shadow-xl shadow-slate-200">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <LayoutDashboard size={20} />
              </div>
              <h3 className="font-black">Espace Docteur</h3>
           </div>
           <p className="text-xs opacity-60 mb-4 leading-relaxed">Bienvenue Docteur Sneni. Vous avez accès à la gestion globale des patients et à leurs rapports.</p>
           <Button variant="secondary" className="w-full bg-white text-slate-900 border-none" onClick={() => setActiveTab('admin')}>
             Accéder à la Patientèle
           </Button>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-100 p-4">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles size={18} className="text-blue-500" />
          <h4 className="text-xs font-black uppercase tracking-widest text-blue-800">Installer MiraDiaLife</h4>
        </div>
        <p className="text-[11px] text-blue-700 leading-relaxed font-medium mb-3">
          Pour utiliser l'application comme une vraie application sur votre écran d'accueil :
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Ouvrez le lien partagé dans votre navigateur mobile.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Appuyez sur "Partager" (iOS) ou les "3 points" (Android).</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Sélectionnez "Sur l'écran d'accueil".</p>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        <Button variant="danger" className="w-full flex items-center justify-center space-x-2" onClick={logout}>
          <LogOut size={18} />
          <span>Se déconnecter</span>
        </Button>
      </div>
    </div>
  );
};

const DietPage = ({ profile, onBack }: { profile: UserProfile | null, onBack: () => void }) => {
  const recommendations = {
    type1: [
      "Compter les glucides pour chaque repas.",
      "Privilégier les index glycémiques bas.",
      "Garder du sucre rapide sur soi en cas d'hypoglycémie.",
      "Équilibrer l'apport calorique avec la dose d'insuline."
    ],
    type2: [
      "Réduire les produits transformés et sucrés.",
      "Augmenter la consommation de fibres (légumes, céréales complètes).",
      "Contrôler les portions pour stabiliser le poids.",
      "Privilégier les bonnes graisses (oméga-3)."
    ],
    gestational: [
      "Répartir l'apport en glucides sur 3 repas et 2-3 collations.",
      "Éviter les pics de glycémie le matin.",
      "Consommer des protéines à chaque repas.",
      "Prioriser les légumes verts."
    ]
  };

  const currentRecs = recommendations[profile?.diabetesType || 'type2'];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h2 className="text-2xl font-bold italic">Régimes Alimentaires</h2>
      </div>

      <MealAnalysis />

      <div className="space-y-4">
        {currentRecs.map((rec, i) => (
          <Card key={i} className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">
              {i + 1}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-medium">{rec}</p>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-100">
        <p className="text-xs text-blue-800 font-medium">
          Note : Ces conseils sont généraux. Consultez toujours votre médecin pour un régime adapté à votre situation spécifique.
        </p>
      </Card>
    </div>
  );
};

const LifestylePage = ({ onBack }: { onBack: () => void }) => {
  const tips = [
    { title: "Activité Physique", content: "Visez 150 minutes d'activité aérobie modérée par semaine.", icon: Activity },
    { title: "Sommeil", content: "Un sommeil de 7 à 9 heures aide à réguler la glycémie.", icon: Brain },
    { title: "Hydratation", content: "L'eau aide les reins à éliminer l'excess de sucre.", icon: Droplets },
    { title: "Stress", content: "Pratiquez la méditation ou le yoga pour limiter le cortisol.", icon: Brain }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h2 className="text-2xl font-bold italic">Hygiène de Vie</h2>
      </div>

      <div className="grid gap-4">
        {tips.map((tip, i) => (
          <Card key={i} className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
              <tip.icon size={20} />
              <h4 className="font-bold">{tip.title}</h4>
            </div>
            <p className="text-sm text-gray-600">{tip.content}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

const DiaCareAIPage = ({ profile, logs, onBack }: { profile: UserProfile | null, logs: HealthLog[], onBack: () => void }) => {
  const [insights, setInsights] = useState<DiaCareInsights | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    if (!profile) return;
    setLoading(true);
    const res = await getDiaCareInsights(profile, logs);
    if (res) setInsights(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Sparkles className="text-blue-600" size={64} />
        </motion.div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Diagnostic Expert analyse vos données...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-800">Diagnostic Expert</h2>
      </div>

      {insights ? (
        <div className="space-y-6">
          {/* Health Score */}
          <section className="space-y-3">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Zap size={14} className="text-yellow-500" /> Score de Santé
             </h3>
             <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 p-6 flex items-center justify-between shadow-xl shadow-slate-200">
               <div>
                 <p className="text-4xl font-black">{insights.healthScore.score}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">{insights.healthScore.status}</p>
               </div>
               <div className="text-right max-w-[180px]">
                 <p className="text-xs opacity-80 leading-relaxed italic">"{insights.healthScore.explanation}"</p>
                 <div className="mt-3 bg-blue-600/30 text-blue-300 text-[9px] font-bold px-2 py-1 rounded inline-block">
                    PROCHAINE ACTION: {insights.healthScore.action}
                 </div>
               </div>
             </Card>
          </section>

          {/* Smart Insights */}
          <section className="space-y-3">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Brain size={14} className="text-blue-500" /> Analyse Intelligente
             </h3>
             <Card className="space-y-4">
               <div>
                 <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Remarque principale</p>
                 <p className="text-sm font-medium text-slate-700">{insights.smartInsights.keyInsight}</p>
               </div>
               <div className="pt-3 border-t border-slate-100">
                 <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Problème Détecté</p>
                 <p className="text-sm font-medium text-slate-700">{insights.smartInsights.problem}</p>
               </div>
               <div className="pt-3 border-t border-slate-100">
                 <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Recommandation</p>
                 <p className="text-sm font-medium text-slate-700">{insights.smartInsights.recommendation}</p>
               </div>
             </Card>
          </section>

          {/* Predictions */}
          <section className="space-y-3">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <TrendingUp size={14} className="text-cyan-500" /> Prédictions
             </h3>
             <div className="grid grid-cols-2 gap-3">
               <Card className="p-4 space-y-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">2 Heures</p>
                  <p className="text-xs font-black text-slate-800">{insights.predictions.shortTerm.range}</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-black uppercase">{insights.predictions.shortTerm.risk}</span>
               </Card>
               <Card className="p-4 space-y-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">3 Jours</p>
                  <p className="text-xs font-black text-slate-800">{insights.predictions.threeDay.trend}</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 font-black uppercase">{insights.predictions.threeDay.risk}</span>
               </Card>
             </div>
             <Card className="p-4 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase">Projection 7 Jours</p>
                   <p className="text-sm font-black text-slate-800">{insights.predictions.sevenDay.trend}</p>
                </div>
                {insights.predictions.sevenDay.warning && (
                  <AlertCircle size={20} className="text-orange-500" />
                )}
             </Card>
          </section>

          {/* Tunisian Meal */}
          <section className="space-y-3">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Utensils size={14} className="text-orange-500" /> Repas Tunisien conseillé
             </h3>
             <Card className="bg-blue-50 border-blue-100 p-6 space-y-4">
               <div>
                 <h4 className="text-lg font-black text-blue-900">{insights.tunisianMeal.name}</h4>
                 <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase">Spécialité recommandées</p>
               </div>
               <div className="flex flex-wrap gap-2">
                  {insights.tunisianMeal.ingredients.map((ing, i) => (
                    <span key={i} className="text-[10px] font-bold bg-white text-blue-700 px-2 py-1 rounded-lg shadow-sm">{ing}</span>
                  ))}
               </div>
               <p className="text-xs text-blue-800 leading-relaxed italic">{insights.tunisianMeal.whySuitable}</p>
               <div className="pt-2 border-t border-blue-200">
                  <p className="text-[10px] font-bold text-blue-400 uppercase italic">Alternative: {insights.tunisianMeal.alternative}</p>
               </div>
             </Card>
          </section>

          {/* Meal Builder */}
          <section className="space-y-3">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Calendar size={14} className="text-green-500" /> Menu du Jour
             </h3>
             <div className="space-y-2">
               {[
                 { label: 'Petit Déjeuner', val: insights.dailyMealPlan.breakfast },
                 { label: 'Déjeuner', val: insights.dailyMealPlan.lunch },
                 { label: 'Dîner', val: insights.dailyMealPlan.dinner },
               ].map((m, i) => (
                 <Card key={i} className="flex justify-between items-center py-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{m.label}</span>
                    <span className="text-xs font-bold text-slate-700">{m.val}</span>
                 </Card>
               ))}
               <Card className="bg-green-50 border-green-100 py-3 text-center">
                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Score d'équilibre: {insights.dailyMealPlan.score}/100</p>
               </Card>
             </div>
          </section>

          {/* Daily Dashboard Summary */}
          <Card className="p-6 border-2 border-blue-600 bg-blue-600 text-white space-y-4">
             <div className="flex items-center gap-3">
               <Sparkles size={24} />
               <h3 className="font-black text-lg">Dashboard Intelligent</h3>
             </div>
             <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                   <p className="opacity-60 text-[9px] uppercase font-bold">Status Santé</p>
                   <p className="font-black">{insights.dashboard.status}</p>
                </div>
                <div>
                   <p className="opacity-60 text-[9px] uppercase font-bold">Niveau de Risque</p>
                   <p className="font-black">{insights.dashboard.risk}</p>
                </div>
             </div>
             <div className="pt-4 border-t border-white/20">
                <p className="text-xs leading-relaxed font-medium">"{insights.dashboard.recommendation}"</p>
                <p className="text-[10px] mt-2 opacity-60 italic">{insights.dashboard.outlook}</p>
             </div>
          </Card>

          <Button variant="outline" className="w-full border-2 border-blue-600 text-blue-600" onClick={fetchInsights}>
            Recalculer les analyses
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-10">
           <Sparkles size={48} className="text-blue-200 mb-4" />
           <p className="text-slate-400 text-sm italic">Échec de la récupération des analyses. Veuillez réessayer.</p>
           <Button className="mt-6" onClick={fetchInsights}>Réessayer</Button>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dash' | 'history' | 'add' | 'profile' | 'diet' | 'lifestyle' | 'ai' | 'admin' | 'patient_view' | 'chat'>('dash');
  const [selectedPatient, setSelectedPatient] = useState<{id: string, profile: UserProfile} | null>(null);
  const [patientLogs, setPatientLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLog, setPendingLog] = useState<HealthLog | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docSnap = await getDoc(doc(db, 'users', u.uid));
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
        const q = query(collection(db, 'logs'), where('userId', '==', u.uid), orderBy('timestamp', 'desc'));
        onSnapshot(q, (snapshot) => {
          setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HealthLog)));
        }, (error) => {
          console.error("Log subscription error:", error);
          if (error.code === 'permission-denied') {
            console.warn("Permission denied for logs. This might be due to missing indexing or rule misconfiguration.");
          }
        });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSelectPatient = async (p: {id: string, profile: UserProfile}) => {
    setSelectedPatient(p);
    setActiveTab('patient_view');
    const q = query(collection(db, 'logs'), where('userId', '==', p.id), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    setPatientLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HealthLog)));
  };

  const handleDuplicate = async (log: HealthLog) => {
    setPendingLog(log);
    setActiveTab('add');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
          <Activity className="text-[#3B82F6]" size={48} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[360px]">
          <div className="bg-white rounded-[40px] p-10 shadow-2xl border-[8px] border-[#334155] space-y-12">
            <div className="w-20 h-20 bg-[#3B82F6] rounded-[20px] flex items-center justify-center mx-auto shadow-xl shadow-blue-200">
              <Activity className="text-white" size={40} />
            </div>
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-black text-[#1E293B]">MiraDiaLife</h1>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-widest leading-relaxed">
                Géométrisez votre santé
              </p>
            </div>
            <Button onClick={login} className="w-full h-14 bg-[#3B82F6] shadow-lg shadow-blue-100">
              Connexion Google
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
      <div className="w-full max-w-[360px] h-[680px] bg-white rounded-[40px] border-[8px] border-[#334155] shadow-2xl overflow-hidden relative">
        <main className="h-full overflow-y-auto px-6 pt-10 pb-24 touch-pan-y custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'dash' && (
              <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Dashboard user={user} profile={profile} logs={logs} onNavigate={setActiveTab} />
              </motion.div>
            )}
            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <History logs={logs} onDuplicate={handleDuplicate} />
              </motion.div>
            )}
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ChatWithMira logs={logs} profile={profile} />
              </motion.div>
            )}
            {activeTab === 'add' && (
              <motion.div key="add" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <AddLog profile={profile} initialLog={pendingLog} onAdded={() => {
                  setPendingLog(null);
                  setActiveTab('dash');
                }} />
              </motion.div>
            )}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Profile user={user} profile={profile} setProfile={setProfile} setActiveTab={setActiveTab} />
              </motion.div>
            )}
            {activeTab === 'diet' && (
              <motion.div key="diet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <DietPage profile={profile} onBack={() => setActiveTab('dash')} />
              </motion.div>
            )}
            {activeTab === 'lifestyle' && (
              <motion.div key="lifestyle" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <LifestylePage onBack={() => setActiveTab('dash')} />
              </motion.div>
            )}
            {activeTab === 'ai' && (
              <motion.div key="ai" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <DiaCareAIPage profile={profile} logs={logs} onBack={() => setActiveTab('dash')} />
              </motion.div>
            )}
            {activeTab === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AdminPanel onSelectPatient={handleSelectPatient} />
              </motion.div>
            )}
            {activeTab === 'patient_view' && selectedPatient && (
              <motion.div key="patient_view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="space-y-6 pb-24">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('admin')} className="mb-4">← Retour à la liste</Button>
                  <div className="p-4 bg-blue-600 rounded-3xl text-white mb-6">
                    <h2 className="text-xl font-black">{selectedPatient.profile.name}</h2>
                    <p className="text-xs opacity-80 uppercase font-bold tracking-widest">{selectedPatient.profile.diabetesType}</p>
                  </div>
                  <ReportGenerator profile={selectedPatient.profile} logs={patientLogs} />
                  <div className="space-y-4">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Derniers Relevés</h3>
                    <History logs={patientLogs} onDuplicate={() => {}} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <nav className="absolute bottom-0 left-0 right-0 h-[70px] bg-white border-top border-[#E2E8F0] px-6 flex justify-between items-center z-50">
          <NavBtn active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={Activity} />
          <NavBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={HistoryIcon} />
          <button 
            onClick={() => setActiveTab('add')}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-[#3B82F6] text-white shadow-lg shadow-blue-100 ${activeTab === 'add' ? 'rotate-45' : ''}`}
          >
            <Plus size={28} />
          </button>
          <NavBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={Brain} />
          <NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={UserIcon} />
        </nav>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  );
}

const NavBtn = ({ active, onClick, icon: Icon }: any) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-2xl transition-all ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
  </button>
);
