
import React from 'react';

export const SystemFlowchart: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto p-10 bg-slate-900/40 rounded-[3rem] border border-white/5 shadow-2xl overflow-x-auto custom-scrollbar">
      <h3 className="text-2xl font-black text-white text-center mb-16">مخطط تدفق النظام (Developer Flowchart)</h3>
      
      <div className="relative min-w-[800px] h-[700px] flex flex-col items-center">
        {/* START */}
        <FlowNode id="start" label="البداية: تسجيل الدخول" x={400} y={20} type="start" icon="🔐" />
        
        {/* CONNECTOR Start to Hub */}
        <FlowLine x1={400} y1={70} x2={400} y2={120} />

        {/* DASHBOARD HUB */}
        <FlowNode id="hub" label="لوحة التحكم الرئيسية (Sidebar)" x={400} y={120} type="hub" icon="🏠" />

        {/* BRANCHES FROM HUB */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <path d="M 400 170 L 400 200 L 100 200 L 100 250" stroke="rgba(37,99,235,0.4)" strokeWidth="2" fill="none" strokeDasharray="5,5" />
          <path d="M 400 170 L 400 200 L 250 200 L 250 250" stroke="rgba(37,99,235,0.4)" strokeWidth="2" fill="none" strokeDasharray="5,5" />
          <path d="M 400 170 L 400 250" stroke="rgba(37,99,235,0.4)" strokeWidth="2" fill="none" strokeDasharray="5,5" />
          <path d="M 400 170 L 400 200 L 550 200 L 550 250" stroke="rgba(37,99,235,0.4)" strokeWidth="2" fill="none" strokeDasharray="5,5" />
          <path d="M 400 170 L 400 200 L 700 200 L 700 250" stroke="rgba(37,99,235,0.4)" strokeWidth="2" fill="none" strokeDasharray="5,5" />
        </svg>

        {/* SECTION NODES */}
        <FlowNode id="fabrics" label="الأقمشة" x={100} y={250} type="section" icon="🧵" />
        <FlowNode id="models" label="الموديلات" x={250} y={250} type="section" icon="👗" />
        <FlowNode id="colors" label="الألوان" x={400} y={250} type="section" icon="🎨" />
        <FlowNode id="pricing" label="الأسعار" x={550} y={250} type="section" icon="💰" />
        <FlowNode id="orders" label="الطلبات" x={700} y={250} type="section" icon="📦" />

        {/* DECISION LAYERS */}
        {/* Fabrics Flow */}
        <FlowLine x1={100} y1={300} x2={100} y2={350} />
        <FlowNode id="fab_dec" label="إضافة / تعديل / حذف" x={100} y={350} type="decision" icon="❓" />
        <FlowLine x1={100} y1={400} x2={100} y2={450} />
        <FlowNode id="fab_exec" label="تحديث مكتبة النسيج" x={100} y={450} type="action" icon="💾" />

        {/* Models Flow */}
        <FlowLine x1={250} y1={300} x2={250} y2={350} />
        <FlowNode id="mod_dec" label="إضافة / تعديل / حذف" x={250} y={350} type="decision" icon="❓" />
        <FlowLine x1={250} y1={400} x2={250} y2={450} />
        <FlowNode id="mod_exec" label="تحديث شبكة التصاميم" x={250} y={450} type="action" icon="💾" />

        {/* Colors Flow */}
        <FlowLine x1={400} y1={300} x2={400} y2={350} />
        <FlowNode id="col_dec" label="Color Picker" x={400} y={350} type="decision" icon="🎨" />
        <FlowLine x1={400} y1={400} x2={400} y2={450} />
        <FlowNode id="col_exec" label="ربط الألوان بالقماش" x={400} y={450} type="action" icon="🔗" />

        {/* Pricing Flow */}
        <FlowLine x1={550} y1={300} x2={550} y2={350} />
        <FlowNode id="pri_dec" label="تعديل السعر الديناميكي" x={550} y={350} type="decision" icon="⚙️" />
        <FlowLine x1={550} y1={400} x2={550} y2={450} />
        <FlowNode id="pri_exec" label="تطبيق التغييرات" x={550} y={450} type="action" icon="🚀" />

        {/* Orders Flow */}
        <FlowLine x1={700} y1={300} x2={700} y2={350} />
        <FlowNode id="ord_dec" label="مراجعة الطلب" x={700} y={350} type="decision" icon="👁️" />
        <FlowLine x1={700} y1={400} x2={700} y2={450} />
        <FlowNode id="ord_exec" label="تصدير البترون والشحن" x={700} y={450} type="action" icon="🚢" />

        {/* END BRANCHES TO LOGOUT */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <path d="M 100 500 L 100 550 L 400 550 L 400 600" stroke="rgba(239,68,68,0.2)" strokeWidth="2" fill="none" />
          <path d="M 250 500 L 250 550 L 400 550" stroke="rgba(239,68,68,0.2)" strokeWidth="2" fill="none" />
          <path d="M 400 500 L 400 600" stroke="rgba(239,68,68,0.2)" strokeWidth="2" fill="none" />
          <path d="M 550 500 L 550 550 L 400 550" stroke="rgba(239,68,68,0.2)" strokeWidth="2" fill="none" />
          <path d="M 700 500 L 700 550 L 400 550" stroke="rgba(239,68,68,0.2)" strokeWidth="2" fill="none" />
        </svg>

        <FlowNode id="logout" label="تسجيل الخروج" x={400} y={600} type="end" icon="🚪" />
      </div>
    </div>
  );
};

const FlowNode = ({ id, label, x, y, type, icon }: { id: string, label: string, x: number, y: number, type: 'start' | 'end' | 'hub' | 'section' | 'decision' | 'action', icon: string }) => {
  const styles = {
    start: 'bg-emerald-500 text-white rounded-full border-4 border-emerald-500/20',
    end: 'bg-red-500 text-white rounded-full border-4 border-red-500/20',
    hub: 'bg-primary text-white rounded-2xl border-4 border-primary/20',
    section: 'bg-slate-800 text-white rounded-xl border border-white/10',
    decision: 'bg-amber-500/20 text-amber-500 rounded-xl border-2 border-amber-500/40 rotate-45',
    action: 'bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/40'
  };

  return (
    <div 
      className={`absolute transition-all duration-500 hover:scale-110 flex flex-col items-center justify-center p-3 text-center shadow-xl group ${styles[type]}`}
      style={{ left: x, top: y, width: 140, height: 50, transform: `translate(-50%, -50%) ${type === 'decision' ? 'rotate(45deg)' : ''}` }}
    >
      <div className={`flex items-center gap-2 ${type === 'decision' ? '-rotate-45' : ''}`}>
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-black leading-tight">{label}</span>
      </div>
    </div>
  );
};

const FlowLine = ({ x1, y1, x2, y2 }: { x1: number, y1: number, x2: number, y2: number }) => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="5,5" />
    <circle cx={x2} cy={y2} r="3" fill="rgba(255,255,255,0.2)" />
  </svg>
);
