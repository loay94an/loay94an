
import React, { useMemo, useState } from 'react';
import { Order, GarmentStyle, Fabric, FabricColor, Measurements, BrandingSettings } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Props {
  orders: Order[];
  branding: BrandingSettings; // Added branding prop
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
        // Use GitHub Raw for stable TTF file
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
        console.error("Could not load Arabic font, text might be garbled.", error);
        return false;
    }
};

// Helper function to export individual order details to PDF
const exportOrderToPDF = async (order: Order) => {
  const doc = new jsPDF();
  
  const fontLoaded = await addArabicFont(doc);
  if (!fontLoaded) doc.setFont("helvetica", "normal");

  doc.setFontSize(20);
  doc.text("تفاصيل الطلب", 105, 20, { align: 'center' });

  doc.setFontSize(12);
  let yPos = 40;

  const styleName = order.details.style ? (order.details.style as string).replace(/_/g, ' ') : 'غير محدد';
  const sleeveName = order.details.sleeveType ? (order.details.sleeveType as string).replace(/_/g, ' ') : 'غير محدد';
  const collarName = order.details.collarType ? (order.details.collarType as string).replace(/_/g, ' ') : 'غير محدد';

  doc.text(`ID الطلب: ${order.id}`, 196, yPos, { align: 'right' }); yPos += 8;
  doc.text(`حالة الطلب: ${order.status === 'PENDING' ? 'قيد الانتظار' : order.status === 'PROCESSING' ? 'قيد التجهيز' : order.status === 'SHIPPED' ? 'تم الشحن' : 'مكتمل'}`, 196, yPos, { align: 'right' }); yPos += 8;
  doc.text(`تاريخ الطلب: ${new Date(order.createdAt).toLocaleString('ar-SA')}`, 196, yPos, { align: 'right' }); yPos += 12;

  doc.text(`اسم العميل: ${order.customerName}`, 196, yPos, { align: 'right' }); yPos += 8;
  doc.text(`الهاتف: ${order.phone}`, 196, yPos, { align: 'right' }); yPos += 8;
  doc.text(`العنوان: ${order.address}`, 196, yPos, { align: 'right' }); yPos += 12;

  doc.text(`الموديل: ${styleName}`, 196, yPos, { align: 'right' }); yPos += 8;
  doc.text(`القماش: ${order.details.fabric?.name || 'غير محدد'}`, 196, yPos, { align: 'right' }); yPos += 8;
  doc.text(`اللون: ${order.details.color?.name || 'غير محدد'} (${order.details.color?.hex || ''})`, 196, yPos, { align: 'right' }); yPos += 8;
  doc.text(`النقشة: ${order.details.pattern?.name || 'غير محدد'}`, 196, yPos, { align: 'right' }); yPos += 8;
  doc.text(`نوع الكم: ${sleeveName}`, 196, yPos, { align: 'right' }); yPos += 8;
  doc.text(`نوع الياقة: ${collarName}`, 196, yPos, { align: 'right' }); yPos += 12;

  doc.text(`المقاسات المعتمدة:`, 196, yPos, { align: 'right' }); yPos += 8;

  const measurements = order.details.measurements as Measurements;
  const measurementData = Object.entries(measurements || {}).map(([key, value]) => {
    // Basic Arabic labels for common measurements
    const arabicLabels: Record<string, string> = {
      height: "الطول الكلي", chest: "محيط الصدر", waist: "محيط الخصر", hips: "محيط الورك",
      shoulderWidth: "عرض الكتف", armLength: "طول الكم", neckCircumference: "محيط الرقبة",
      backWidth: "عرض الظهر", shoulderLength: "طول الكتف", backLength: "طول الظهر",
      armCircumference: "محيط الذراع", cuffCircumference: "محيط الإسوارة", waistToHip: "من الخصر للورك",
      waistToKnee: "من الخصر للركبة", waistToFloor: "طول الساق للأرض", skirtLength: "طول التنورة",
      bodiceLength: "طول الصدر", armholeCircumference: "محيط حفرة الإبط", waistToArmhole: "من الخصر للإبط",
      shoulderToBust: "من الكتف للثدي", bustPointToPoint: "بين الثديين"
    };
    return [arabicLabels[key] || key, `${value} سم`];
  });

  if ((doc as any).autoTable) {
    (doc as any).autoTable({
        startY: yPos,
        head: [['القياس', 'القيمة']],
        body: measurementData,
        theme: 'grid',
        styles: { font: fontLoaded ? 'Tajawal' : 'helvetica', halign: 'right', fontStyle: 'normal' },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], font: fontLoaded ? 'Tajawal' : 'helvetica' },
    });
    yPos = (doc as any).autoTable.previous.finalY + 12;
  } else {
    yPos += 100; // Fallback spacing if autotable fails
  }

  doc.setFontSize(16);
  doc.text(`السعر الإجمالي: ${order.details.totalPrice} ر.س`, 196, yPos, { align: 'right' });
  doc.text(`طريقة الدفع: ${order.paymentMethod === 'CARD' ? 'بطاقة ائتمان' : 'نقداً'}`, 196, yPos + 10, { align: 'right' });


  doc.save(`order_${order.customerName}_${order.id}.pdf`);
};


