
import React, { useState } from 'react';
import { OrderDetails, Order, BrandingSettings } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  orderDetails: OrderDetails;
  onConfirm: (order: Order) => Promise<boolean>;
  onBack: () => void;
  branding: BrandingSettings;
  language: 'ar' | 'en';
  referralManager: string | null; // Received from App state
}

export const PaymentStep: React.FC<Props> = ({ orderDetails, onConfirm, onBack, branding, language, referralManager }) => {
  const txt = TRANSLATIONS[language];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedPrice = orderDetails.totalPrice > 0 ? orderDetails.totalPrice : 350; 

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name || !phone || !address) {
        alert("الرجاء تعبئة جميع الحقول المطلوبة");
        return;
    }
    
    setIsSubmitting(true);

    // PRIORITY: Use the prop passed from App state. Fallback to localStorage. Default to Admin if neither exists.
    let finalManagerId = referralManager || localStorage.getItem('smart_tailor_manager_ref') || "loay94an1@gmail.com";
    finalManagerId = finalManagerId.trim();

    const newOrder: Order = {
        id: `ORD-${Date.now()}`,
        customerName: name,
        phone: phone,
        address: address,
        paymentMethod: paymentMethod,
        status: 'PENDING',
        createdAt: Date.now(),
        details: {
            ...orderDetails,
            totalPrice: estimatedPrice
        },
        managerId: finalManagerId
    };
    
    console.log("Submitting order for manager:", finalManagerId); // Debugging

    const success = await onConfirm(newOrder);

    // If the submission fails (due to offline mode or other errors), re-enable the button.
    if (!success) {
      setIsSubmitting(false);
    }
    // On success, the app will navigate away, so no need to reset state.
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 relative pt-12 pb-32 lg:pb-20">
      <button 
        onClick={onBack} 
        className="absolute top-0 right-0 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg group"
        title="رجوع"
      >
        <span className="text-xl transform group-hover:-translate-x-1 transition-transform">➜</span>
      </button>

      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black text-white">{txt.paymentTitle}</h2>
        <p className="text-slate-400 font-medium">{txt.paymentDesc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-8 border border-white/5 shadow-2xl space-y-8">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">👤</span>
                {txt.customerInfo}
            </h3>
            
            <form id="payment-form" onSubmit={handleFinish} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{txt.fullName}</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-colors"
                        placeholder="مثال: محمد عبدالله" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{txt.phoneNumber}</label>
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-colors"
                        placeholder="05xxxxxxxx" dir="ltr" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{txt.address}</label>
                    <textarea required value={address} onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-colors h-32 resize-none"
                        placeholder="المدينة، الحي، اسم الشارع..." />
                </div>
                <h3 className="text-xl font-black text-white flex items-center gap-3 pt-6 border-t border-white/5">
                    <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg">💳</span>
                    {txt.paymentMethod}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button type="button" onClick={() => setPaymentMethod('CARD')}
                        className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${paymentMethod === 'CARD' ? 'border-primary bg-primary/5 shadow-xl scale-[1.02]' : 'border-white/5 bg-slate-800 hover:bg-slate-800/80'}`}>
                        <span className="text-3xl">💳</span>
                        <span className="font-bold text-sm text-white">{txt.creditCard}</span>
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('CASH')}
                        className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-500/5 shadow-xl scale-[1.02]' : 'border-white/5 bg-slate-800 hover:bg-slate-800/80'}`}>
                        <span className="text-3xl">💵</span>
                        <span className="font-bold text-sm text-white">{txt.cashOnDelivery}</span>
                    </button>
                </div>
            </form>
        </div>
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 rounded-[3rem] p-8 border border-white/5 shadow-2xl lg:sticky top-24">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">🧾</span>
                    {txt.orderSummary}
                </h3>
                <div className="space-y-4 mb-8">
                    <SummaryRow label="الموديل" value={orderDetails.style ? String(orderDetails.style).replace(/_/g, ' ') : '-'} />
                    <SummaryRow label="القماش" value={orderDetails.fabric?.name || ''} />
                    <SummaryRow label="اللون" value={orderDetails.color?.name || ''} />
                    <SummaryRow label="النقشة" value={orderDetails.pattern?.name || ''} />
                    {referralManager && (
                        <div className="py-2 px-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 mt-4">
                           <span className="text-[10px] text-indigo-400 block mb-1">المصمم المشرف</span>
                           <span className="text-sm font-bold text-white">{referralManager}</span>
                        </div>
                    )}
                </div>
                <div className="pt-6 border-t border-white/10 space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-slate-400">{txt.totalPrice}</span>
                        <span className="text-3xl font-black text-white">{estimatedPrice} <small className="text-sm text-primary">{txt.currency}</small></span>
                    </div>
                </div>
                <button 
                    form="payment-form" type="submit" disabled={isSubmitting}
                    className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-lg shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all mt-8 hover:bg-emerald-600 hidden lg:block disabled:opacity-50 disabled:cursor-wait">
                    {isSubmitting ? 'جاري الإرسال...' : `${txt.confirmOrder} ✓`}
                </button>
            </div>
        </div>
      </div>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] glass px-4 py-4 border-t border-white/5">
        <div className="flex items-center justify-between gap-4">
            <div className="text-right">
                <span className="text-xs text-slate-400 block">{txt.totalPrice}</span>
                <span className="text-2xl font-black text-white">{estimatedPrice} <small className="text-sm">{txt.currency}</small></span>
            </div>
            <button form="payment-form" type="submit" disabled={isSubmitting}
                className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-base shadow-lg hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-wait">
                {isSubmitting ? 'جاري الإرسال...' : `${txt.confirmOrder} ✓`}
            </button>
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string | undefined, value: string | undefined }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-slate-500 font-bold">{label}</span>
        <span className="text-white font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
);
