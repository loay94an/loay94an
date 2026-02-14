
import React, { useState, useRef, useEffect } from 'react';
import { Measurements, Gender, GarmentStyle, SleeveType, CollarType, BrandingSettings } from '../types';
import { FullPatternService } from '../FullPatternService';
import { TRANSLATIONS } from '../constants';
import jsPDF from 'jspdf';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Props {
  gender: Gender;
  style: GarmentStyle;
  measurements: Measurements;
  onUpdate: (m: Measurements) => void;
  branding?: BrandingSettings;
  onBackToHub: () => void; 
  language: 'ar' | 'en';
  onImageChange?: (url: string | null) => void;
}

export const PatternEditor: React.FC<Props> = ({ gender, style, measurements, onUpdate, branding: propBranding, onBackToHub, language, onImageChange }) => {
  const [seamAllowance, setSeamAllowance] = useState(1.5);
  const [ease, setEase] = useState(2.5);
  const [activeSleeve, setActiveSleeve] = useState<SleeveType>(SleeveType.BASIC);
  const [activeCollar, setActiveCollar] = useState<CollarType>(CollarType.MANDARIN);
  const [zoom, setZoom] = useState(0.85);
  const [view, setView] = useState<'front' | 'back' | 'sleeve' | 'collar'>('front');
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444'); // Red default
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Image Upload State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const txt = TRANSLATIONS[language];
  
  const branding = propBranding || {
    companyName: "الخياط الذكي برو",
    logoUrl: "",
    primaryColor: "#2563eb",
    logoPosition: "top-right"
  };

  const scale = 2.0;

  // Clear canvas when view changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [view, style]);

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2 / zoom;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    // CRITICAL: Check for Firebase Storage availability before proceeding.
    if (!storage) {
      alert("رفع الصور غير متاح. التطبيق يعمل في وضع عدم الاتصال أو أن إعدادات التخزين السحابي غير مكتملة.");
      e.target.value = ''; // Reset the file input to prevent confusion
      return;
    }

    const file = e.target.files[0];
    setIsUploading(true);

    try {
        const storageRef = ref(storage, `client_uploads/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        setUploadedImage(downloadURL);
        if (onImageChange) onImageChange(downloadURL);
        
    } catch (error) {
        console.error("Upload failed", error);
        alert("فشل رفع الصورة. يرجى التحقق من الاتصال بالإنترنت.");
        e.target.value = ''; // Reset file input on failure
    } finally {
        setIsUploading(false);
    }
  };

  const getPatternPath = () => {
    if (view === 'collar') return FullPatternService.generateCollar(activeCollar, measurements, scale);
    if (view === 'sleeve') return FullPatternService.generateSleeve(activeSleeve, measurements, scale);
    if (style === GarmentStyle.PANTS || style === GarmentStyle.PALAZZO_PANTS) return FullPatternService.generatePants(gender, view === 'front', measurements, ease, scale, style);
    if (style === GarmentStyle.SKIRT || style === GarmentStyle.PLEATED_SKIRT) return FullPatternService.generateSkirt(view === 'front', measurements, ease, scale, style);
    
    const safeStyle = style || GarmentStyle.SHIRT; 
    return FullPatternService.generateBodice(gender, view === 'front', measurements, ease, scale, safeStyle);
  };

  const handleManualAdjustment = (field: keyof Measurements, delta: number) => {
    onUpdate({ ...measurements, [field]: Math.max(0, ((measurements[field] as number) || 0) + delta) });
  };

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setTextColor(branding.primaryColor);
    doc.setFontSize(24);
    doc.text(branding.companyName, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    
    const styleName = style ? style.replace('_', ' ') : 'غير محدد';
    doc.text(`Pattern: ${styleName} - ${view}`, 20, 40);
    
    doc.setFontSize(10);
    doc.text("Technical Measurements:", 20, 55);
    const mEntries = Object.entries(measurements).filter(([_, v]) => typeof v === 'number' && (v as number) > 0);
    mEntries.forEach(([k, v], i) => {
      doc.text(`${k}: ${v}cm`, 20, 65 + (i * 5));
    });

    doc.save(`smart_tailor_pattern_${style || 'draft'}.pdf`);
  };

  const exportSVG = () => {
    // Determine if it's a bottom or top garment
    const isBottom = style === GarmentStyle.PANTS || style === GarmentStyle.PALAZZO_PANTS || style === GarmentStyle.SKIRT || style === GarmentStyle.PLEATED_SKIRT;
    
    let parts = [];
    
    if (isBottom) {
       // Generate Front
       const frontPath = style === GarmentStyle.SKIRT || style === GarmentStyle.PLEATED_SKIRT 
            ? FullPatternService.generateSkirt(true, measurements, ease, scale, style)
            : FullPatternService.generatePants(gender, true, measurements, ease, scale, style);
       
       // Generate Back
       const backPath = style === GarmentStyle.SKIRT || style === GarmentStyle.PLEATED_SKIRT
            ? FullPatternService.generateSkirt(false, measurements, ease, scale, style)
            : FullPatternService.generatePants(gender, false, measurements, ease, scale, style);

       parts.push({ name: "FRONT / الأمام", path: frontPath, x: 50, y: 50 });
       parts.push({ name: "BACK / الخلف", path: backPath, x: 600, y: 50 });

    } else {
       // TOP GARMENTS (Bodice, Sleeve, Collar)
       const frontPath = FullPatternService.generateBodice(gender, true, measurements, ease, scale, style || GarmentStyle.SHIRT);
       const backPath = FullPatternService.generateBodice(gender, false, measurements, ease, scale, style || GarmentStyle.SHIRT);
       const sleevePath = FullPatternService.generateSleeve(activeSleeve, measurements, scale);
       const collarPath = FullPatternService.generateCollar(activeCollar, measurements, scale);

       parts.push({ name: "FRONT BODICE / الأمام", path: frontPath, x: 50, y: 50 });
       parts.push({ name: "BACK BODICE / الخلف", path: backPath, x: 600, y: 50 });
       parts.push({ name: "SLEEVE / الكم (Cut 2)", path: sleevePath, x: 1150, y: 50 });
       parts.push({ name: "COLLAR / الياقة", path: collarPath, x: 50, y: 900 });
    }

    // Construct the composite SVG
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1500" width="2000" height="1500">
        <defs>
            <style>
                .cut-line { fill: none; stroke: ${branding.primaryColor}; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
                .label { font-family: sans-serif; font-size: 24px; font-weight: bold; fill: #334155; }
                .grid { fill: url(#gridPattern); }
            </style>
            <pattern id="gridPattern" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#f1f5f9" stroke-width="2"/>
            </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="white" />
        <rect width="100%" height="100%" class="grid" />

        <!-- Header -->
        <text x="50" y="40" font-family="sans-serif" font-size="30" fill="#0f172a">${branding.companyName} - Pattern Marker</text>
        <text x="50" y="80" font-family="sans-serif" font-size="20" fill="#64748b">Style: ${style || 'Custom'} | Size Ref: Chest ${measurements.chest}</text>

        <!-- Parts -->
        ${parts.map(part => `
            <g transform="translate(${part.x}, ${part.y})">
                <text x="0" y="-15" class="label">${part.name}</text>
                <path d="${part.path}" class="cut-line" />
            </g>
        `).join('')}
      </svg>
    `;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `full_pattern_marker_${style || 'design'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to render measurement lines
  const DimensionLine = ({ x1, y1, x2, y2, label, vertical = false }: any) => {
    if (!showDimensions) return null;
    return (
        <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={branding.primaryColor} strokeWidth="1" strokeDasharray="4,2" opacity="0.6" />
            <path d={`M${x1} ${y1} L${vertical ? x1-3 : x1-3} ${vertical ? y1+3 : y1-3} M${x1} ${y1} L${vertical ? x1+3 : x1-3} ${vertical ? y1-3 : y1+3}`} stroke={branding.primaryColor} strokeWidth="1" />
            <path d={`M${x2} ${y2} L${vertical ? x2-3 : x2+3} ${vertical ? y2+3 : y2-3} M${x2} ${y2} L${vertical ? x2+3 : x2+3} ${vertical ? y2-3 : y2+3}`} stroke={branding.primaryColor} strokeWidth="1" />
            <rect 
                x={(x1+x2)/2 - 15} 
                y={(y1+y2)/2 - 8} 
                width="30" 
                height="16" 
                rx="4" 
                fill="#0f172a" 
                stroke={branding.primaryColor} 
                strokeWidth="0.5" 
            />
            <text 
                x={(x1+x2)/2} 
                y={(y1+y2)/2 + 3} 
                fill="white" 
                fontSize="8" 
                fontWeight="bold" 
                textAnchor="middle"
            >
                {label}
            </text>
        </g>
    );
  };

  const renderDimensions = () => {
    // Calculate approximate positions based on logic in FullPatternService
    const pieceLength = (style === GarmentStyle.ABAYA || style === GarmentStyle.JUMPSUIT) 
        ? measurements.height * 0.96 
        : (style === GarmentStyle.SHIRT ? measurements.height * 0.45 : 60);

    const waistY = (measurements.backLength || 44) * scale;
    const hipY = (waistY + (measurements.waistToHip || 20) * scale);
    const hemY = pieceLength * scale;
    const widthX = (measurements.hips / 4 + ease / 4) * scale;

    if (view === 'sleeve') {
        const len = measurements.armLength * scale;
        const bicep = (measurements.armCircumference || 35) * scale;
        return (
            <>
                <DimensionLine x1={-20} y1={0} x2={-20} y2={len} label={`${measurements.armLength}cm`} vertical />
                <DimensionLine x1={0} y1={len + 20} x2={bicep} y2={len + 20} label={`W:${Math.round(bicep/scale)}cm`} />
            </>
        );
    }
    
    if (view === 'collar') return null;

    if (style === GarmentStyle.PANTS || style === GarmentStyle.PALAZZO_PANTS) {
        const len = (measurements.waistToFloor || 100) * scale;
        return (
             <>
                <DimensionLine x1={-30} y1={0} x2={-30} y2={len} label={`${measurements.waistToFloor}cm`} vertical />
                <DimensionLine x1={0} y1={-20} x2={(measurements.waist/4)*scale} y2={-20} label="Waist" />
                <DimensionLine x1={0} y1={len + 20} x2={(measurements.hips/4)*scale} y2={len + 20} label="Hem" />
             </>
        );
    }

    return (
        <>
            <DimensionLine x1={-20} y1={0} x2={-20} y2={hemY} label={`${Math.round(pieceLength)}cm`} vertical />
            <DimensionLine x1={widthX + 20} y1={0} x2={widthX + 20} y2={waistY} label="Waist Level" vertical />
            <DimensionLine x1={0} y1={hemY + 20} x2={widthX} y2={hemY + 20} label={`Hip Q:${Math.round(measurements.hips/4)}`} />
        </>
    );
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700 relative pt-12">
      <button 
        onClick={onBackToHub} 
        className="absolute top-0 right-0 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg group"
        title={txt.backToHome}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>

      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="flex bg-slate-900/60 p-2 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl overflow-x-auto no-scrollbar">
          <TabBtn active={view === 'front'} onClick={() => setView('front')} label={language === 'ar' ? "الأمام" : "Front"} />
          <TabBtn active={view === 'back'} onClick={() => setView('back')} label={language === 'ar' ? "الخلف" : "Back"} />
          <TabBtn active={view === 'sleeve'} onClick={() => setView('sleeve')} label={language === 'ar' ? "الأكمام" : "Sleeves"} />
          <TabBtn active={view === 'collar'} onClick={() => setView('collar')} label={language === 'ar' ? "الياقة" : "Collar"} />
        </div>

        <div className="relative bg-slate-950 rounded-[4rem] h-[600px] lg:h-[750px] border-4 border-slate-900 overflow-hidden flex items-center justify-center shadow-2xl group">
          
          {/* Controls Overlay */}
          <div className="absolute top-8 left-8 z-20 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={exportPDF} className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-xl transition-all flex items-center gap-2"><span>PDF</span> 📄</button>
             <button onClick={exportSVG} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-xl transition-all flex items-center gap-2" title="Export Full Pattern Marker"><span>All Parts SVG</span> ✂️</button>
             <button onClick={() => setShowGrid(!showGrid)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-xl transition-all">
                {showGrid ? 'Hide Grid #' : 'Show Grid #'}
             </button>
             <button onClick={() => setShowDimensions(!showDimensions)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-xl transition-all">
                {showDimensions ? 'Hide Dims 📏' : 'Show Dims 📏'}
             </button>
             <div className="h-px bg-white/20 my-2"></div>
             <button onClick={clearCanvas} className="bg-red-500/80 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-black text-xs shadow-xl transition-all">
                Clear Drawings 🧹
             </button>
             <div className="flex gap-2">
                {['#ef4444', '#3b82f6', '#10b981', '#ffffff'].map(c => (
                    <button 
                        key={c} 
                        onClick={() => setDrawColor(c)} 
                        className={`w-8 h-8 rounded-full border-2 ${drawColor === c ? 'border-white scale-110' : 'border-transparent'}`} 
                        style={{ backgroundColor: c }} 
                    />
                ))}
             </div>
          </div>

          <div className="relative w-full h-full overflow-hidden">
             {/* Canvas Layer for Drawing */}
             <canvas 
                ref={canvasRef}
                width={2000}
                height={1500}
                className="absolute inset-0 w-full h-full z-10 cursor-crosshair touch-none"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
             />

             {/* SVG Layer */}
             <div className="transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] w-full h-full flex items-center justify-center pointer-events-none" style={{ transform: `scale(${zoom})` }}>
                <svg ref={svgRef} width="100%" height="100%" viewBox="-100 -50 600 850" className="drop-shadow-[0_0_50px_rgba(37,99,235,0.1)]">
                    <defs>
                        <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
                        </pattern>
                        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                            <rect width="100" height="100" fill="url(#smallGrid)"/>
                            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                        </pattern>
                        <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                            <path d="M0,0 L10,5 L0,10" fill={branding.primaryColor} />
                        </marker>
                    </defs>

                    {/* Grid Background */}
                    {showGrid && <rect x="-500" y="-500" width="2000" height="2000" fill="url(#grid)" />}

                    {/* Pattern Path */}
                    <g transform="translate(50, 50)">
                        {/* Seam Allowance Ghost Line (Simulated) */}
                        <path 
                            d={getPatternPath()} 
                            fill="none" 
                            stroke="white" 
                            strokeWidth="1" 
                            strokeDasharray="5,5" 
                            opacity="0.3" 
                            transform="scale(1.02) translate(-2,-2)"
                        />
                        
                        {/* Main Cut Line */}
                        <path 
                            d={getPatternPath()} 
                            fill="rgba(37, 99, 235, 0.05)" 
                            stroke={branding.primaryColor} 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            vectorEffect="non-scaling-stroke"
                        />

                        {/* Grainline Arrow */}
                        {view !== 'collar' && (
                            <g transform="translate(40, 150)">
                                <line x1="0" y1="0" x2="0" y2="100" stroke="#f50057" strokeWidth="1.5" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                                <text x="5" y="50" fill="#f50057" fontSize="10" className="font-sans" style={{ writingMode: 'vertical-rl' }}>GRAINLINE / اتجاه النسيج</text>
                            </g>
                        )}

                        {/* Technical Stamp */}
                        <g transform="translate(10, 20)" opacity="0.8">
                            <rect x="0" y="0" width="120" height="50" fill="rgba(15, 23, 42, 0.9)" stroke="white" strokeWidth="0.5" rx="4" />
                            <text x="10" y="15" fill="white" fontSize="8" fontWeight="bold">STYLE: {style || 'CUSTOM'}</text>
                            <text x="10" y="28" fill="#94a3b8" fontSize="7">VIEW: {view.toUpperCase()}</text>
                            <text x="10" y="40" fill="#94a3b8" fontSize="7">SIZE: {measurements.chest}cm / Cut 1</text>
                        </g>

                        {/* Dynamic Dimensions */}
                        {renderDimensions()}
                    </g>
                </svg>
             </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-slate-900/80 backdrop-blur-3xl rounded-[3.5rem] p-6 sm:p-10 border border-white/5 shadow-2xl h-full flex flex-col">
          <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3">
             <span className="w-2 h-8 bg-primary rounded-full"></span>
             {language === 'ar' ? 'التعديلات والمرفقات' : 'Adjustments & Attachments'}
          </h3>
          
          <div className="space-y-8 flex-1 overflow-y-auto no-scrollbar pr-2">
            <div className="bg-slate-800/40 rounded-3xl p-6 border border-white/5 space-y-4">
              <AdjustmentItem label={language === 'ar' ? "محيط الصدر" : "Chest"} field="chest" value={measurements.chest} onAdjust={handleManualAdjustment} />
              <AdjustmentItem label={language === 'ar' ? "محيط الخصر" : "Waist"} field="waist" value={measurements.waist} onAdjust={handleManualAdjustment} />
              <AdjustmentItem label={language === 'ar' ? "محيط الورك" : "Hips"} field="hips" value={measurements.hips} onAdjust={handleManualAdjustment} />
              <AdjustmentItem label={language === 'ar' ? "عرض الكتف" : "Shoulder"} field="shoulderWidth" value={measurements.shoulderWidth} onAdjust={handleManualAdjustment} />
              <AdjustmentItem label={language === 'ar' ? "طول الكم" : "Arm Length"} field="armLength" value={measurements.armLength} onAdjust={handleManualAdjustment} />
            </div>
            
            <div className="pt-6 border-t border-white/10 space-y-8">
               
               {/* IMAGE UPLOAD SECTION */}
               <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl border border-white/10 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <span className="text-lg">📸</span> {language === 'ar' ? 'صورة العميل / الموديل' : 'Client/Model Photo'}
                      </h4>
                      {uploadedImage && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-md font-bold">✓ تم</span>}
                  </div>
                  
                  <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/50 transition-all bg-black/20">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                        disabled={isUploading}
                      />
                      
                      {uploadedImage ? (
                          <div className="relative">
                              <img src={uploadedImage} alt="Reference" className="w-full h-48 object-cover opacity-80 group-hover:opacity-40 transition-opacity" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                  <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg font-bold">تغيير الصورة</span>
                              </div>
                              <button 
                                onClick={(e) => { e.preventDefault(); setUploadedImage(null); if(onImageChange) onImageChange(null); }}
                                className="absolute top-2 right-2 z-30 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                              >
                                  ✕
                              </button>
                          </div>
                      ) : (
                          <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-400">
                              <span className="text-3xl">{isUploading ? '⏳' : '📥'}</span>
                              <span className="text-xs font-bold">{isUploading ? 'جاري الرفع...' : (language === 'ar' ? 'اضغط هنا لرفع صورة' : 'Click to upload')}</span>
                          </div>
                      )}
                  </div>
                  <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                      {language === 'ar' ? 'سيتم حفظ الصورة مع الطلب ليراها المصمم' : 'Image will be saved with the order for the designer to view'}
                  </p>
               </div>

               <RangeControl label={language === 'ar' ? "نسبة الراحة (Ease)" : "Ease"} value={ease} min={0} max={20} onChange={setEase} />
               <RangeControl label="Zoom" value={zoom} min={0.5} max={1.5} onChange={setZoom} />
               
               <div className="flex justify-between items-center bg-slate-800 p-4 rounded-2xl">
                 <span className="text-xs font-bold text-slate-400">{language === 'ar' ? 'مسافة الخياطة' : 'Seam Allowance'}</span>
                 <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{seamAllowance}cm</span>
                    <input type="range" min={0} max={5} step={0.5} value={seamAllowance} onChange={e => setSeamAllowance(parseFloat(e.target.value))} className="w-20 accent-primary" />
                 </div>
               </div>
               
               <div className="p-4 bg-slate-800 rounded-2xl text-xs text-slate-400 border border-white/5">
                   <p>💡 Tip: Use the mouse or touch to draw notes on the pattern canvas directly.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, label }: any) => (
  <button onClick={onClick} className={`flex-1 py-4 px-6 rounded-2xl text-[11px] font-black transition-all ${active ? 'bg-primary text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>{label}</button>
);

const AdjustmentItem = ({ label, field, value, onAdjust }: any) => (
  <div className="flex items-center justify-between group">
    <div className="text-right">
       <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">{label}</span>
       <span className="text-white font-black text-lg tracking-tighter">{value} <small className="text-[10px] opacity-40">cm</small></span>
    </div>
    <div className="flex gap-2">
       <button onClick={() => onAdjust(field, -1)} className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center border border-white/5 hover:bg-slate-700 transition-all active:scale-90">-</button>
       <button onClick={() => onAdjust(field, 1)} className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center border border-white/5 hover:bg-slate-700 transition-all active:scale-90">+</button>
    </div>
  </div>
);

const RangeControl = ({ label, value, min, max, onChange }: any) => (
  <div className="space-y-4">
    <div className="flex justify-between text-[11px] font-black text-slate-400">
      <span className="text-primary">{typeof value === 'number' ? value.toFixed(1) : value}</span>
      <span className="uppercase tracking-widest">{label}</span>
    </div>
    <input type="range" min={min} max={max} step={0.1} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-xl appearance-none cursor-pointer accent-primary" />
  </div>
);