export const StatsDashboard: React.FC<Props> = ({ orders, branding }) => {
  const [period, setPeriod] = useState<string>("يومي");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.details?.totalPrice || 0), 0);
    const avgPrice = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    const styleCounts: Record<string, number> = {};
    const fabricCounts: Record<string, number> = {};
    const colorCounts: Record<string, { count: number; hex: string }> = {};
    const regions: Record<string, number> = {};

    orders.forEach(o => {
      // Ensure style is a string, providing a fallback if null/undefined
      const style = o.details.style ? (o.details.style as string) : 'UNKNOWN_STYLE';
      styleCounts[style] = (styleCounts[style] || 0) + 1;
      
      const fabricName = o.details.fabric?.name || 'غير محدد';
      fabricCounts[fabricName] = (fabricCounts[fabricName] || 0) + 1;
      
      const colorName = o.details.color?.name || 'غير محدد';
      const colorHex = o.details.color?.hex || '#cccccc';
      if (!colorCounts[colorName]) {
        colorCounts[colorName] = { count: 0, hex: colorHex };
      }
      colorCounts[colorName].count++;
      
      const city = o.address ? o.address.split('،')[0] : 'غير محدد';
      regions[city] = (regions[city] || 0) + 1;
    });

    return { totalRevenue, avgPrice, styleCounts, fabricCounts, colorCounts, regions };
  }, [orders]);

  const exportSummaryPDF = async () => {
    const doc = new jsPDF();
    
    const fontLoaded = await addArabicFont(doc);
    if (!fontLoaded) doc.setFont("helvetica", "normal");

    let yOffset = 20;

    // Add company logo if available
    if (branding.logoUrl) {
      try {
        const response = await fetch(branding.logoUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        await new Promise<void>((resolve) => {
          reader.onloadend = () => {
            doc.addImage(reader.result as string, "PNG", 150, 10, 40, 40); // Adjust position and size as needed
            resolve();
          };
        });
      } catch (error) {
        console.error("Error loading logo image:", error);
      }
    }

    // Add company name
    doc.setFontSize(22);
    doc.setTextColor(branding.primaryColor);
    doc.text(branding.companyName, 105, yOffset, { align: 'center' });
    yOffset += 10;

    doc.setFontSize(16);
    doc.setTextColor(50, 50, 50);
    doc.text(`تقرير الإحصائيات - فترة: ${period}`, 105, yOffset, { align: 'center' });
    yOffset += 20;
    
    doc.setFontSize(12);
    doc.text(`إجمالي المبيعات: ${stats.totalRevenue.toLocaleString()} ر.س`, 196, yOffset, { align: 'right' }); yOffset += 8;
    doc.text(`عدد الطلبات المنفذة: ${orders.length}`, 196, yOffset, { align: 'right' }); yOffset += 8;
    doc.text(`متوسط قيمة الطلب: ${stats.avgPrice.toFixed(2)} ر.س`, 196, yOffset, { align: 'right' }); yOffset += 15;

    const tableData = orders.map(o => [
      o.customerName,
      o.details.style ? (o.details.style as string).replace(/_/g, ' ') : 'غير محدد',
      o.details.fabric?.name || 'غير محدد',
      (o.details.totalPrice || 0) + ' ر.س',
      o.status === 'PENDING' ? 'قيد الانتظار' : o.status === 'PROCESSING' ? 'قيد التجهيز' : o.status === 'SHIPPED' ? 'تم الشحن' : 'مكتمل',
      new Date(o.createdAt).toLocaleDateString('ar-SA')
    ]);

    if ((doc as any).autoTable) {
        (doc as any).autoTable({
        head: [['اسم العميل', 'الموديل', 'القماش', 'السعر', 'الحالة', 'التاريخ']],
        body: tableData,
        startY: yOffset,
        styles: { font: fontLoaded ? 'Tajawal' : 'helvetica', halign: 'right', fontStyle: 'normal' },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], font: fontLoaded ? 'Tajawal' : 'helvetica' },
        });
    }

    doc.save(`smart_tailor_report_${period}.pdf`);
  };

  const renderMeasurementTable = (measurements: Measurements) => {
    const labels: Record<string, string> = {
        height: "الطول الكلي", chest: "محيط الصدر", waist: "محيط الخصر", hips: "محيط الورك",
        shoulderWidth: "عرض الكتف", armLength: "طول الكم", neckCircumference: "محيط الرقبة",
        backWidth: "عرض الظهر", shoulderLength: "طول الكتف", backLength: "طول الظهر",
        armCircumference: "محيط الذراع", cuffCircumference: "محيط الإسوارة", waistToHip: "من الخصر للورك",
        waistToKnee: "من الخصر للركبة", waistToFloor: "طول الساق للأرض", skirtLength: "طول التنورة",
        bodiceLength: "طول الصدر", armholeCircumference: "محيط حفرة الإبط", waistToArmhole: "من الخصر للإبط",
        shoulderToBust: "من الكتف للثدي", bustPointToPoint: "بين الثديين"
    };
    
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(measurements).map(([key, value]) => {
                if (!value) return null;
                return (
                    <div key={key} className="bg-slate-800 p-2 rounded-lg flex justify-between items-center text-xs">
                         <span className="text-slate-400">{labels[key] || key}</span>
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
                             <DetailRow label="النقشة" value={selectedOrder.details.pattern?.name} icon="💠" />
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
                    <div className="mt-10 space-y-4">
                        <h4 className="text-cyan-400 font-black uppercase tracking-widest text-xs mb-4 border-b border-cyan-400/20 pb-2 w-fit">الصورة المرفقة من العميل</h4>
                        <div className="group relative w-fit">
                            <a href={selectedOrder.details.clientPhotoUrl} target="_blank" rel="noopener noreferrer" title="اضغط لعرض الصورة بالحجم الكامل">
                                <img src={selectedOrder.details.clientPhotoUrl} alt="Client Reference" className="max-h-64 w-auto rounded-2xl border-2 border-white/10 transition-all group-hover:opacity-70" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none">
                                    <span className="text-white font-bold text-lg">عرض 🔍</span>
                                </div>
                            </a>
                        </div>
                        <a 
                            href={selectedOrder.details.clientPhotoUrl} 
                            download={`client-photo-${selectedOrder.id}.jpg`}
                            className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                        >
                            <span>تحميل الصورة</span>
                            <span>📥</span>
                        </a>
                    </div>
                )}
             </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
         <div className="flex gap-2">
            {['يومي', 'أسبوعي', 'شهري'].map(p => (
              <button 
                key={p} 
                onClick={() => setPeriod(p)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === p ? 'bg-primary text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}
              >
                {p}
              </button>
            ))}
         </div>
         <button 
           onClick={exportSummaryPDF} 
           className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-6 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all"
         >
           تصدير تقرير ملخص PDF 📄
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="إجمالي الدخل" val={`${stats.totalRevenue.toLocaleString()} ر.س`} icon="💰" color="emerald" />
        <StatCard label="عدد الطلبات" val={orders.length} icon="📦" color="primary" />
        <StatCard label="متوسط سعر الطلب" val={`${Math.round(stats.avgPrice)} ر.س`} icon="📈" color="amber" />
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
        <h3 className="text-lg font-black text-white">جميع الطلبات</h3>
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
                  <th className="p-3">القماش</th>
                  <th className="p-3">السعر</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className={`group text-sm font-medium ${index % 2 === 0 ? 'bg-slate-800/20' : ''} hover:bg-slate-700/50 transition-all border-b border-white/5 last:border-b-0 cursor-pointer`}
                  >
                    <td className="p-3 font-mono text-xs text-slate-500">{order.id}</td>
                    <td className="p-3 text-white">{order.customerName}</td>
                    <td className="p-3 text-white">
                      {order.details.style ? (order.details.style as string).replace(/_/g, ' ') : 'غير محدد'}
                    </td>
                    <td className="p-3 text-slate-300">{order.details.fabric?.name || 'غير محدد'}</td>
                    <td className="p-3 text-primary font-black">{order.details.totalPrice} ر.س</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500' :
                        order.status === 'PROCESSING' ? 'bg-indigo-500/20 text-indigo-500' :
                        order.status === 'SHIPPED' ? 'bg-cyan-500/20 text-cyan-500' :
                        'bg-amber-500/20 text-amber-500'
                      }`}>
                        {order.status === 'PENDING' ? 'قيد الانتظار' :
                         order.status === 'PROCESSING' ? 'قيد التجهيز' :
                         order.status === 'SHIPPED' ? 'تم الشحن' :
                         'مكتمل'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</td>
                    <td className="p-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); exportOrderToPDF(order); }}
                        className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-500 hover:text-white transition-all"
                      >
                        تصدير PDF
                      </button>
                    </td>
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
      <span className={`font-black text-sm ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</span>
  </div>
);