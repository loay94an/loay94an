
import React from 'react';
import { AppStep } from '../types';

interface Props {
  currentStep: AppStep;
}

// 7 Steps Strictly
const steps = [
  { id: AppStep.GENDER_SELECTION, icon: '1' }, // Gender
  { id: AppStep.SIZE_INPUT, icon: '2' },       // Size
  { id: AppStep.STYLE_SELECTION, icon: '3' },  // Style
  { id: AppStep.FABRIC_SELECTION, icon: '4' }, // Fabric
  { id: AppStep.PATTERN_EDITOR, icon: '5' },   // Pattern
  { id: AppStep.EXPORT, icon: '6' },           // Export
  { id: AppStep.PAYMENT, icon: '7' }           // Payment
];

export const StepProgressBar: React.FC<Props> = ({ currentStep }) => {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 overflow-x-auto custom-scrollbar no-scrollbar">
      <div className="flex items-center justify-between min-w-[400px] gap-2 px-2 relative">
        
        {/* Progress Line Background */}
        <div className="absolute left-0 top-1/2 w-full h-1 bg-white/5 -z-10 rounded-full"></div>

        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1 relative">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 transform border-4 ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-125 z-10'
                    : isCompleted
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                {isCompleted ? '✓' : step.icon}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
