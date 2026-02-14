
import React, { useState } from 'react';
import { Fabric, BrandingSettings } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  selected: Fabric | null;
  onSelect: (fabric: Fabric) => void;
  fabrics: Fabric[]; 
  onBackToHub: () => void;
  branding: BrandingSettings;
  language: 'ar' | 'en';
}

export const FabricSelection: React.FC<Props> = ({ selected, onSelect, fabrics, onBackToHub, branding, language }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const txt = TRANSLATIONS[language];

  return (
    <div className="w-full space-y-12 animate-in fade-in duration-700 relative pt-12">
      <button 
        onClick={onBackToHub} 
        className="absolute top-0 right-0 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg group"
        title={txt.backToHome}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>

      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black text-white">{txt.fabricLib}</h2>
        <p className="text-slate-500 font-medium">{txt.fabricDesc}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
        {fabrics.map((fabric) => (
          <div
            key={fabric.id}
            onClick={() => onSelect(fabric)}
            onMouseEnter={() => setHovered(fabric.id)}
            onMouseLeave={() => setHovered(null)}
            className={`relative bg-slate-900 rounded-[2.5rem] border-2 transition-all group cursor-pointer overflow-hidden ${
              selected?.id === fabric.id ? 'border-primary ring-4 ring-primary/10 scale-105 shadow-2xl z-10' : 'border-white/5 hover:border-white/10'
            }`}
          >
            <div className="h-48 sm:h-64 relative overflow-hidden">
              <img src={fabric.image} alt={fabric.name} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>
              
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary px-3 py-1.5 rounded-full shadow-lg">
                  {fabric.material}
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                 <h3 className="text-xl font-black text-white">{fabric.name}</h3>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-slate-400 text-xs font-medium leading-relaxed h-10 overflow-hidden line-clamp-2">
                {fabric.description}
              </p>
              
              <div className="space-y-3 pt-4 border-t border-white/5">
                <PropertyRow label={txt.stretch} value={fabric.properties.stretch} />
                <PropertyRow label={txt.breathability} value={fabric.properties.breathability} />
                <PropertyRow label={txt.durability} value={fabric.properties.durability} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-1.5">
                   {Array.from({ length: 3 }).map((_, i) => (
                     <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (fabric.thickness === 'thin' ? 1 : fabric.thickness === 'medium' ? 2 : 3) ? 'bg-primary' : 'bg-slate-800'}`}></div>
                   ))}
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{txt.thickness}</span>
              </div>
            </div>

            {selected?.id === fabric.id && (
              <div className="absolute inset-0 border-4 border-primary/20 pointer-events-none rounded-[2.5rem]"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const PropertyRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center text-[10px] font-bold">
    <span className="text-slate-500 uppercase tracking-widest">{label}</span>
    <span className="text-slate-300">{value}</span>
  </div>
);
