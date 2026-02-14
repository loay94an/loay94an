
import React, { useState, useRef } from 'react';
import { Measurements, Fabric, GarmentStyle, FabricColor, PatternDesign, BrandingSettings } from '../types';

interface Props {
  style: GarmentStyle;
  measurements: Measurements;
  fabric: Fabric;
  color: FabricColor;
  pattern: PatternDesign;
  onBackToHub: () => void; // New prop
  branding: BrandingSettings; // New prop
}

export const Model3DPreview: React.FC<Props> = ({ style, measurements, fabric, color, pattern, onBackToHub, branding }) => {
  const [rotation, setRotation] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const startX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;
    setRotation(prev => prev + diff * 0.8);
    startX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => { startX.current = null; };

  const handleMouseDown = (e: React.MouseEvent) => { startX.current = e.clientX; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (startX.current === null) return;
    const diff = e.clientX - startX.current;
    setRotation(prev => prev + diff * 0.8);
    startX.current = e.clientX;
  };
  const handleMouseUp = () => { startX.current = null; };

  // حساب الحجم النسبي بناءً على ربع محيط الصدر والورك
  const scaleW = (measurements.chest / 96) * 1.0;
  const hipsWidth = (measurements.hips / 104) * 1.0;
  const scaleH = (measurements.height / 175) * 1.0;
  const drape = isSimulating ? (fabric.physics.mass * 8) : 0;

  const getGarmentPath = () => {
    const d = drape;
    const hW = hipsWidth * 40; // تحويل الحجم لمساحة الرسم
    const cW = scaleW * 30;
    const wW = (measurements.waist / 80) * 25;

    if (style === GarmentStyle.EVENING_GOWN || style === GarmentStyle.ABAYA || style === GarmentStyle.MERMAID_DRESS || style === GarmentStyle.WRAP_DRESS) {
      if (style === GarmentStyle.MERMAID_DRESS) {
        return `M35 15 Q50 10 65 15 L${50+cW} 40 L${50+wW/2} 85 Q${50+hW} 120 50 160 Q80 180 110 250 L-10 250 Q20 180 50 160 Z`;
      }
      return `M35 15 Q50 10 65 15 L80 40 L85 85 Q85 ${110+d} 90 ${135+d} L135 250 L-35 250 L10 ${135+d} Q15 ${110+d} 15 85 L20 40 Z`;
    }
    if (style === GarmentStyle.PANTS || style === GarmentStyle.PALAZZO_PANTS) {
      const legW = style === GarmentStyle.PALAZZO_PANTS ? 130 : 95;
      return `M35 15 Q50 10 65 15 L80 40 L85 85 L85 130 L${legW} 250 L55 250 L50 150 L45 250 L${100-legW} 250 L15 130 L15 85 L20 40 Z`;
    }
    if (style === GarmentStyle.KIMONO_JACKET) {
       return `M20 15 Q50 10 80 15 L130 50 L120 90 L85 85 L85 150 L15 150 L15 85 L-20 90 L-30 50 Z`;
    }
    if (style === GarmentStyle.HOODIE) {
       return `M35 5 Q50 0 65 5 L85 30 L85 85 L90 140 L10 140 L15 85 L15 30 Z M35 5 Q50 -30 65 5`; // With Hood hint
    }
    if (style === GarmentStyle.JUMPSUIT) {
       return `M35 15 Q50 10 65 15 L80 40 L85 85 L90 140 L95 250 L55 250 L50 160 L45 250 L5 250 L10 140 L15 85 L20 40 Z`;
    }
    return `M35 15 Q50 10 65 15 L80 40 L85 85 Q85 ${110+d} 80 ${135+d} L105 180 L-5 180 L20 ${135+d} Q15 ${110+d} 15 85 L20 40 Z`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 relative pt-12">
      <button 
        onClick={onBackToHub} 
        className="absolute top-0 right-0 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg group"
        title="العودة للقائمة الرئيسية"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>

      <div 
        className="relative bg-slate-900 rounded-[4rem] h-[500px] lg:h-[720px] border-8 border-slate-800 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_60px_100px_rgba(0,0,0,0.6)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#334155_2px,transparent_2px)] bg-[length:50px_50px]"></div>
        
        <div className="absolute top-10 left-10 z-10 flex flex-col gap-4">
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-10 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl ${
                isSimulating ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 border border-white/5'
              }`}
            >
              {isSimulating ? 'محاكاة فيزيائية نشطة ✓' : 'تفعيل محاكاة سقوط النسيج'}
            </button>
        </div>

        <div 
          className="transition-transform duration-300 ease-out preserve-3d"
          style={{ transform: `rotateY(${rotation}deg)` }}
        >
          <svg width="450" height="600" viewBox="0 0 100 220" className="drop-shadow-[0_40px_100px_rgba(0,0,0,0.7)]">
            <defs>
              <pattern id="fabPatternDetail" width="15" height="15" patternUnits="userSpaceOnUse">
                <rect width="15" height="15" fill={color.hex} />
                <image href={pattern.preview} x="0" y="0" width="15" height="15" opacity="0.4" style={{ mixBlendMode: 'multiply' }} />
              </pattern>
              <linearGradient id="3dShade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(0,0,0,0.5)" />
                <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
              </linearGradient>
            </defs>
            
            <g style={{ transform: `scale(${scaleW}, ${scaleH})`, transformOrigin: 'center 40px' }} className="transition-all duration-1000 ease-in-out">
               <path d={getGarmentPath()} fill="url(#fabPatternDetail)" className="transition-all duration-700" />
               <path d={getGarmentPath()} fill="url(#3dShade)" opacity="0.3" />
            </g>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatsBox label="الوزن التقديري" val={`${(fabric.physics.mass * 0.65).toFixed(2)} كجم`} icon="⚖️" />
         <StatsBox label="انسيابية النسيج" val={fabric.thickness === 'thin' ? 'عالية جداً' : fabric.thickness === 'thick' ? 'منخفضة' : 'متوازنة'} icon="🌊" />
         <StatsBox label="تحليل البترون" val="هندسة الكتب الفنية 100%" icon="📐" />
      </div>
    </div>
  );
};

const StatsBox = ({ label, val, icon }: any) => (
  <div className="bg-slate-900/60 rounded-3xl p-8 border border-white/5 flex items-center justify-between group hover:border-primary/40 transition-all shadow-xl">
    <div className="text-right">
      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</h5>
      <div className="text-2xl font-black text-white">{val}</div>
    </div>
    <div className="text-3xl opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all">{icon}</div>
  </div>
);
