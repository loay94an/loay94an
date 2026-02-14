
import React from 'react';
import { Gender, BrandingSettings } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  selected: Gender | null;
  onSelect: (gender: Gender) => void;
  onBackToHub: () => void; 
  branding: BrandingSettings;
  language: 'ar' | 'en';
}

export const GenderSelection: React.FC<Props> = ({ selected, onSelect, onBackToHub, branding, language }) => {
  const txt = TRANSLATIONS[language];
  
  const options = [
    { id: Gender.MALE, label: txt.male, icon: '🤵', desc: txt.maleDesc, color: 'blue' },
    { id: Gender.FEMALE, label: txt.female, icon: '💃', desc: txt.femaleDesc, color: 'rose' },
    { id: Gender.CHILDREN, label: txt.children, icon: '🎈', desc: txt.childrenDesc, color: 'amber' }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 relative pt-12">
      <button 
        onClick={onBackToHub} 
        className="absolute top-0 right-0 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg group"
        title={txt.backToHome}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>

      <h2 className="text-2xl font-black text-white text-center mb-8">{txt.genderSelect}</h2>
      <div className="grid grid-cols-1 gap-4">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`flex items-center gap-6 p-6 rounded-[2rem] bg-slate-900 border-2 transition-all group ${
              selected === opt.id ? 'border-primary ring-4 ring-primary/10' : 'border-white/5 hover:border-white/10'
            }`}
          >
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
              {opt.icon}
            </div>
            <div className={`text-${language === 'ar' ? 'right' : 'left'}`}>
              <h3 className="text-xl font-black text-white">{opt.label}</h3>
              <p className="text-slate-500 text-sm font-medium">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
