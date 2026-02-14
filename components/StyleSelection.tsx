
import React, { useState } from 'react';
import { Gender, GarmentStyle, Occasion, Season, StyleItem, BrandingSettings } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  gender: Gender;
  selected: GarmentStyle | null;
  onSelect: (style: GarmentStyle) => void;
  availableStyles: StyleItem[];
  onBackToHub: () => void; 
  branding: BrandingSettings; 
  language: 'ar' | 'en';
}

export const StyleSelection: React.FC<Props> = ({ gender, selected, onSelect, availableStyles, onBackToHub, branding, language }) => {
  const [activeOccasion, setActiveOccasion] = useState<Occasion>('ALL');
  const txt = TRANSLATIONS[language];

  const occasionLabels: Record<Occasion, string> = {
    ALL: language === 'ar' ? 'الكل' : 'All',
    FORMAL: language === 'ar' ? 'رسمي' : 'Formal',
    DAILY: language === 'ar' ? 'يومي' : 'Daily',
    SPORTS: language === 'ar' ? 'رياضي' : 'Sports',
    EVENING: language === 'ar' ? 'سهرة' : 'Evening',
    CEREMONY: language === 'ar' ? 'احتفال' : 'Ceremony'
  };
  
  const filteredOptions = availableStyles.filter(opt => 
    activeOccasion === 'ALL' || opt.occasion === activeOccasion
  );

  return (
    <div className="w-full space-y-8 relative pt-12">
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
         <h2 className="text-2xl font-black text-white">{txt.styleSelect}</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 justify-center">
        {Object.keys(occasionLabels).map((occ) => (
          <button
            key={occ}
            onClick={() => setActiveOccasion(occ as Occasion)}
            className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeOccasion === occ ? 'bg-primary text-white shadow-lg' : 'bg-slate-900 border border-white/5 text-slate-500'
            }`}
          >
            {occasionLabels[occ as Occasion]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`flex flex-col items-center gap-4 p-8 rounded-[3rem] bg-slate-900 border-2 transition-all group overflow-hidden relative ${
              selected === opt.id ? 'border-primary ring-4 ring-primary/10' : 'border-white/5 hover:border-white/10'
            }`}
          >
            {opt.image ? (
              <div className="w-full h-48 rounded-3xl overflow-hidden mb-2 relative">
                 <img src={opt.image} alt={opt.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                 <div className="absolute bottom-2 right-2 text-2xl">{opt.icon}</div>
              </div>
            ) : (
              <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center text-5xl group-hover:scale-110 transition-transform shadow-inner border border-white/5">
                {opt.icon}
              </div>
            )}
            
            <div className="text-center z-10">
              <h3 className="text-xl font-black text-white mb-1">{opt.label}</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
