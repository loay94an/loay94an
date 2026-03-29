
import React, { useMemo, useState } from 'react';
import { Order, GarmentStyle, Fabric, FabricColor, Measurements, BrandingSettings } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Props {
  orders: Order[];
  branding: BrandingSettings;
}

// Helper: Convert ArrayBuffer to Base64 for Font
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// Helper: Add font to PDF doc
const addArabicFont = async (doc: jsPDF): Promise<boolean> => {
    try {
        const fontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf";
        const response = await fetch(fontUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        const buffer = await response.arrayBuffer();
        const fontBase64 = arrayBufferToBase64(buffer);
        
        doc.addFileToVFS("Tajawal-Regular.ttf", fontBase64);
        doc.addFont("Tajawal-Regular.ttf", "Tajawal", "normal");
        doc.setFont("Tajawal", "normal");
        return true;
    } catch (error) {
        console.error("Could not load Arabic font", error);
        return false;
    }
};

const exportOrderToPDF = async (order: Order) => {
  const doc = new jsPDF();
  const fontLoaded = await addArabicFont(doc);
  if (!fontLoaded) doc.setFont("helvetica", "normal");

  doc.setFontSize(20);
  doc.text("تفاصيل الطلب", 105, 20, { align: 'center' });

  let yPos = 40;
  doc.setFontSize(12);

  const styleName = order.details.style ? (order.details.style as string).replace(/_/g, ' ') : '-';
  
  const rightColX = 196;
  const lineHeight = 8;

  const addLine = (label: string, value: string | undefined) => {
      doc.text(`${label}: ${value || '-'}`, rightColX, yPos, { align: 'right' });
      yPos += lineHeight;
  };

  addLine("ID الطلب", order.id);
  addLine("العميل", order.customerName);
  addLine("الهاتف", order.phone);
  addLine("الموديل", styleName);
  addLine("القماش", order.details.fabric?.name);
  addLine("السعر", `${order.details.totalPrice} ر.س`);
  
  yPos += 10;
  doc.text("المقاسات:", rightColX, yPos, { align: 'right' });
  yPos += 10;

  const measurements = Object.entries(order.details.measurements || {})
    .filter(([_, v]) => (v as number) > 0)
    .map(([k, v]) => [k, `${v} cm`]);

  if ((doc as any).autoTable) {
    (doc as any).autoTable({
        startY: yPos,
        head: [['القياس', 'القيمة']],
        body: measurements,
        theme: 'grid',
        styles: { font: fontLoaded ? 'Tajawal' : 'helvetica', halign: 'right' },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    });
  }

  doc.save(`order_${order.id}.pdf`);
};

export const StatsDashboard: React.FC<Props> = ({ orders, branding }) => {
  const [period, setPeriod] = useState<string>("يومي");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.details?.totalPrice || 0), 0);
    const avgPrice = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    const styleCounts: Record<string, number> = {};
    const regions: Record<string, number> = {};

    orders.forEach(o => {
      const style = o.details.style ? (o.details.style as string) : 'UNKNOWN';
      styleCounts[style] = (styleCounts[style] || 0) + 1;
      
      const city = o.address ? o.address.split('،')[0].split(',')[0].trim() : 'غير محدد';
      regions[city] = (regions[city] || 0) + 1;
    });

    return { totalRevenue, avgPrice, styleCounts, regions };
  }, [orders]);

  const renderMeasurementTable = (measurements: Measurements) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(measurements).map(([key, value]) => {
                if (!value) return null;
                return (
                    <div key={key} className="bg-slate-800 p-2 rounded-lg flex justify-between items-center text-xs">
                         <span className="text-slate-400 opacity-80">{key}</span>
                         <span className="text-white font-bold">{value} cm</span>
                    </div>
                );
            })}
        </div>
    );
  };

  const maxStyleVal = Math.max(...(Object.values(stats.styleCounts) as number[]), 1);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[800] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
             <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-white/10 shadow-2xl p-6 sm:p-10 animate-in zoom-in-95 duration-300 custom-scrollbar">
                <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
                    <div>
                        <h3 className="text-2xl font-black text-white mb-2">تفاصيل الطلب #{selectedOrder.id}</h3>
                        <p className="text-slate-400 text-sm">تاريخ الطلب: {new Date(selectedOrder.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 hover:bg-white hover:text-black transition-all flex items-center justify-center text-xl">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* CUSTOMER INFO */}
                    <div className="space-y-6">
                        <h4 className="text-primary font-black uppercase tracking-widest text-xs mb-4 border-b border-primary/20 pb-2 w-fit">بيانات العميل</h4>
                        <div className="bg-slate-800/50 p-6 rounded-3xl space-y-4">
                             <DetailRow label="اسم العميل" value={selectedOrder.customerName} icon="👤" />
                             <DetailRow label="رقم الهاتف" value={selectedOrder.phone} icon="📞" />
                             <DetailRow label="العنوان" value={selectedOrder.address} icon="📍" />
                             <DetailRow label="طريقة الدفع" value={selectedOrder.paymentMethod === 'CARD' ? 'بطاقة ائتمان' : 'دفع عند الاستلام'} icon="💳" />
                             <DetailRow label="حالة الطلب" value={selectedOrder.status} icon="📊" />
                        </div>
                    </div>

                    {/* ORDER SPECS */}
                    <div className="space-y-6">
                        <h4 className="text-emerald-500 font-black uppercase tracking-widest text-xs mb-4 border-b border-emerald-500/20 pb-2 w-fit">مواصفات التصميم</h4>
                        <div className="bg-slate-800/50 p-6 rounded-3xl space-y-4">
                             <DetailRow label="الموديل" value={selectedOrder.details.style ? String(selectedOrder.details.style).replace(/_/g, ' ') : '-'} icon="👗" />
                             <DetailRow label="القماش" value={selectedOrder.details.fabric?.name} icon="🧵" />
                             <DetailRow label="اللون" value={selectedOrder.details.color?.name} icon="🎨" />
                             <DetailRow label="السعر الإجمالي" value={`${selectedOrder.details.totalPrice} ر.س`} icon="💰" highlight />
                        </div>
                    </div>
                </div>

                {/* MEASUREMENTS */}
                <div className="mt-10">
                    <h4 className="text-amber-500 font-black uppercase tracking-widest text-xs mb-4 border-b border-amber-500/20 pb-2 w-fit">جدول المقاسات</h4>
                    <div className="bg-slate-800/30 p-6 rounded-3xl border border-white/5">
                        {renderMeasurementTable(selectedOrder.details.measurements)}
                    </div>
                </div>

                {/* CLIENT ATTACHED PHOTO */}
                {selectedOrder.details.clientPhotoUrl && (
                    <div className="mt-10 p-6 bg-slate-950 rounded-3xl border border-white/10">
                        <h4 className="text-cyan-400 font-black uppercase tracking-widest text-xs mb-4 border-b border-cyan-400/20 pb-2 w-fit flex items-center gap-2">
                            <span>📸</span> صورة العميل المرفقة
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                            <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-700 shadow-xl max-w-xs">
                                <img 
                                    src={selectedOrder.details.clientPhotoUrl} 
                                    alt="Client Reference" 
                                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110" 
                                />
                                <a 
                                    href={selectedOrder.details.clientPhotoUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <span className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs transform scale-90 group-hover:scale-100 transition-transform">تكبير 🔍</span>
                                </a>
                            </div>
                            <div className="flex flex-col gap-3">
                                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                                    قام العميل بإرفاق هذه الصورة كمرجع للتصميم أو لأخذ القياسات.
                                </p>
                                <a 
                                    href={selectedOrder.details.clientPhotoUrl} 
                                    target="_blank"
                                    download={`client-photo-${selectedOrder.id}`}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg transition-all w-fit"
                                >
                                    <span>تحميل الصورة</span>
                                    <span>📥</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                     <button 
                        onClick={() => exportOrderToPDF(selectedOrder)}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center gap-2"
                     >
                        <span>تصدير PDF</span>
                        <span>📄</span>
                     </button>
                </div>
             </div>
        </div>
      )}

      {/* DASHBOARD STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="إجمالي الدخل" val={`${stats.totalRevenue.toLocaleString()} ر.س`} icon="💰" color="emerald" />
        <StatCard label="عدد الطلبات" val={orders.length} icon="📦" color="primary" />
        <StatCard label="متوسط السعر" val={`${Math.round(stats.avgPrice)} ر.س`} icon="📈" color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 space-y-6">
          <h3 className="text-lg font-black text-white">الموديلات الأكثر طلباً</h3>
          <div className="space-y-4 pt-4">
            {Object.entries(stats.styleCounts).map(([style, count]) => (
              <div key={style} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400">
                  <span>{style.replace(/_/g, ' ')}</span>
                  <span className="text-white">{(count as number)} طلب</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all duration-1000" 
                    style={{ width: `${((count as number) / maxStyleVal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 space-y-6">
          <h3 className="text-lg font-black text-white">توزيع المناطق</h3>
          <div className="space-y-4 pt-4">
            {Object.entries(stats.regions).map(([city, count]) => (
              <div key={city} className="flex items-center justify-between p-4 bg-slate-800/20 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-sm">📍</span>
                  <span className="text-[11px] font-black text-white">{city}</span>
                </div>
                <span className="text-sm font-black text-primary">{(count as number)} عميل</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 space-y-6">
        <h3 className="text-lg font-black text-white">سجل الطلبات</h3>
        {orders.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <span className="text-7xl block mb-4">📦</span>
            <p className="font-black text-xl">لا توجد طلبات لعرضها.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right whitespace-nowrap">
              <thead>
                <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-white/5">
                  <th className="p-3">ID</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">الموديل</th>
                  <th className="p-3">السعر</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className={`group text-sm font-medium ${index % 2 === 0 ? 'bg-slate-800/20' : ''} hover:bg-slate-700/50 transition-all border-b border-white/5 last:border-b-0 cursor-pointer`}
                  >
                    <td className="p-3 font-mono text-xs text-slate-500">{order.id.substring(0,8)}...</td>
                    <td className="p-3 text-white">{order.customerName}</td>
                    <td className="p-3 text-white">
                      {order.details.style ? (order.details.style as string).replace(/_/g, ' ') : '-'}
                    </td>
                    <td className="p-3 text-primary font-black">{order.details.totalPrice} ر.س</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500' :
                        order.status === 'SHIPPED' ? 'bg-cyan-500/20 text-cyan-500' :
                        'bg-amber-500/20 text-amber-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const StatCard = ({ label, val, icon, color }: any) => {
  const colorMap: any = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border ${colorMap[color]} shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-transform`}>
      <div className="text-right">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">{label}</span>
        <span className="text-3xl font-black text-white">{val}</span>
      </div>
      <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center text-4xl shadow-inner group-hover:rotate-6 transition-transform">
        {icon}
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, icon, highlight }: any) => (
  <div className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-slate-900/50">
      <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="text-xs font-bold text-slate-400">{label}</span>
      </div>
      <span className={`font-black text-sm ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value || '-'}</span>
  </div>
);
