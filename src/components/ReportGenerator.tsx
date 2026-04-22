import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { UserProfile, HealthLog } from '../types';
import { FileText, Download, Loader2, Share2 } from 'lucide-react';
import { Button } from './ui/button';

interface ReportGeneratorProps {
  profile: UserProfile;
  logs: HealthLog[];
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ profile, logs }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDFInternal = async () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 25;

    // --- Modern Header ---
    doc.setFillColor(59, 130, 246); // Blue-600
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('MiraDiaLife - Rapport Médical', margin, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('VOTRE COMPAGNON SANTÉ INTELLIGENT', margin, 32);
    
    doc.setFontSize(10);
    doc.text(`Rapport généré le: ${new Date().toLocaleDateString('fr-FR')}`, 140, 25);
    y = 55;

    // --- Patient Profile Box ---
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, 170, 35, 3, 3, 'FD');
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PROFIL DU PATIENT', margin + 10, y + 10);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nom: ${profile.name || 'Anonyme'}`, margin + 10, y + 18);
    doc.text(`Type: Diabète ${profile.diabetesType.toUpperCase()}`, margin + 10, y + 25);
    doc.text(`Cible Glycémique: ${profile.targetMin || 70} - ${profile.targetMax || 130} mg/dL`, 110, y + 18);
    doc.text(`Âge: ${profile.age || '--'} ans`, 110, y + 25);
    
    y += 50;

    // --- Statistics Summary ---
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const filteredLogs = logs.filter(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      return logDate >= fifteenDaysAgo;
    });

    const glucoseLogs = filteredLogs.filter(l => l.type === 'glucose');
    const avgGlucose = glucoseLogs.length > 0
      ? Math.round(glucoseLogs.reduce((acc, curr) => acc + curr.value, 0) / glucoseLogs.length)
      : 0;
    const estHbA1c = avgGlucose > 0 ? ((avgGlucose + 46.7) / 28.7).toFixed(1) : '--';
    
    // Additional Stats
    const sortedGlucose = [...glucoseLogs].sort((a,b) => b.value - a.value);
    const maxGlucose = sortedGlucose.length > 0 ? sortedGlucose[0].value : '--';
    const minGlucose = sortedGlucose.length > 0 ? sortedGlucose[sortedGlucose.length - 1].value : '--';
    
    const targetMin = profile.targetMin || 70;
    const targetMax = profile.targetMax || 130;
    const inRangeCount = glucoseLogs.filter(l => l.value >= targetMin && l.value <= targetMax).length;
    const timeInRange = glucoseLogs.length > 0 ? Math.round((inRangeCount / glucoseLogs.length) * 100) : 0;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RÉSUMÉ DES 15 DERNIERS JOURS', margin, y);
    y += 8;
    
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, y, 50, 20, 2, 2, 'F');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(8);
    doc.text('MOYENNE GLYCÉMIE', margin + 5, y + 7);
    doc.setFontSize(14);
    doc.text(`${avgGlucose} mg/dL`, margin + 5, y + 15);

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin + 60, y, 50, 20, 2, 2, 'F');
    doc.setTextColor(21, 128, 61);
    doc.setFontSize(8);
    doc.text('TEMPS DANS LA CIBLE', margin + 65, y + 7);
    doc.setFontSize(14);
    doc.text(`${timeInRange}%`, margin + 65, y + 15);

    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin + 120, y, 50, 20, 2, 2, 'F');
    doc.setTextColor(153, 27, 27);
    doc.setFontSize(8);
    doc.text('HbA1c ESTIMÉE', margin + 125, y + 7);
    doc.setFontSize(14);
    doc.text(`${estHbA1c}%`, margin + 125, y + 15);
    
    y += 30;

    // Mini details
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text(`Glycémie Max: ${maxGlucose} mg/dL`, margin, y);
    doc.text(`Glycémie Min: ${minGlucose} mg/dL`, margin + 60, y);
    doc.text(`Cible réglée: ${targetMin}-${targetMax} mg/dL`, margin + 120, y);
    
    y += 15;

    // --- Medications & Activity (Quick Summary) ---
    const medLogs = filteredLogs.filter(l => l.type === 'medication');
    const activityLogs = filteredLogs.filter(l => l.type === 'activity');
    const totalActivityMinutes = activityLogs.reduce((acc, curr) => acc + curr.value, 0);

    if (medLogs.length > 0 || activityLogs.length > 0) {
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, 190, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES DE TRAITEMENT ET ACTIVITÉ', margin, y);
      y += 7;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (totalActivityMinutes > 0) {
        doc.text(`• Activité physique totale: ${totalActivityMinutes} minutes sur les 15 derniers jours.`, margin, y);
        y += 6;
      }
      
      const uniqueMeds = Array.from(new Set(medLogs.map(m => m.medicationName).filter(Boolean)));
      if (uniqueMeds.length > 0) {
        doc.text(`• Médicaments enregistrés: ${uniqueMeds.join(', ')}`, margin, y);
        y += 6;
      }
      y += 5;
    }

    // --- Data Table ---
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('JOURNAL COMPLET DES ACTIVITÉS', margin, y);
    y += 7;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, 170, 10, 'F');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Date & Heure', margin + 5, y + 7);
    doc.text('Type / Contexte', margin + 45, y + 7);
    doc.text('Valeur', margin + 90, y + 7);
    doc.text('Notes', margin + 120, y + 7);
    y += 10;

    doc.setFont('helvetica', 'normal');
    filteredLogs.sort((a, b) => {
      const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    }).slice(0, 40).forEach((log, index) => {
      if (index % 2 === 0) doc.setFillColor(252, 253, 254);
      else doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, 170, 10, 'F');
      
      const dateStr = log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : new Date(log.timestamp).toLocaleString('fr-FR');
      
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(dateStr, margin + 5, y + 7);
      
      let context = '';
      if (log.type === 'glucose' || log.type === 'food') {
        const timeLabel = log.mealTime === 'before' ? 'Avant' : 'Après';
        const typeLabel = log.mealType === 'breakfast' ? 'P.déj' : log.mealType === 'lunch' ? 'Déj' : log.mealType === 'dinner' ? 'Dîner' : 'Coll.';
        context = log.mealType ? ` (${timeLabel} ${typeLabel})` : '';
      }

      const typeLabels: any = {
        glucose: 'Glycémie',
        medication: log.medicationName || 'Médicament',
        food: 'Repas / Glucides',
        activity: 'Activité Phys.',
        weight: 'Poids'
      };
      
      doc.text(`${typeLabels[log.type] || log.type}${context}`, margin + 45, y + 7);
      
      // Color Logic for Glucose
      if (log.type === 'glucose') {
        if (log.value < targetMin) doc.setTextColor(220, 38, 38); // Red for Hypo
        else if (log.value > targetMax) doc.setTextColor(234, 88, 12); // Orange for Hyper
        else doc.setTextColor(21, 128, 61); // Green for Range
      } else {
        doc.setTextColor(30, 41, 59);
      }

      doc.setFont('helvetica', 'bold');
      const units: any = {
        glucose: 'mg/dL',
        activity: 'min',
        food: 'g',
        weight: 'kg',
        medication: 'U'
      };
      doc.text(`${log.value} ${units[log.type] || ''}`, margin + 90, y + 7);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(log.notes || '-', margin + 120, y + 7, { maxWidth: 45 });
      
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // --- Disclaimer & Signature ---
    y += 20;
    if (y > 250) { doc.addPage(); y = 20; }
    
    doc.setDrawColor(200);
    doc.line(margin, y, 190, y);
    y += 10;
    
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("AVERTISSEMENT : Ce document est un outil d'accompagnement. Les estimations (HbA1c, prédictions) ne remplacent pas une analyse de laboratoire réelle. Consultez votre médecin pour toute modification de votre traitement.", margin, y, { maxWidth: 120 });
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Cachet / Signature du Médecin :", 130, y);
    doc.rect(130, y + 3, 60, 20); // Box for signature

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} sur ${pageCount} - Rapport MiraDiaLife confidentiel`, margin, 285);
    }

    return doc;
  };

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      const doc = await generatePDFInternal();
      doc.save(`rapport-diacare-${profile.name || 'patient'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const sharePDF = async () => {
    if (!navigator.share) {
      alert("La fonction de partage n'est pas supportée par votre navigateur.");
      return;
    }

    setIsGenerating(true);
    try {
      const doc = await generatePDFInternal();
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `rapport-diacare-${profile.name || 'patient'}.pdf`, { type: 'application/pdf' });

      await navigator.share({
        files: [file],
        title: 'Rapport de Santé - MiraDiaLife',
        text: `Voici mon rapport de santé des 15 derniers jours généré par Diagnostic Expert.`
      });
    } catch (err) {
      console.error('Error sharing PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Rapport de Santé</h3>
            <p className="text-xs text-slate-500">Générez un résumé PDF pour votre médecin</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={downloadPDF} 
            disabled={isGenerating}
            size="sm"
            className="gap-2"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            PDF
          </Button>
          <Button 
            onClick={sharePDF} 
            disabled={isGenerating}
            size="sm"
            className="gap-2 bg-blue-600 text-white"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            Partager
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 italic">
        * Ce rapport inclut vos données de glycémie, médicaments et poids des 15 derniers jours.
      </p>
    </div>
  );
};
