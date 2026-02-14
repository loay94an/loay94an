
import React, { useState } from 'react';
import { OrderDetails, Order, BrandingSettings, GarmentStyle } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FullPatternService } from '../FullPatternService';
import { TRANSLATIONS, INITIAL_STYLES } from '../constants';

interface Props {
  orderDetails: OrderDetails;
  onConfirm: (order: Order) => void;
  onNext: () => void; 
  onBackToHub: () => void; 
  branding: BrandingSettings; 
  language: 'ar' | 'en';
}

export const Checkout: React.FC<Props> = ({ orderDetails, onConfirm, onNext, onBackToHub, branding, language }) => {
  const txt = TRANSLATIONS[language];
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to get bilingual style name
  const getStyleName = () => {
    if (!orderDetails.style) return "Style Not Selected / موديل غير محدد";
    const styleObj = INITIAL_STYLES.find(s => s.id === orderDetails.style);
    const arName = styleObj?.label || orderDetails.style;
    const enName = orderDetails.style.replace(/_/g, ' ');
    return `${enName} / ${arName}`;
  };

  const garmentStyleString = getStyleName();

  // Helper: Load Image
  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => resolve(''); 
    });
  };

  // Helper: SVG to Image
  const svgPathToImage = (pathD: string, color: string): Promise<string> => {
    return new Promise((resolve) => {
        const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 400 800" width="400" height="800">
            <style>path { fill: none; stroke: ${color}; stroke-width: 4; }</style>
            <path d="${pathD}" />
        </svg>`;
        
        const img = new Image();
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 400;
            canvas.height = 800;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            } else {
                resolve('');
            }
            URL.revokeObjectURL(url);
        };
        img.src = url;
    });
  };

  // Helper: Convert ArrayBuffer to Base64 for Font
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    const doc = new jsPDF();
    let fontLoaded = false;

    // --- CRITICAL: Load Arabic Font ---
    try {
        // Fetch Tajawal font from GitHub Raw (Stable TTF)
        const fontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf";
        const response = await fetch(fontUrl);
        if (!response.ok) throw new Error("Failed to fetch font");
        const buffer = await response.arrayBuffer();
        const fontBase64 = arrayBufferToBase64(buffer);
        
        doc.addFileToVFS("Tajawal-Regular.ttf", fontBase64);
        doc.addFont("Tajawal-Regular.ttf", "Tajawal", "normal");
        doc.setFont("Tajawal", "normal");
        fontLoaded = true;
    } catch (error) {
        console.error("Could not load Arabic font, text might be garbled.", error);
        // Fallback to standard font
        doc.setFont("helvetica", "normal");
    }
    // -----------------------------------
    
    // --- 1. HEADER ---
    doc.setFillColor(248, 250, 252); 
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(branding.primaryColor);
    doc.text(branding.companyName, 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text("Technical Design Sheet / البطاقة الفنية للتصميم", 105, 32, { align: 'center' });

    let y = 50;

    // --- 2. DETAILS GRID ---
    doc.setFontSize(10);
    doc.setTextColor(0);

    const styleObj = INITIAL_STYLES.find(s => s.id === orderDetails.style);
    
    const details = [
        { label: "Style / الموديل", value: getStyleName() },
        { label: "Fabric / القماش", value: `${orderDetails.fabric?.name || 'Unknown'} (${orderDetails.fabric?.material || ''})` },
        { label: "Color / اللون", value: `${orderDetails.color?.name || 'Unknown'} (${orderDetails.color?.hex || ''})` },
        { label: "Pattern / النقشة", value: `${orderDetails.pattern?.name || 'Unknown'}` },
        { label: "Gender / الفئة", value: `${orderDetails.gender || 'Unknown'}` }
    ];

    details.forEach((item, i) => {
        const xPos = i % 2 === 0 ? 14 : 110;
        if (i % 2 === 0 && i !== 0) y += 12;
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(item.label, xPos, y);
        
        doc.setFontSize(11);
        doc.setTextColor(0);
        // Ensure text uses the Arabic font
        doc.text(item.value, xPos, y + 5);
    });

    y += 20;

    // --- 3. IMAGES SECTION ---
    doc.setDrawColor(200);
    doc.line(14, y, 196, y); 
    y += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(branding.primaryColor);
    doc.text("Design Visuals / المعاينة البصرية", 105, y, { align: 'center' });
    y += 10;

    const imgY = y;
    const imgHeight = 60;
    const imgWidth = 50;

    // A. Load Model Image
    if (styleObj?.image) {
        try {
            const modelImgData = await loadImage(styleObj.image);
            if (modelImgData) {
                doc.addImage(modelImgData, 'JPEG', 20, imgY, imgWidth, imgHeight);
                doc.setFontSize(8);
                doc.text("Model Image", 45, imgY + imgHeight + 5, { align: 'center' });
            }
        } catch (e) { console.error("Model img error", e); }
    }

    // B. Load Pattern Image
    let patternPath = "";
    if (orderDetails.style === GarmentStyle.PANTS) {
        patternPath = FullPatternService.generatePants(orderDetails.gender, true, orderDetails.measurements, 2.5, 2.0);
    } else if (orderDetails.style === GarmentStyle.SKIRT || orderDetails.style === GarmentStyle.PLEATED_SKIRT) {
        patternPath = FullPatternService.generateSkirt(true, orderDetails.measurements, 2.5, 2.0, orderDetails.style);
    } else {
        patternPath = FullPatternService.generateBodice(orderDetails.gender, true, orderDetails.measurements, 2.5, 2.0, orderDetails.style || GarmentStyle.SHIRT);
    }

    try {
        const patternImgData = await svgPathToImage(patternPath, branding.primaryColor);
        if (patternImgData) {
            doc.addImage(patternImgData, 'PNG', 85, imgY, 40, imgHeight); 
            doc.setFontSize(8);
            doc.text("Pattern Blueprint", 105, imgY + imgHeight + 5, { align: 'center' });
        }
    } catch (e) { console.error("Pattern img error", e); }

    // C. Load Fabric Image
    if (orderDetails.fabric?.image) {
        try {
            const fabricImgData = await loadImage(orderDetails.fabric.image);
            if (fabricImgData) {
                doc.addImage(fabricImgData, 'JPEG', 140, imgY, imgWidth, imgHeight);
                doc.setFontSize(8);
                doc.text("Fabric Texture", 165, imgY + imgHeight + 5, { align: 'center' });
            }
        } catch (e) { console.error("Fabric img error", e); }
    }

    // D. Load Client Attached Image (If exists)
    if (orderDetails.clientPhotoUrl) {
       try {
           const clientImgData = await loadImage(orderDetails.clientPhotoUrl);
           if (clientImgData) {
               // Render it below or alongside if space permits
               doc.addImage(clientImgData, 'JPEG', 140, imgY + imgHeight + 15, 40, 40);
               doc.text("Client Attachment", 160, imgY + imgHeight + 60, { align: 'center' });
           }
       } catch (e) { console.error("Client img error", e); }
    }

    y = imgY + imgHeight + 20;

    // --- 4. MEASUREMENTS TABLE ---
    const measurementLabels: Record<string, string> = {
        height: "Total Height / الطول الكلي",
        chest: "Chest / محيط الصدر",
        waist: "Waist / محيط الخصر",
        hips: "Hips / محيط الورك",
        shoulderWidth: "Shoulder / عرض الكتف",
        armLength: "Arm Length / طول الكم",
        neckCircumference: "Neck / محيط الرقبة",
        backWidth: "Back Width / عرض الظهر",
        waistToFloor: "Waist to Floor / طول الساق"
    };

    const measurementsBody = Object.entries(orderDetails.measurements)
      .filter(([_, v]) => (v as number) > 0)
      .map(([k, v]) => [measurementLabels[k] || k, `${v} cm`]);

    // Check if autoTable exists on doc (it's added via import 'jspdf-autotable')
    if ((doc as any).autoTable) {
        (doc as any).autoTable({
            startY: y,
            head: [['Measurement (EN/AR)', 'Value / القيمة']],
            body: measurementsBody,
            theme: 'grid',
            styles: { font: fontLoaded ? 'Tajawal' : 'helvetica', halign: 'center', fontStyle: 'normal' }, 
            headStyles: { fillColor: branding.primaryColor, halign: 'center', font: fontLoaded ? 'Tajawal' : 'helvetica' },
            columnStyles: { 0: { halign: 'left' } } 
        });
    }

    doc.save(`Technical_Sheet_${orderDetails.style || 'Custom'}_${Date.now()}.pdf`);
    setIsGenerating(false);
  };

  const generateExcel = () => {
    const rows = [
      ["Design Details", ""],
      ["Model", garmentStyleString],
      ["Fabric", orderDetails.fabric?.name || ''],
      ["Color", orderDetails.color?.name || ''],
      [],
      ["Measurements", "Value (cm)"],
      ...Object.entries(orderDetails.measurements).map(([k, v]) => [k, v])
    ];

    const csvContent = "data:text/csv;charset=utf-8,%EF%BB%BF" // UTF-8 BOM
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "measurements_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePatternSVG = () => {
    const isBottom = orderDetails.style === GarmentStyle.PANTS || orderDetails.style === GarmentStyle.PALAZZO_PANTS || orderDetails.style === GarmentStyle.SKIRT || orderDetails.style === GarmentStyle.PLEATED_SKIRT;
    const scale = 2.0;
    const ease = 2.5;

    let parts = [];

    if (isBottom) {
       const frontPath = orderDetails.style === GarmentStyle.SKIRT || orderDetails.style === GarmentStyle.PLEATED_SKIRT
            ? FullPatternService.generateSkirt(true, orderDetails.measurements, ease, scale, orderDetails.style)
            : FullPatternService.generatePants(orderDetails.gender, true, orderDetails.measurements, ease, scale, orderDetails.style);
       
       const backPath = orderDetails.style === GarmentStyle.SKIRT || orderDetails.style === GarmentStyle.PLEATED_SKIRT
            ? FullPatternService.generateSkirt(false, orderDetails.measurements, ease, scale, orderDetails.style)
            : FullPatternService.generatePants(orderDetails.gender, false, orderDetails.measurements, ease, scale, orderDetails.style);

       parts.push({ name: "FRONT", path: frontPath, x: 50, y: 50 });
       parts.push({ name: "BACK", path: backPath, x: 600, y: 50 });
    } else {
       const frontPath = FullPatternService.generateBodice(orderDetails.gender, true, orderDetails.measurements, ease, scale, orderDetails.style || GarmentStyle.SHIRT);
       const backPath = FullPatternService.generateBodice(orderDetails.gender, false, orderDetails.measurements, ease, scale, orderDetails.style || GarmentStyle.SHIRT);
       const sleevePath = FullPatternService.generateSleeve(orderDetails.sleeveType, orderDetails.measurements, scale);
       const collarPath = FullPatternService.generateCollar(orderDetails.collarType, orderDetails.measurements, scale);

       parts.push({ name: "FRONT BODICE", path: frontPath, x: 50, y: 50 });
       parts.push({ name: "BACK BODICE", path: backPath, x: 600, y: 50 });
       parts.push({ name: "SLEEVE", path: sleevePath, x: 1150, y: 50 });
       parts.push({ name: "COLLAR", path: collarPath, x: 50, y: 900 });
    }

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1500" width="2000" height="1500">
        <style>
           .cut-line { fill: none; stroke: ${branding.primaryColor}; stroke-width: 2; }
           .label { font-family: sans-serif; font-size: 20px; font-weight: bold; fill: #555; }
        </style>
        <rect width="100%" height="100%" fill="white" />
        <text x="50" y="30" font-family="sans-serif" font-size="24" fill="black">${branding.companyName} - ${garmentStyleString}</text>
        
        ${parts.map(part => `
            <g transform="translate(${part.x}, ${part.y})">
                <text x="0" y="-10" class="label">${part.name}</text>
                <path d="${part.path}" class="cut-line" />
            </g>
        `).join('')}
      </svg>
    `;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `full_pattern_${orderDetails.style || 'design'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 relative pt-12">
      <button 
        onClick={onBackToHub} 
        className="absolute top-0 right-0 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg group"
        title={txt.backToHome}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>

      <div className="text-center space-y-4">
        <h2 className="text-3xl font-black text-white">{txt.exportTitle}</h2>
        <p className="text-slate-400">{txt.exportDesc}</p>
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-12 border border-white/5 shadow-2xl">
         <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-800/40 rounded-3xl border border-white/5 mb-10">
             <div className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center text-5xl border border-white/5 shadow-inner">
                📝
             </div>
             <div className="flex-1 text-center md:text-right">
                <h4 className="text-xl font-black text-white mb-1">{garmentStyleString}</h4>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                   <span>{orderDetails.fabric?.name || 'No Fabric'}</span>
                   <span>•</span>
                   <span>{orderDetails.measurements.height} CM</span>
                </div>
             </div>
             
             {/* Show attached photo if exists */}
             {orderDetails.clientPhotoUrl && (
                 <div className="relative group">
                     <img src={orderDetails.clientPhotoUrl} alt="Attached" className="w-24 h-24 object-cover rounded-2xl border border-white/10" />
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[10px] font-bold text-white">📷 مرفق</span>
                     </div>
                 </div>
             )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ExportCard 
               title={txt.pdfExport} 
               desc="Bilingual PDF with Images" 
               icon={isGenerating ? "⏳" : "📄"} 
               color="bg-red-500"
               onClick={generatePDF}
               downloadText={isGenerating ? "Processing..." : txt.downloadNow}
               disabled={isGenerating}
            />
            <ExportCard 
               title={txt.excelExport} 
               desc="Data Sheet (CSV)" 
               icon="📊" 
               color="bg-emerald-500"
               onClick={generateExcel}
               downloadText={txt.downloadNow}
            />
            <ExportCard 
               title={txt.svgExport} 
               desc="Full Pattern Marker (All Parts)" 
               icon="✂️" 
               color="bg-primary"
               onClick={generatePatternSVG}
               downloadText={txt.downloadNow}
            />
         </div>

         <div className="mt-12 pt-8 border-t border-white/5 text-center">
             <button 
               onClick={onNext}
               className="bg-primary text-white px-12 py-4 rounded-2xl font-black hover:bg-blue-600 transition-all border border-white/10 shadow-2xl flex items-center gap-3 mx-auto"
             >
               <span>{txt.proceedToPayment}</span>
               <span>{language === 'ar' ? '←' : '→'}</span>
             </button>
         </div>
      </div>
    </div>
  );
};

const ExportCard = ({ title, desc, icon, color, onClick, downloadText, disabled }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`bg-slate-800/50 p-6 rounded-3xl border border-white/5 text-right hover:bg-slate-800 transition-all hover:border-white/20 group flex flex-col h-full ${disabled ? 'opacity-50 cursor-wait' : ''}`}
  >
    <div className={`w-14 h-14 rounded-2xl ${color} text-white flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
       {icon}
    </div>
    <h3 className="text-lg font-black text-white mb-2">{title}</h3>
    <p className="text-slate-500 text-xs font-medium leading-relaxed">{desc}</p>
    <div className="mt-auto pt-4 flex items-center text-primary text-xs font-black gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
       <span>{downloadText}</span>
       <span>↓</span>
    </div>
  </button>
);
