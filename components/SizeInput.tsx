
import React, { useState, useRef, useMemo } from 'react';
import { Measurements, MeasurementProfile, BrandingSettings, Gender, Fabric, FabricColor, GarmentStyle, PatternDesign, StyleItem } from '../types';
import { STANDARD_SIZES, CHILDREN_SIZES, TRANSLATIONS } from '../constants';
import { FullPatternService } from '../FullPatternService';

interface Props {
  userId: string;
  value: Measurements;
  onChange: (m: Measurements) => void;
  gender: Gender | null;
  
  // Data Lists (Only needed for visualizer context if available)
  savedProfiles: MeasurementProfile[];
  onSaveProfile: (name: string, m: Measurements) => void;
  onDeleteProfile: (id: string) => void;
  onSelectProfile: (m: Measurements) => void;
  branding?: BrandingSettings;
  onBackToHub: () => void; 
  language: 'ar' | 'en';
  onImageChange: (url: string | null) => void;
  // Props kept for visualizer compatibility, though selection happens in later steps
  style: GarmentStyle | null;
  fabric: Fabric | null;
  color: FabricColor | null;
  pattern: PatternDesign | null;
}

export const SizeInput: React.FC<Props> = ({ 
  userId, value, onChange, 
  gender,
  savedProfiles, onSaveProfile, onDeleteProfile, onSelectProfile, 
  branding, onBackToHub, language, onImageChange,
  style, fabric, color, pattern
}) => {
  // Mode: Detailed (Manual Input), Standard (S/M/L), Profiles (Saved)
  const [sizingMode, setSizingMode] = useState<'detailed' | 'standard' | 'profiles'>('standard');
  const [activeGroup, setActiveGroup] = useState<'upper' | 'middle' | 'lower'>('upper');
  
  // UI State
  const [profileName, setProfileName] = useState("");
  const [zoom, setZoom] = useState(0.8); // Zoomed out slightly to see full body
  const [pan, setPan] = useState({ x: 0, y: 50 });
  const svgRef = useRef<SVGSVGElement>(null);

  const txt = TRANSLATIONS[language];

  // Input Fields Configuration
  const INPUT_GROUPS = [
    {
      id: 'upper',
      titleAr: 'أعلى الجسم',
      titleEn: 'Upper Body',
      fields: [
        { key: 'chest', labelAr: 'محيط الصدر', labelEn: 'Chest' },
        { key: 'neckCircumference', labelAr: 'محيط الرقبة', labelEn: 'Neck Circumference' },
        { key: 'shoulderWidth', labelAr: 'عرض الكتف', labelEn: 'Shoulder Width' },
        { key: 'armLength', labelAr: 'طول الكم', labelEn: 'Arm Length' },
        { key: 'backLength', labelAr: 'طول الظهر', labelEn: 'Back Length' },
        { key: 'bodiceLength', labelAr: 'طول الصدر', labelEn: 'Bodice Length' },
      ]
    },
    {
      id: 'middle',
      titleAr: 'الوسط',
      titleEn: 'Middle Body',
      fields: [
        { key: 'waist', labelAr: 'محيط الخصر', labelEn: 'Waist' },
        { key: 'waistToHip', labelAr: 'من الخصر للورك', labelEn: 'Waist to Hip' },
        { key: 'armholeCircumference', labelAr: 'محيط الإبط', labelEn: 'Armhole' }
      ]
    },
    {
      id: 'lower',
      titleAr: 'الأسفل',
      titleEn: 'Lower Body',
      fields: [
        { key: 'hips', labelAr: 'محيط الورك', labelEn: 'Hips' },
        { key: 'waistToFloor', labelAr: 'طول الساق (للأرض)', labelEn: 'Waist to Floor' },
        { key: 'skirtLength', labelAr: 'طول التنورة/البنطلون', labelEn: 'Length' }
      ]
    }
  ];

  const handleFieldChange = (field: string, val: number) => {
    onChange({ ...value, [field]: val });
  };

  const handleReset = () => {
      onChange(STANDARD_SIZES['M']);
      setZoom(0.8);
      setPan({ x: 0, y: 50 });
  };

  // Generate the Pattern Data based on measurements
  const patternData = useMemo(() => {
    // Generate a basic block if no style is selected yet
    return FullPatternService.generateMasterBlock(gender || Gender.FEMALE, value);
  }, [value, gender]);

  const activeSizes = gender === Gender.CHILDREN ? CHILDREN_SIZES : STANDARD_SIZES;

  return (
    <div className="w-full max-w-[95rem] mx-auto space-y-6 sm:space-y-10 animate-in fade-in duration-1000 pb-20 relative pt-8">
      <button 
        onClick={onBackToHub} 
        className="absolute top-0 right-0 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg group"
        title={txt.backToHome}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>

      <div className="text-center mb-6">
         <h2 className="text-3xl font-black text-white">{txt.measurementsTitle}</h2>
         <p className="text-slate-400 text-sm mt-2">{txt.measurementsDesc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:h-[75vh] h-auto">
        
        {/* LEFT PANEL: INPUT CONTROLS */}
        <div className="lg:col-span-5 bg-slate-900 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col overflow-hidden h-[500px] lg:h-full">
             <div className="flex bg-slate-950 p-2 border-b border-white/5 shrink-0">
                <button onClick={() => setSizingMode('standard')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${sizingMode === 'standard' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}>{txt.standardSizes}</button>
                <button onClick={() => setSizingMode('detailed')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${sizingMode === 'detailed' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}>{language === 'ar' ? 'مقاسات مخصصة' : 'Custom Inputs'}</button>
                <button onClick={() => setSizingMode('profiles')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${sizingMode === 'profiles' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}>{txt.archives}</button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                
                {/* Standard Mode */}
                {sizingMode === 'standard' && (
                   <div className="space-y-3">
                      <p className="text-slate-500 text-xs text-center mb-4">{language === 'ar' ? 'اختر مقاساً جاهزاً للبدء، يمكنك تعديله لاحقاً.' : 'Select a standard size to start, you can edit it later.'}</p>
                      {Object.keys(activeSizes).map((size) => (
                        <button key={size} onClick={() => onChange(activeSizes[size])} className={`w-full py-5 rounded-2xl border transition-all flex items-center justify-between px-8 ${JSON.stringify(value) === JSON.stringify(activeSizes[size]) ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary' : 'border-white/5 bg-slate-800/40 text-slate-400 hover:bg-slate-800'}`}>
                          <span className="text-2xl font-black">{size}</span>
                          <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Base Pattern</span>
                        </button>
                      ))}
                   </div>
                )}

                {/* Detailed Mode */}
                {sizingMode === 'detailed' && (
                   <div className="space-y-6">
                      <div className="flex flex-wrap gap-2 justify-center bg-slate-950/50 p-2 rounded-xl">
                         {INPUT_GROUPS.map(grp => (
                           <button 
                             key={grp.id} 
                             onClick={() => setActiveGroup(grp.id as any)} 
                             className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${activeGroup === grp.id ? 'bg-white text-black border-white' : 'bg-transparent border-transparent text-slate-500 hover:text-white'}`}
                           >
                              {language === 'ar' ? grp.titleAr : grp.titleEn}
                           </button>
                         ))}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                         {INPUT_GROUPS.find(g => g.id === activeGroup)?.fields.map(field => (
                           <div key={field.key} className="flex justify-between items-center bg-slate-800 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                              <label className="text-sm text-slate-300 font-bold">{language === 'ar' ? field.labelAr : field.labelEn}</label>
                              <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={(value as any)[field.key] || ''} 
                                    onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value))}
                                    className="w-20 bg-slate-900 border border-white/10 rounded-xl p-2 text-center text-white text-sm font-bold focus:border-primary outline-none" 
                                />
                                <span className="text-xs text-slate-500 font-bold">cm</span>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                )}

                {/* Profiles Mode */}
                {sizingMode === 'profiles' && (
                   <div className="space-y-3">
                     {savedProfiles.map(p => (
                       <div key={p.id} className="p-4 bg-slate-800/40 rounded-xl border border-white/5 flex justify-between items-center hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => onChange(p.measurements)}>
                         <div>
                           <div className="font-bold text-white text-sm">{p.name}</div>
                           <div className="text-[10px] text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</div>
                         </div>
                         <div className="flex gap-2">
                           <button onClick={(e) => { e.stopPropagation(); onChange(p.measurements); }} className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-black">{txt.use}</button>
                           <button onClick={(e) => { e.stopPropagation(); onDeleteProfile(p.id); }} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs">🗑️</button>
                         </div>
                       </div>
                     ))}
                     {savedProfiles.length === 0 && <p className="text-center text-slate-500 text-xs py-10 opacity-50">{txt.noProfiles}</p>}
                   </div>
                )}
             </div>

             {/* Save Profile Footer */}
             {sizingMode === 'detailed' && (
                 <div className="p-4 border-t border-white/5 bg-slate-900 z-10 shrink-0">
                     <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder={txt.profileName} 
                          value={profileName} 
                          onChange={(e) => setProfileName(e.target.value)} 
                          className="flex-1 bg-slate-950 border border-white/10 p-3 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-500"
                        />
                        <button onClick={() => { if(profileName) { onSaveProfile(profileName, value); setProfileName(""); } }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg">{txt.saveMeasurements}</button>
                     </div>
                 </div>
             )}
        </div>

        {/* RIGHT PANEL: VISUALIZER (Master Block) */}
        <div className="lg:col-span-7 flex flex-col gap-4 lg:h-full h-[600px]">
           <div className="relative flex-1 bg-slate-950 rounded-[2.5rem] border-4 border-slate-900 overflow-hidden shadow-2xl group">
             
             {/* Visualizer Toolbar */}
             <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto flex flex-col gap-2">
                   <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="w-10 h-10 bg-slate-800 text-white rounded-xl shadow-lg border border-white/10 hover:bg-slate-700 font-bold">+</button>
                   <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="w-10 h-10 bg-slate-800 text-white rounded-xl shadow-lg border border-white/10 hover:bg-slate-700 font-bold">-</button>
                   <button onClick={handleReset} className="w-10 h-10 bg-red-500/20 text-red-500 rounded-xl shadow-lg border border-red-500/20 hover:bg-red-500 hover:text-white font-bold text-xs">R</button>
                </div>
                <div className="pointer-events-auto bg-slate-900/90 backdrop-blur px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                   <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{language === 'ar' ? 'البترون الأساسي' : 'Master Pattern Block'}</span>
                </div>
             </div>

             {/* SVG Canvas */}
             <div className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[length:20px_20px]" 
                  onMouseDown={(e) => {
                    const startX = e.clientX - pan.x;
                    const startY = e.clientY - pan.y;
                    const onMove = (mv: MouseEvent) => setPan({ x: mv.clientX - startX, y: mv.clientY - startY });
                    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
             >
                <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: 'transform 0.1s ease-out' }}>
                   <svg 
                      ref={svgRef}
                      width="500" 
                      height="800" 
                      viewBox={`-${patternData.width/2} -50 ${patternData.width} ${patternData.height}`} 
                      className="overflow-visible drop-shadow-2xl"
                   >
                      <defs>
                         <pattern id="gridPat" width="10" height="10" patternUnits="userSpaceOnUse">
                           <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                         </pattern>
                      </defs>
                      
                      <rect x="-1000" y="-1000" width="4000" height="4000" fill="url(#gridPat)" />

                      {/* 1. Dimensions (Blue) */}
                      {patternData.dimensions.map((line, i) => (
                        <g key={i}>
                           <line 
                             x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} 
                             stroke="#3b82f6" 
                             strokeWidth="1" 
                             strokeDasharray={line.isDimension ? "4,2" : "none"}
                             opacity="0.6"
                           />
                           <line 
                             x1={-line.x1} y1={line.y1} x2={-line.x2} y2={line.y2} 
                             stroke="#3b82f6" 
                             strokeWidth="1" 
                             strokeDasharray={line.isDimension ? "4,2" : "none"}
                             opacity="0.6"
                           />
                           {!line.isDimension && (
                             <text x={line.x2 + 10} y={line.y2} fontSize="8" fill="#3b82f6" alignmentBaseline="middle">{line.label}</text>
                           )}
                        </g>
                      ))}

                      {/* 2. Contour (Filled with selected fabric/color IF available, else generic) */}
                      <path d={patternData.contours} fill="rgba(255,255,255,0.05)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                      <path d={patternData.contours} fill="rgba(255,255,255,0.05)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scale(-1, 1)" opacity="0.9" />

                      {/* 3. Points (Red) */}
                      {patternData.points.map((pt, i) => (
                        <g key={i}>
                           <circle cx={pt.x} cy={pt.y} r="3" fill="#ef4444" stroke="white" strokeWidth="1" />
                           <circle cx={-pt.x} cy={pt.y} r="3" fill="#ef4444" stroke="white" strokeWidth="1" />
                        </g>
                      ))}
                      
                      {/* Center Line */}
                      <line x1="0" y1="0" x2="0" y2={patternData.height} stroke="white" strokeWidth="0.5" strokeDasharray="10,5" opacity="0.3" />

                   </svg>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
