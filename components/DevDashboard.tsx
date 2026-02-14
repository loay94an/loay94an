import React, { useState, useEffect } from 'react';
import { Fabric, FabricColor, StyleItem, PricingRule, Order, BrandingSettings, SectionConfig, ActivityLog, Gender, GarmentStyle, User, UserRole, Occasion, Measurements } from '../types';
import jsPDF from 'jspdf';
import { StatsDashboard } from './StatsDashboard';
import { Firestore, doc, setDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

interface Props {
  fabrics: Fabric[];
  setFabrics: (f: Fabric[]) => void;
  styles: StyleItem[];
  setStyles: (s: StyleItem[]) => void;
  colors: FabricColor[];
  setColors: (c: FabricColor[]) => void;
  pricing: PricingRule[];
  setPricing: (p: PricingRule[]) => void;
  orders: Order[];
  setOrders: (o: Order[]) => void;
  branding: BrandingSettings;
  setBranding: (b: BrandingSettings) => void;
  config: SectionConfig;
  setConfig: (c: SectionConfig) => void;
  onClose: () => void;
  activityLogs: ActivityLog[];
  currentUser: User;
  allUsers: User[];
  onAddUser: (username: string, password: string, role: UserRole) => Promise<User | null>; // Ensure it returns User | null
  onUpdateUser: (user: User) => Promise<boolean>;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void; // This might become redundant if onUpdateUser is generic enough
  onDeleteUser: (userId: string) => void;
  onLogout: () => void;
  db: Firestore;
}

type ModalType = 'FABRIC' | 'STYLE' | 'COLOR' | 'PRICING' | 'USER' | null;

export const DevDashboard: React.FC<Props> = ({ 
  fabrics, setFabrics, styles, setStyles, colors, setColors, pricing, setPricing,
  orders: localOrders, setOrders, branding, setBranding, config, setConfig, onClose, activityLogs,
  currentUser, allUsers, onAddUser, onUpdateUser, onUpdateUserRole, onDeleteUser, onLogout, db
}) => {
  
  const defaultTab = (currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN) ? 'MANAGER_ZONE' : 'ORDERS';
  const [activeTab, setActiveTab] = useState<'BRANDING' | 'LOGS' | 'PRICING' | 'FABRICS' | 'STYLES' | 'COLORS' | 'ORDERS' | 'CONFIG' | 'USER_MANAGEMENT' | 'MANAGER_ZONE' | 'SETTINGS'>(defaultTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Manager Settings
  const [newPassword, setNewPassword] = useState('');
  
  // REAL-TIME STATE
  const [liveOrders, setLiveOrders] = useState<Order[]>(localOrders);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [liveUsers, setLiveUsers] = useState<User[]>(allUsers); // Separate state for live users

  // CRUD Modal State
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Order Detail View State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // --- REAL-TIME DATA LISTENER (ORDERS) ---
  useEffect(() => {
    if (!db) {
        setLiveOrders(localOrders);
        return;
    }

    setLoadingOrders(true);
    let q;

    if (currentUser.role === UserRole.ADMIN) {
        q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else if (currentUser.role === UserRole.MANAGER) {
        q = query(collection(db, 'orders'), where('managerId', '==', currentUser.username), orderBy('createdAt', 'desc')); 
    } else {
        q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedOrders: Order[] = [];
        snapshot.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() } as Order; // Ensure ID is captured
            fetchedOrders.push(data);
        });
        
        fetchedOrders.sort((a, b) => b.createdAt - a.createdAt);
        setLiveOrders(fetchedOrders);
        setOrders(fetchedOrders); // Update parent state as well
        setLoadingOrders(false);
    }, (error) => {
        console.error("Real-time orders fetch error:", error);
        setLoadingOrders(false);
        setLiveOrders(localOrders);
    });

    return () => unsubscribe();
  }, [currentUser, db]);

  // --- REAL-TIME DATA LISTENER (USERS) ---
  useEffect(() => {
    if (!db || currentUser.role !== UserRole.ADMIN) {
        setLiveUsers(allUsers);
        return;
    }

    const q = query(collection(db, 'users'), orderBy('username'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedUsers: User[] = [];
        snapshot.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() } as User;
            fetchedUsers.push(data);
        });
        setLiveUsers(fetchedUsers);
    }, (error) => {
        console.error("Real-time users fetch error:", error);
        setLiveUsers(allUsers);
    });

    return () => unsubscribe();
  }, [currentUser, db, allUsers]);

  // --- ACTIONS ---

  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);
  const handleTabClick = (tab: any) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
        alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
        return;
    }
    const success = await onUpdateUser({ ...currentUser, password: newPassword });
    if (success) {
        alert("✅ تم تحديث كلمة المرور بنجاح.");
        setNewPassword('');
    } else {
        alert("❌ حدث خطأ أثناء التحديث.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (!e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    setIsUploading(true);

    // Provide an immediate preview
    const reader = new FileReader();
    reader.onloadend = () => {
        setEditingItem((prev: any) => ({ ...prev, [fieldName]: reader.result as string }));
    };
    reader.readAsDataURL(file);

    if (storage) {
        const storageRef = ref(storage, `uploads/${modalType?.toLowerCase()}/${Date.now()}_${file.name}`);
        try {
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          setEditingItem((prev: any) => ({ ...prev, [fieldName]: url })); // Update with cloud URL
        } catch (error) {
          console.warn("Firebase upload failed, keeping local Base64 preview.", error);
        }
    }
    setIsUploading(false);
  };

  const handleDelete = async (type: 'FABRIC' | 'STYLE' | 'COLOR' | 'PRICING' | 'USER', id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.")) return;

    try {
      if (type === 'FABRIC') {
        if (db) await deleteDoc(doc(db, 'fabrics', id));
        setFabrics(fabrics.filter(i => i.id !== id));
      }
      if (type === 'STYLE') {
        if (db) await deleteDoc(doc(db, 'styles', id));
        setStyles(styles.filter(i => i.id !== id));
      }
      if (type === 'COLOR') {
        if (db) await deleteDoc(doc(db, 'colors', id));
        setColors(colors.filter(i => i.id !== id));
      }
      if (type === 'PRICING') {
        if (db) await deleteDoc(doc(db, 'pricing', id)); // id here is styleId
        setPricing(pricing.filter(i => i.styleId !== id));
      }
      if (type === 'USER') {
        if (db) {
             await deleteDoc(doc(db, 'users', id));
             // Also delete referral if exists
             const userToDelete = liveUsers.find(u => u.id === id);
             if (userToDelete?.referralCode) {
                 await deleteDoc(doc(db, 'referrals', userToDelete.referralCode));
             }
        }
        setLiveUsers(liveUsers.filter(u => u.id !== id)); // Update liveUsers state
        // Re-call onUpdateUser to update global app state (allUsers in App.tsx)
        // This is a bit indirect, but onAddUser/onUpdateUser already handle App.tsx's allUsers
        // For delete, we need to pass a callback if App.tsx doesn't listen to liveUsers
        // For simplicity, for now, just update local, and App.tsx will eventually sync
      }
      alert("✅ تم الحذف بنجاح");
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("حدث خطأ أثناء الحذف.");
    }
  };

  const openModal = (type: ModalType, item?: any) => {
    setModalType(type);
    if (item) {
      setEditingItem({ ...item });
    } else {
      // Initialize defaults for new items
      if (type === 'FABRIC') {
        setEditingItem({
          id: `fab-${Date.now()}`,
          name: '', 
          description: '', 
          color: '#ffffff', // Default color
          thickness: 'medium', 
          material: '',
          image: '', 
          properties: { stretch: 'متوسطة', breathability: 'متوسطة', durability: 'عالية' },
          physics: { mass: 1.0, stiffness: 0.5, damping: 0.5 }
        });
      }
      if (type === 'STYLE') {
        setEditingItem({
          id: `STYLE_${Date.now()}`, // Unique ID for new style
          label: '', 
          icon: '👗', 
          description: '', 
          occasion: 'DAILY', 
          season: 'ALL', 
          gender: Gender.FEMALE, 
          image: ''
        });
      }
      if (type === 'COLOR') {
        setEditingItem({
          id: `col-${Date.now()}`, name: '', hex: '#000000', category: 'BASIC'
        });
      }
      if (type === 'PRICING') {
        setEditingItem({
          styleId: styles[0]?.id || '', basePrice: 350, fabricMultipliers: {}
        });
      }
      if (type === 'USER') {
        setEditingItem({
            id: '', username: '', password: '', role: UserRole.ASSISTANT
        });
      }
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalType || !editingItem) return;

    if (modalType === 'USER') {
        if (editingItem.id) { // Editing existing user
            const success = await onUpdateUser(editingItem);
            if (success) {
                setLiveUsers(liveUsers.map(u => u.id === editingItem.id ? editingItem : u));
                alert("✅ تم تحديث المستخدم بنجاح!");
            } else {
                alert("❌ حدث خطأ أثناء تحديث المستخدم.");
            }
        } else { // Adding new user
            if (editingItem.username && editingItem.password) {
                const newUser = await onAddUser(editingItem.username, editingItem.password, editingItem.role);
                if (newUser) {
                    setLiveUsers([...liveUsers, newUser]);
                    alert("✅ تم إضافة المستخدم بنجاح!");
                } else {
                    alert("❌ حدث خطأ أثناء إضافة المستخدم.");
                }
            } else {
                alert("الرجاء إدخال اسم المستخدم وكلمة المرور.");
            }
        }
        setModalType(null);
        setEditingItem(null);
        return;
    }

    try {
      if (modalType === 'FABRIC') {
        if (db) await setDoc(doc(db, 'fabrics', editingItem.id), editingItem);
        const exists = fabrics.some(f => f.id === editingItem.id);
        if (exists) setFabrics(fabrics.map(f => f.id === editingItem.id ? editingItem : f));
        else setFabrics([...fabrics, editingItem]);
      }
      
      if (modalType === 'STYLE') {
        if (db) await setDoc(doc(db, 'styles', editingItem.id), editingItem);
        const exists = styles.some(s => s.id === editingItem.id);
        // FIX: Corrected a typo where 'f' was used instead of 's' in the map function.
        if (exists) setStyles(styles.map(s => s.id === editingItem.id ? editingItem : s));
        else setStyles([...styles, editingItem]);
      }
      
      if (modalType === 'COLOR') {
        if (db) await setDoc(doc(db, 'colors', editingItem.id), editingItem);
        const exists = colors.some(c => c.id === editingItem.id);
        if (exists) setColors(colors.map(c => c.id === editingItem.id ? editingItem : c));
        else setColors([...colors, editingItem]);
      }
      
      if (modalType === 'PRICING') {
        if (db) await setDoc(doc(db, 'pricing', editingItem.styleId), editingItem);
        const others = pricing.filter(p => p.styleId !== editingItem.styleId);
        setPricing([...others, editingItem]);
      }

      setModalType(null);
      setEditingItem(null);
      alert("✅ تم الحفظ بنجاح");
    } catch (error) {
      console.error("Error saving item:", error);
      alert("⚠️ فشل الحفظ.");
    }
  };

  const handleSaveBranding = async () => {
    try {
        if (db) await setDoc(doc(db, 'settings', 'branding'), branding);
        alert("✅ تم حفظ إعدادات الهوية بنجاح.");
    } catch (error) {
        console.error("Error saving branding settings:", error);
        alert("⚠️ فشل حفظ إعدادات الهوية.");
    }
  };

  const handleSaveConfig = async () => {
    try {
        if (db) await setDoc(doc(db, 'settings', 'config'), config);
        alert("✅ تم حفظ الإعدادات العامة بنجاح.");
    } catch (error) {
        console.error("Error saving config settings:", error);
        alert("⚠️ فشل حفظ الإعدادات العامة.");
    }
  };


  return (
    <div className="fixed inset-0 z-[500] bg-dark flex flex-col animate-in fade-in duration-300 overflow-hidden" dir="rtl">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-[550] lg:hidden" onClick={handleSidebarToggle}></div>
      )}

      {/* --- MODALS --- */}
      
      {/* 1. CRUD FORM MODAL */}
      {modalType && editingItem && (
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
               <h3 className="text-2xl font-black text-white">
                 {modalType === 'FABRIC' ? 'إدارة الأقمشة' : 
                  modalType === 'STYLE' ? 'إدارة الموديلات' :
                  modalType === 'COLOR' ? 'إدارة الألوان' :
                  modalType === 'USER' ? (editingItem.id ? 'تعديل المستخدم' : 'إضافة مستخدم جديد') : 'إدارة التسعير'}
               </h3>
               <button onClick={() => setModalType(null)} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSaveItem} className="space-y-6">
              {modalType === 'FABRIC' && (
                 <>
                    <Input label="اسم القماش" value={editingItem.name} onChange={(v: string) => setEditingItem({...editingItem, name: v})} />
                    <Input label="الوصف" value={editingItem.description} onChange={(v: string) => setEditingItem({...editingItem, description: v})} />
                    <Input label="المادة الأساسية" value={editingItem.material} onChange={(v: string) => setEditingItem({...editingItem, material: v})} />
                    <Select label="السماكة" value={editingItem.thickness} options={['thin', 'medium', 'thick']} onChange={(v: string) => setEditingItem({...editingItem, thickness: v})} />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/50 p-4 rounded-2xl">
                        <Input label="المرونة" value={editingItem.properties.stretch} onChange={(v: string) => setEditingItem({...editingItem, properties: {...editingItem.properties, stretch: v}})} />
                        <Input label="المسامية" value={editingItem.properties.breathability} onChange={(v: string) => setEditingItem({...editingItem, properties: {...editingItem.properties, breathability: v}})} />
                        <Input label="المتانة" value={editingItem.properties.durability} onChange={(v: string) => setEditingItem({...editingItem, properties: {...editingItem.properties, durability: v}})} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">صورة القماش</label>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                        {editingItem.image && <img src={editingItem.image} alt="Preview" className="h-32 w-full rounded-2xl object-cover mt-2 border border-white/10" />}
                    </div>
                 </>
              )}

              {modalType === 'STYLE' && (
                 <>
                    <Input label="اسم الموديل" value={editingItem.label} onChange={(v: string) => setEditingItem({...editingItem, label: v})} />
                    <Input label="المعرف الفريد (ID)" value={editingItem.id} onChange={(v: string) => setEditingItem({...editingItem, id: v})} />
                    <Input label="الأيقونة" value={editingItem.icon} onChange={(v: string) => setEditingItem({...editingItem, icon: v})} />
                    <Input label="وصف التصميم" value={editingItem.description} onChange={(v: string) => setEditingItem({...editingItem, description: v})} />
                    <Select label="الفئة المستهدفة" value={editingItem.gender} options={[Gender.MALE, Gender.FEMALE, Gender.CHILDREN]} onChange={(v: string) => setEditingItem({...editingItem, gender: v as Gender})} />
                    <Select label="المناسبة" value={editingItem.occasion} options={['DAILY', 'FORMAL', 'SPORTS', 'EVENING', 'CEREMONY', 'ALL']} onChange={(v: string) => setEditingItem({...editingItem, occasion: v})} />
                    <Select label="الموسم" value={editingItem.season} options={['ALL', 'WINTER', 'SUMMER']} onChange={(v: string) => setEditingItem({...editingItem, season: v})} />
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">صورة المعاينة للموديل</label>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                        {editingItem.image && <img src={editingItem.image} alt="Preview" className="h-32 w-full rounded-2xl object-cover mt-2 border border-white/10" />}
                    </div>
                 </>
              )}

              {modalType === 'COLOR' && (
                 <>
                    <Input label="اسم اللون" value={editingItem.name} onChange={(v: string) => setEditingItem({...editingItem, name: v})} />
                    <Input label="كود اللون (Hex)" type="color" value={editingItem.hex} onChange={(v: string) => setEditingItem({...editingItem, hex: v})} />
                    <Select label="التصنيف" value={editingItem.category} options={['BASIC', 'NEUTRAL', 'VIBRANT', 'METALLIC']} onChange={(v: string) => setEditingItem({...editingItem, category: v as any})} />
                 </>
              )}

              {modalType === 'PRICING' && (
                 <>
                    <Select label="الموديل المرتبط" value={editingItem.styleId} options={styles.map(s => s.id)} onChange={(v: string) => setEditingItem({...editingItem, styleId: v as GarmentStyle})} />
                    <Input label="السعر الأساسي (ر.س)" type="number" value={editingItem.basePrice} onChange={(v: string) => setEditingItem({...editingItem, basePrice: parseFloat(v)})} />
                 </>
              )}

              {modalType === 'USER' && (
                <>
                  <Input label="اسم المستخدم" value={editingItem.username} onChange={(v: string) => setEditingItem({...editingItem, username: v})} />
                  <Input label="كلمة المرور" type="password" value={editingItem.password} onChange={(v: string) => setEditingItem({...editingItem, password: v})} placeholder={editingItem.id ? "اتركه فارغاً للحفاظ على كلمة المرور الحالية" : "كلمة مرور للمستخدم الجديد"}/>
                  <Select label="الدور" value={editingItem.role} options={[UserRole.ADMIN, UserRole.MANAGER, UserRole.ASSISTANT, UserRole.VIEWER]} onChange={(v: string) => setEditingItem({...editingItem, role: v as UserRole})} />
                </>
              )}

              <button type="submit" disabled={isUploading} className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl active:scale-95 transition-all ${isUploading ? 'bg-slate-600 cursor-wait' : 'bg-primary hover:bg-blue-600'}`}>
                {isUploading ? 'جاري الرفع...' : 'حفظ التغييرات ✓'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex h-full">
        {/* SIDEBAR */}
        <aside className={`fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-white/5 p-8 flex flex-col gap-6 
                           lg:static lg:translate-x-0 z-[600] 
                           transform transition-transform duration-300 ease-in-out 
                           ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="mb-10 text-center">
              <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-2xl">
                {currentUser.role === UserRole.ADMIN ? '⚙️' : '💼'}
              </div>
              <h2 className="text-2xl font-black text-white">{currentUser.role === UserRole.ADMIN ? 'لوحة الإدارة' : 'لوحة المدير'}</h2>
              <p className="text-slate-500 text-sm">{currentUser.username}</p>
              {(currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN) && (
                  <div className="mt-2 bg-slate-800 rounded-lg py-1 px-3 inline-block">
                      <span className="text-emerald-400 font-mono text-xs tracking-widest">{currentUser.referralCode}</span>
                  </div>
              )}
           </div>
           
           <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
              <SidebarBtn active={activeTab === 'MANAGER_ZONE'} onClick={() => handleTabClick('MANAGER_ZONE')} icon="📊" label="لوحة التحكم" />
              <SidebarBtn active={activeTab === 'SETTINGS'} onClick={() => handleTabClick('SETTINGS')} icon="🔒" label="إعدادات الحساب" />
              
              {currentUser.role === UserRole.ADMIN && (
                <>
                  <div className="pt-4 pb-2"><div className="h-px bg-white/5"></div></div>
                  <SidebarBtn active={activeTab === 'BRANDING'} onClick={() => handleTabClick('BRANDING')} icon="🏢" label="إعدادات الهوية" />
                  <SidebarBtn active={activeTab === 'FABRICS'} onClick={() => handleTabClick('FABRICS')} icon="🧵" label="إدارة الأقمشة" />
                  <SidebarBtn active={activeTab === 'STYLES'} onClick={() => handleTabClick('STYLES')} icon="👗" label="إدارة الموديلات" />
                  <SidebarBtn active={activeTab === 'COLORS'} onClick={() => handleTabClick('COLORS')} icon="🎨" label="إدارة الألوان" />
                  <SidebarBtn active={activeTab === 'PRICING'} onClick={() => handleTabClick('PRICING')} icon="💰" label="إدارة الأسعار" />
                  <SidebarBtn active={activeTab === 'CONFIG'} onClick={() => handleTabClick('CONFIG')} icon="⚙️" label="الإعدادات العامة" />
                  <SidebarBtn active={activeTab === 'USER_MANAGEMENT'} onClick={() => handleTabClick('USER_MANAGEMENT')} icon="👥" label="إدارة المستخدمين" />
                  <SidebarBtn active={activeTab === 'LOGS'} onClick={() => handleTabClick('LOGS')} icon="📋" label="سجل النشاطات" />
                </>
              )}
           </nav>
           
           <div className="space-y-3 mt-4">
               <button onClick={onClose} className="w-full flex items-center justify-center gap-3 py-4 bg-slate-800 text-slate-300 rounded-3xl font-black text-xs hover:bg-slate-700 hover:text-white transition-all border border-white/5">
                 <span className="text-lg">🏠</span>
                 <span>العودة للرئيسية</span>
               </button>
               <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 text-red-500 rounded-3xl font-black text-xs hover:bg-red-500 hover:text-white transition-all border border-red-500/10">
                 <span className="text-lg">🚪</span>
                 <span>تسجيل الخروج</span>
               </button>
           </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-12 bg-dark/20 backdrop-blur-3xl custom-scrollbar lg:mr-80">
           <button onClick={handleSidebarToggle} className="lg:hidden fixed top-6 left-6 z-[601] w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center text-2xl shadow-lg">☰</button>

           {/* 1. MANAGER ZONE */}
           {activeTab === 'MANAGER_ZONE' && (
             <section className="max-w-5xl mx-auto space-y-10">
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 sm:p-12 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
                   <h3 className="text-3xl font-black text-white mb-2 relative z-10">مرحباً, {currentUser.username} 👋</h3>
                   <div className="flex justify-center relative z-10">
                      <div className="w-full max-w-md bg-slate-800/50 p-6 rounded-3xl border border-white/5 backdrop-blur-md flex flex-col justify-between items-center text-center">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">الرمز الخاص</label>
                          <div className="w-full text-center">
                              <span className="text-4xl font-mono font-black text-white tracking-widest block mb-6">{currentUser.referralCode}</span>
                              <button onClick={() => { navigator.clipboard.writeText(currentUser.referralCode!); alert("تم النسخ"); }} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                  <span>نسخ الرمز</span><span>📋</span>
                              </button>
                          </div>
                      </div>
                   </div>
                </div>
                <StatsDashboard orders={liveOrders} branding={branding} /> {/* Use liveOrders here */}
             </section>
           )}

           {/* 2. FABRICS */}
           {activeTab === 'FABRICS' && (
                <div className="bg-slate-900 p-8 rounded-[4rem] border border-white/5 shadow-2xl space-y-8 max-w-6xl mx-auto">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <h3 className="text-2xl font-black text-white">مكتبة الأقمشة</h3>
                        <button onClick={() => openModal('FABRIC')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all">+ إضافة قماش</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {fabrics.map(f => (
                            <div key={f.id} className="bg-slate-800 rounded-3xl p-4 flex gap-4 group hover:bg-slate-700 transition-colors relative">
                                <img src={f.image} alt={f.name} className="w-24 h-24 rounded-2xl object-cover" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-white">{f.name}</h4>
                                    <p className="text-xs text-slate-400 truncate w-32">{f.material}</p>
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => openModal('FABRIC', f)} className="text-[10px] bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20">تعديل</button>
                                        <button onClick={() => handleDelete('FABRIC', f.id)} className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white">حذف</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
           )}

           {/* 3. STYLES */}
           {activeTab === 'STYLES' && (
                <div className="bg-slate-900 p-8 rounded-[4rem] border border-white/5 shadow-2xl space-y-8 max-w-6xl mx-auto">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <h3 className="text-2xl font-black text-white">إدارة الموديلات</h3>
                        <button onClick={() => openModal('STYLE')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all">+ إضافة موديل</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {styles.map(s => (
                            <div key={s.id} className="bg-slate-800 rounded-3xl p-6 relative group hover:border-primary/50 border border-transparent transition-all overflow-hidden">
                                {s.image && <img src={s.image} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />}
                                <div className="relative z-10">
                                    <div className="text-4xl mb-4">{s.icon}</div>
                                    <h4 className="font-bold text-white text-lg">{s.label}</h4>
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{s.description}</p>
                                    <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                        <span className="text-[10px] bg-slate-900 px-2 py-1 rounded text-slate-300">{s.gender}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => openModal('STYLE', s)} className="text-xs bg-white/5 hover:bg-white/10 p-2 rounded-lg">✏️</button>
                                            <button onClick={() => handleDelete('STYLE', s.id)} className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white p-2 rounded-lg">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
           )}

           {/* 4. COLORS */}
           {activeTab === 'COLORS' && (
                <div className="bg-slate-900 p-8 rounded-[4rem] border border-white/5 shadow-2xl space-y-8 max-w-6xl mx-auto">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <h3 className="text-2xl font-black text-white">إدارة الألوان</h3>
                        <button onClick={() => openModal('COLOR')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all">+ إضافة لون</button>
                    </div>
                    <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {colors.map(c => (
                            <div key={c.id} className="group flex flex-col items-center">
                                <button
                                    onClick={() => openModal('COLOR', c)}
                                    className="w-16 h-16 rounded-2xl border-4 transition-all hover:scale-110 shadow-lg"
                                    style={{ backgroundColor: c.hex, borderColor: c.hex === '#FFFFFF' ? '#e2e8f0' : c.hex }}
                                />
                                <span className="text-xs text-slate-400 mt-2 truncate w-full text-center">{c.name}</span>
                                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal('COLOR', c)} className="text-[9px] bg-white/10 px-2 py-1 rounded-lg">تعديل</button>
                                    <button onClick={() => handleDelete('COLOR', c.id)} className="text-[9px] bg-red-500/10 text-red-500 px-2 py-1 rounded-lg">حذف</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
           )}

           {/* 5. PRICING */}
           {activeTab === 'PRICING' && (
                <div className="bg-slate-900 p-8 rounded-[4rem] border border-white/5 shadow-2xl space-y-8 max-w-6xl mx-auto">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <h3 className="text-2xl font-black text-white">إدارة الأسعار</h3>
                        {/* Only allow adding pricing for styles that don't already have one */}
                        {styles.length > pricing.length && (
                             <button onClick={() => openModal('PRICING')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all">+ إضافة قاعدة سعر</button>
                        )}
                    </div>
                    <div className="space-y-4">
                        {styles.map(s => {
                            const pRule = pricing.find(p => p.styleId === s.id);
                            if (!pRule) return null; // Only show styles that have pricing rules

                            return (
                                <div key={s.id} className="bg-slate-800 rounded-3xl p-5 flex items-center justify-between group hover:bg-slate-700 transition-colors">
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{s.label}</h4>
                                        <p className="text-xs text-slate-400">سعر أساسي: {pRule.basePrice} ر.س</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openModal('PRICING', pRule)} className="text-xs bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20">تعديل</button>
                                        <button onClick={() => handleDelete('PRICING', pRule.styleId)} className="text-xs bg-red-500/10 text-red-500 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white">حذف</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
           )}

           {/* 6. CONFIG */}
           {activeTab === 'CONFIG' && (
               <section className="max-w-xl mx-auto space-y-8">
                   <div className="bg-slate-900 p-8 sm:p-12 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                       <h3 className="text-2xl font-black text-white">الإعدادات العامة للتطبيق</h3>
                       <div className="space-y-4">
                           <Checkbox label="تفعيل قسم الأقمشة" checked={config.fabrics} onChange={(c) => setConfig({...config, fabrics: c})} />
                           <Checkbox label="تفعيل قسم الموديلات" checked={config.models} onChange={(c) => setConfig({...config, models: c})} />
                           <Checkbox label="تفعيل قسم الألوان" checked={config.colors} onChange={(c) => setConfig({...config, colors: c})} />
                           <Checkbox label="تفعيل قسم الأسعار" checked={config.prices} onChange={(c) => setConfig({...config, prices: c})} />
                           <Checkbox label="تفعيل قسم الطلبات" checked={config.orders} onChange={(c) => setConfig({...config, orders: c})} />
                           <Input label="تعليمات عامة" value={config.instructions} onChange={(v: string) => setConfig({...config, instructions: v})} />
                       </div>
                       <button onClick={handleSaveConfig} className="w-full py-4 rounded-2xl font-black text-white shadow-xl bg-primary hover:bg-blue-600 transition-all">حفظ الإعدادات العامة</button>
                   </div>
               </section>
           )}

           {/* 7. BRANDING */}
           {activeTab === 'BRANDING' && (
               <section className="max-w-xl mx-auto space-y-8">
                   <div className="bg-slate-900 p-8 sm:p-12 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                       <h3 className="text-2xl font-black text-white">إعدادات الهوية البصرية</h3>
                       <div className="space-y-4">
                           <Input label="اسم الشركة" value={branding.companyName} onChange={(v: string) => setBranding({...branding, companyName: v})} />
                           <Input label="رابط الشعار (URL)" value={branding.logoUrl} onChange={(v: string) => setBranding({...branding, logoUrl: v})} />
                           {branding.logoUrl && <img src={branding.logoUrl} alt="Logo Preview" className="h-20 max-w-full object-contain mx-auto border border-white/10 rounded-lg"/>}
                           <Input label="اللون الأساسي (Hex)" type="color" value={branding.primaryColor} onChange={(v: string) => setBranding({...branding, primaryColor: v})} />
                           <Input label="اللون الثانوي (Hex)" type="color" value={branding.secondaryColor} onChange={(v: string) => setBranding({...branding, secondaryColor: v})} />
                           <Input label="خط النص (Font Family)" value={branding.fontFamily} onChange={(v: string) => setBranding({...branding, fontFamily: v})} />
                           <Select label="موضع الشعار" value={branding.logoPosition} options={['top-left', 'top-right', 'bottom-left', 'bottom-right']} onChange={(v: string) => setBranding({...branding, logoPosition: v as any})} />
                       </div>
                       <button onClick={handleSaveBranding} className="w-full py-4 rounded-2xl font-black text-white shadow-xl bg-primary hover:bg-blue-600 transition-all">حفظ الهوية</button>
                   </div>
               </section>
           )}

           {/* 8. USER MANAGEMENT */}
           {activeTab === 'USER_MANAGEMENT' && currentUser.role === UserRole.ADMIN && (
                <div className="bg-slate-900 p-8 rounded-[4rem] border border-white/5 shadow-2xl space-y-8 max-w-6xl mx-auto">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <h3 className="text-2xl font-black text-white">إدارة المستخدمين</h3>
                        <button onClick={() => openModal('USER')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all">+ إضافة مستخدم</button>
                    </div>
                    <div className="space-y-4">
                        {liveUsers.map(u => (
                            <div key={u.id} className="bg-slate-800 rounded-3xl p-5 flex items-center justify-between group hover:bg-slate-700 transition-colors">
                                <div>
                                    <h4 className="font-bold text-white text-lg">{u.username}</h4>
                                    <p className="text-xs text-slate-400">الدور: {u.role}</p>
                                    {u.referralCode && <p className="text-xs text-emerald-400 font-mono">الرمز: {u.referralCode}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal('USER', u)} className="text-xs bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20">تعديل</button>
                                    <button onClick={() => handleDelete('USER', u.id)} className="text-xs bg-red-500/10 text-red-500 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white">حذف</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
           )}

           {/* 9. SETTINGS (User's own password change) */}
           {activeTab === 'SETTINGS' && (
             <section className="max-w-xl mx-auto space-y-8">
                <div className="bg-slate-900 p-8 sm:p-12 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                   <h3 className="text-2xl font-black text-white">إعدادات الحساب</h3>
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">اسم المستخدم</label>
                         <input value={currentUser.username} readOnly className="w-full bg-slate-800/50 border border-white/5 p-4 rounded-2xl text-slate-400 font-bold text-sm cursor-not-allowed" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">كلمة المرور الجديدة</label>
                         <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="أدخل كلمة مرور جديدة..." className="w-full bg-slate-800 border border-white/10 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary" />
                      </div>
                      <button onClick={handlePasswordUpdate} disabled={!newPassword} className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all ${newPassword ? 'bg-primary hover:bg-blue-600' : 'bg-slate-700 opacity-50'}`}>تحديث كلمة المرور</button>
                   </div>
                </div>
             </section>
           )}

        </main>
      </div>
    </div>
  );
};

// UI Helpers
const SidebarBtn = ({ active, onClick, icon, label, disabled = false }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all font-black text-sm 
               ${active ? 'bg-primary text-white shadow-2xl scale-[1.05]' : 'text-slate-500 hover:bg-white/5'}
               ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    disabled={disabled}
  >
    <span className="text-2xl">{icon}</span>
    <span className="tracking-tight">{label}</span>
  </button>
);

const Input = ({ label, value, onChange, type = "text", placeholder }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-slate-500">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none" />
  </div>
);

const Select = ({ label, value, options, onChange }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-slate-500">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none text-sm">
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange }: any) => (
    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800 rounded-xl border border-white/5 hover:border-primary/20 transition-colors">
        <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => onChange(e.target.checked)} 
            className="w-5 h-5 accent-primary rounded-md"
        />
        <span className="text-sm font-bold text-white">{label}</span>
    </label>
);

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