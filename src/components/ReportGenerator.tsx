import React from 'react';
import { Card } from './Card';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { UserProfile, HealthLog } from '../types';

export const ReportGenerator = ({ profile, logs }: { profile: UserProfile | null, logs: HealthLog[] }) => {
  const downloadReport = async () => {
    if (!profile || !profile.name) return;
    const element = document.getElementById('report-content');
    if (!element) return;
    
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Rapport_DiaCare_${profile.name}.pdf`);
  };

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between bg-blue-600 text-white border-0">
        <div className="flex items-center gap-3">
          <FileText size={24} />
          <div>
            <h3 className="font-bold">Rapport Médical</h3>
            <p className="text-[10px] opacity-80">Prêt pour votre médecin</p>
          </div>
        </div>
        <button onClick={downloadReport} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
          <Download size={20} />
        </button>
      </Card>
      
      {/* Hidden container for PDF generation */}
      <div className="fixed -left-[2000px] top-0">
        <div id="report-content" className="p-8 w-[210mm] bg-white text-slate-900">
          <div className="border-b-4 border-blue-600 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black text-blue-600">DIACARE</h1>
              <p className="text-sm font-bold text-slate-400">Rapport de Suivi Diabétique (Tunisie)</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-6 rounded-2xl">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Patient</h2>
              <p className="text-xl font-bold">{profile.name}</p>
              <p className="text-slate-600 capitalize">{profile.diabetesType}</p>
              <p className="text-slate-600">{profile.age} ans</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Résumé</h2>
              <p className="text-slate-700">Relevés totaux: {logs.length}</p>
              <p className="text-slate-700">Dernier glucose: {logs.find(l => l.type === 'glucose')?.value} mg/dL</p>
            </div>
          </div>

          <h2 className="font-black text-lg mb-4 text-slate-800">Historique des 30 derniers jours</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 italic">
                <th className="p-3 border-b text-sm">Date</th>
                <th className="p-3 border-b text-sm">Type</th>
                <th className="p-3 border-b text-sm">Valeur</th>
                <th className="p-3 border-b text-sm">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 30).map((log, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3 text-sm">{new Date(log.timestamp?.seconds * 1000).toLocaleDateString()}</td>
                  <td className="p-3 text-sm font-bold uppercase">{log.type}</td>
                  <td className="p-3 text-sm">{log.value} {log.unit}</td>
                  <td className="p-3 text-xs text-slate-500">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 pt-8 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            Généré par DiaCare AI - Cet outil ne remplace pas un conseil médical professionnel.
          </div>
        </div>
      </div>
    </div>
  );
};
