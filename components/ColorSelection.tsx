
import React, { useState } from 'react';
import { FabricColor, PatternDesign, BrandingSettings } from '../types';
import { PATTERNS, TRANSLATIONS } from '../constants';

interface Props {
  selectedColor: FabricColor | null;
  selectedPattern: PatternDesign | null;
  onSelectColor: (c: FabricColor) => void;
  onSelectPattern: (p: PatternDesign) => void;
  customColors: FabricColor[]; 
  onBackToHub: () => void; 
  branding: BrandingSettings; 
  language: 'ar' | 'en';
}

export const ColorSelection: React.FC<Props> = ({ selectedColor, selectedPattern, onSelectColor, onSelectPattern, customColors: colors, onBackToHub, branding, language }) => {
  const [activeCategory, setActiveCategory] = useState<FabricColor['category']>('BASIC');
  const txt = TRANSLATIONS[language];

  const categoryLabels: Record<FabricColor['category'], string> = {
    BASIC: language === 'ar' ? 'أساسية' : 'Basic',
    NEUTRAL: language === 'ar' ? 'محايدة' : 'Neutral',
    VIBRANT: language === 'ar' ? 'زاهية' : 'Vibrant',
    METALLIC: language === 'ar' ? 'معدنية' : 'Metallic'
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-10 pb-20 relative pt-12">
      <button 
        onClick={onBackToHub} 
        className="absolute top-0 right-0 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg group"
        title={txt.backToHome}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
        <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> {txt.colorCategory}
        </h3>
        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
          {(Object.keys(categoryLabels) as Array<FabricColor['category']>).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap border ${
                activeCategory === cat ? 'bg-primary border-primary text-white shadow-lg' : 'bg-slate-800 border-white/5 text-slate-500'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3">
          {colors.filter(c => c.category === activeCategory).map((color) => (
            <button
              key={color.id}
              onClick={() => onSelectColor(color)}
              className={`w-full aspect-square rounded-2xl border-4 transition-all ${
                selectedColor?.id === color.id ? 'border-primary scale-110 shadow-xl' : 'border-slate-800'
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
        <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> {txt.patternTexture}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {PATTERNS.map((pattern) => (
            <button
              key={pattern.id}
              onClick={() => onSelectPattern(pattern)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                selectedPattern?.id === pattern.id ? 'border-primary bg-primary/10' : 'border-white/5 bg-slate-800'
              }`}
            >
              <div 
                className="w-12 h-12 rounded-lg border border-white/10"
                style={{ 
                  backgroundImage: `url(${pattern.preview})`,
                  backgroundColor: selectedColor?.hex || '#333',
                  backgroundBlendMode: 'multiply',
                  backgroundSize: '30px'
                }}
              />
              <span className="text-[10px] font-black text-white">{pattern.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
