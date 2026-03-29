
// ... (existing imports)
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { AppStep, Gender, Measurements, Fabric, GarmentStyle, FabricColor, PatternDesign, BrandingSettings, ActivityLog, Order, StyleItem, PricingRule, SectionConfig, User, UserRole, SleeveType, CollarType } from './types';
import { STANDARD_SIZES, INITIAL_COLORS, PATTERNS, INITIAL_FABRICS, INITIAL_STYLES, INITIAL_PRICING, INITIAL_USERS, TRANSLATIONS } from './constants'; 
import { db, storage } from './firebase'; 
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, writeBatch, addDoc } from 'firebase/firestore';

// Component Imports
import { LoginScreen } from './components/LoginScreen';
import { DevDashboard } from './components/DevDashboard';
import { GenderSelection } from './components/GenderSelection';
import { SizeInput } from './components/SizeInput';
import { FabricSelection } from './components/FabricSelection';
import { ColorSelection } from './components/ColorSelection';
import { StyleSelection } from './components/StyleSelection';
import { PatternEditor } from './components/PatternEditor';
import { Checkout } from './components/Checkout';
import { PaymentStep } from './components/PaymentStep';
import { StepProgressBar } from './components/StepProgressBar';

// Helper to generate 6-char code
const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const HubCard = ({ title, desc, icon, onClick, primary, color, disabled }: any) => (
  <button 
    onClick={onClick}
    className={`relative group overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-500 text-right flex flex-col justify-between h-64 shadow-2xl ${
      disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02]'
    } ${
      primary 
        ? 'bg-primary border-primary text-white' 
        : 'bg-slate-900 border-white/5 hover:border-white/10 text-white'
    }`}
    style={color && !disabled ? { backgroundColor: primary ? color : undefined, borderColor: color ? color : undefined } : {}}
  >
    <div className={`absolute top-0 left-0 w-32 h-32 rounded-full blur-[60px] transition-all duration-700 group-hover:blur-[80px] ${primary ? 'bg-white/20' : 'bg-primary/10'}`} style={color && !disabled ? { backgroundColor: primary ? 'rgba(255,255,255,0.2)' : color } : {}} />
    
    <div className="relative z-10">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg transition-transform duration-500 group-hover:rotate-6 ${
         primary ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-200'
      }`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-2 leading-tight">{title}</h3>
      <p className={`text-sm font-medium leading-relaxed ${primary ? 'text-blue-100' : 'text-slate-500'}`}>{desc}</p>
    </div>

    <div className={`relative z-10 self-end mt-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-[-5px] ${
       primary ? 'bg-white text-primary' : 'bg-slate-800 text-slate-400'
    }`} style={color && primary && !disabled ? { color: color } : {}}>
      {disabled ? '🔒' : '➜'}
    </div>
  </button>
);

// --- MAIN CONTENT COMPONENT ---
const StoreContent: React.FC = () => {
  const { code } = useParams<{ code: string }>(); // Get referral CODE from URL
  const navigate = useNavigate();

  const [step, setStep] = useState<AppStep | 'HUB'>('HUB');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [gender, setGender] = useState<Gender | null>(null);
  const [style, setStyle] = useState<GarmentStyle | null>(null);
  const [measurements, setMeasurements] = useState<Measurements>(STANDARD_SIZES['M']);
  const [fabric, setFabric] = useState<Fabric | null>(INITIAL_FABRICS[0]);
  const [selectedColor, setSelectedColor] = useState<FabricColor | null>(INITIAL_COLORS[0]);
  const [selectedPattern, setSelectedPattern] = useState<PatternDesign | null>(PATTERNS[0]);
  const [clientPhotoUrl, setClientPhotoUrl] = useState<string | null>(null);
  const [referralManager, setReferralManager] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  
  const txt = TRANSLATIONS[language];
  const onBackToHub = () => setStep('HUB');

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('smart_tailor_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // --- REFERRAL LOGIC REUSABLE FUNCTION ---
  const handleCodeVerification = async (enteredCode: string) => {
    if (!enteredCode) return;
    
    let resolvedUsername = null;

    // 1. Cloud Check
    if (db) {
        try {
            const refDoc = await getDoc(doc(db, 'referrals', enteredCode));
            if (refDoc.exists()) {
                resolvedUsername = refDoc.data().username;
            }
        } catch (e) { console.error("Error resolving code from cloud", e); }
    }

    // 2. Local Fallback
    if (!resolvedUsername) {
         const localUser = JSON.parse(localStorage.getItem('smart_tailor_all_users') || '[]').find((u: User) => u.referralCode === enteredCode);
         if (localUser) resolvedUsername = localUser.username;
    }

    if (resolvedUsername) {
        setReferralManager(resolvedUsername);
        localStorage.setItem('smart_tailor_manager_ref', resolvedUsername);
        setCodeError('');
    } else {
        setCodeError(txt.invalidCode);
    }
  };

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await handleCodeVerification(codeInput.trim().toUpperCase());
  };

  // --- ROUTING LOGIC (URL PARAM) ---
  useEffect(() => {
    if (code) {
        handleCodeVerification(code);
    } else {
        const stored = localStorage.getItem('smart_tailor_manager_ref');
        if (stored) setReferralManager(stored);
    }
  }, [code]);

  // --- DATA SYNC & INIT ---
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('smart_tailor_logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Orders are primarily managed by the real-time listener in DevDashboard.
  const [orders, setOrders] = useState<Order[]>([]); 

  const [fabrics, setFabrics] = useState<Fabric[]>(() => {
    const saved = localStorage.getItem('smart_tailor_fabrics');
    return saved ? JSON.parse(saved) : INITIAL_FABRICS;
  });

  const [styles, setStyles] = useState<StyleItem[]>(() => {
    const saved = localStorage.getItem('smart_tailor_styles');
    return saved ? JSON.parse(saved) : INITIAL_STYLES;
  });

  const [colors, setColors] = useState<FabricColor[]>(() => {
    const saved = localStorage.getItem('smart_tailor_colors');
    return saved ? JSON.parse(saved) : INITIAL_COLORS;
  });

  const [pricing, setPricing] = useState<PricingRule[]>(() => {
    const saved = localStorage.getItem('smart_tailor_pricing');
    return saved ? JSON.parse(saved) : INITIAL_PRICING;
  });

  const [savedProfiles, setSavedProfiles] = useState<any[]>(() => {
    const saved = localStorage.getItem('smart_tailor_profiles');
    return saved ? JSON.parse(saved) : [];
  });

  const [userId] = useState<string>("guest_" + Math.random().toString(36).substr(2, 9));
  
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('smart_tailor_all_users');
    let loadedUsers = saved ? JSON.parse(saved) : [];
    
    // Ensure initial admin user is always present
    const defaultAdmin = INITIAL_USERS[0];
    const adminExists = loadedUsers.some((u: User) => u.username === defaultAdmin.username);
    
    if (!adminExists) {
        loadedUsers = [...loadedUsers, defaultAdmin];
    }
    
    // Only return default if there are no other users
    if (loadedUsers.length === 0) return INITIAL_USERS;
    return loadedUsers;
  });

  const [config, setConfig] = useState<SectionConfig>(() => {
    const savedConfig = localStorage.getItem('smart_tailor_config');
    return savedConfig ? JSON.parse(savedConfig) : {
      fabrics: true,
      models: true,
      colors: true,
      prices: true,
      orders: true,
      instructions: "مرحباً بك في لوحة تحكم المطور. هنا يمكنك إدارة جميع جوانب تطبيقك."
    };
  });

  const [branding, setBranding] = useState<BrandingSettings>(() => {
    const saved = localStorage.getItem('smart_tailor_branding');
    return saved ? JSON.parse(saved) : {
      companyName: "الخياط الذكي برو",
      logoUrl: "",
      primaryColor: "#2563eb",
      secondaryColor: "#f50057",
      fontFamily: "Tajawal",
      logoPosition: "top-right"
    };
  });

  // --- LOCALSTORAGE SYNC ---
  useEffect(() => { localStorage.setItem('smart_tailor_fabrics', JSON.stringify(fabrics)); }, [fabrics]);
  useEffect(() => { localStorage.setItem('smart_tailor_styles', JSON.stringify(styles)); }, [styles]);
  useEffect(() => { localStorage.setItem('smart_tailor_colors', JSON.stringify(colors)); }, [colors]);
  useEffect(() => { localStorage.setItem('smart_tailor_pricing', JSON.stringify(pricing)); }, [pricing]);
  useEffect(() => { localStorage.setItem('smart_tailor_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('smart_tailor_logs', JSON.stringify(activityLogs)); }, [activityLogs]);
  useEffect(() => { localStorage.setItem('smart_tailor_profiles', JSON.stringify(savedProfiles)); }, [savedProfiles]);
  useEffect(() => { localStorage.setItem('smart_tailor_all_users', JSON.stringify(allUsers)); }, [allUsers]);
  useEffect(() => { localStorage.setItem('smart_tailor_config', JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem('smart_tailor_branding', JSON.stringify(branding)); }, [branding]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const addLog = (action: string, details: string) => {
    const newLog = { id: Date.now().toString(), action, details, timestamp: Date.now() };
    setActivityLogs([newLog, ...activityLogs].slice(0, 50));
  };
  
  const handleSaveProfile = (name: string, m: Measurements) => {
      setSavedProfiles([...savedProfiles, { id: Date.now().toString(), name, measurements: m, createdAt: Date.now() }]);
      addLog("حفظ مقاسات", name);
  };

  const handleDeleteProfile = (id: string) => {
      setSavedProfiles(savedProfiles.filter(p => p.id !== id));
  };

  const handleLogin = (user: User) => {
    if (!user.referralCode) {
        user.referralCode = generateReferralCode();
        const updatedAll = allUsers.map(u => u.id === user.id ? user : u);
        setAllUsers(updatedAll);
    }
    setCurrentUser(user);
    localStorage.setItem('smart_tailor_user', JSON.stringify(user));
    setStep(AppStep.DEV_DASHBOARD);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('smart_tailor_user');
    setStep('HUB');
    navigate('/'); 
  };

  const handleUpdateUser = async (updatedUser: User): Promise<boolean> => {
    const newUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    setAllUsers(newUsers);
    
    if (currentUser && currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
        localStorage.setItem('smart_tailor_user', JSON.stringify(updatedUser));
    }

    if (db) {
      try {
        await setDoc(doc(db, "users", updatedUser.id), updatedUser, { merge: true });
        if (updatedUser.referralCode) {
            await setDoc(doc(db, "referrals", updatedUser.referralCode), { username: updatedUser.username, userId: updatedUser.id }, { merge: true });
        }
        return true;
      } catch (e) { 
        console.error("Error updating user in Firebase", e);
        return false;
      }
    }
    return true;
  };

  const handleAddUser = async (username: string, password: string, role: UserRole): Promise<User | null> => {
    const newUserId = username.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
    const refCode = generateReferralCode();
    
    const newUser: User = { id: newUserId, username, password, role, referralCode: refCode };
    const updatedUsers = [...allUsers, newUser];
    setAllUsers(updatedUsers);
    
    if (db) {
      try {
        const fullLink = `${window.location.origin}/#/ref/${refCode}`;
        await setDoc(doc(db, "users", newUserId), { ...newUser, createdAt: Date.now(), link: fullLink }); 
        await setDoc(doc(db, "referrals", refCode), { username: username, userId: newUserId, createdAt: Date.now() });
        await setDoc(doc(db, 'system', 'users_list'), { list: updatedUsers }, { merge: true });
        return newUser;
      } catch (e) { 
        console.warn("Cloud save failed for new user", e); 
        return null;
      }
    }
    return newUser;
  };

  const handleDeleteUser = async (userIdToDelete: string) => {
    const userToDelete = allUsers.find(u => u.id === userIdToDelete);
    if (!userToDelete) return;
    const remainingUsers = allUsers.filter(u => u.id !== userIdToDelete);
    setAllUsers(remainingUsers);

    if (db) {
      try {
        await deleteDoc(doc(db, "users", userIdToDelete));
        if (userToDelete.referralCode) {
            await deleteDoc(doc(db, "referrals", userToDelete.referralCode));
        }
        await setDoc(doc(db, 'system', 'users_list'), { list: remainingUsers }, { merge: true });
      } catch (e) { console.error("Error deleting user from Firebase", e); }
    }
  };

  const handleCompleteOrder = async (newOrder: Order): Promise<boolean> => {
    addLog("طلب جديد", `تم استلام طلب جديد من ${newOrder.customerName}`);

    if (!db) {
        alert("⚠️ خطأ في التهيئة: مفاتيح Firebase غير موجودة أو غير صحيحة.\n\nإذا كنت المطور، يرجى الذهاب إلى إعدادات Netlify -> Environment Variables وإضافة مفاتيح Firebase الخاصة بك (VITE_FIREBASE_API_KEY، إلخ).");
        return false; 
    }

    try {
        // FIX: Using JSON serialization/deserialization is the most robust way 
        // to strip 'undefined' values which cause Firestore write errors.
        const safeOrder = JSON.parse(JSON.stringify(newOrder));

        // 1. Create Order
        await addDoc(collection(db, 'orders'), safeOrder);
        
        // 2. Update Stats (Non-Critical Operation)
        if (newOrder.managerId) {
            try {
                const statsRef = doc(db, 'stats', newOrder.managerId);
                const statsSnap = await getDoc(statsRef);
                const currentStats = statsSnap.exists() ? statsSnap.data() : { totalOrders: 0, revenue: 0 };
                await setDoc(statsRef, {
                    totalOrders: (currentStats.totalOrders || 0) + 1,
                    revenue: (currentStats.revenue || 0) + newOrder.details.totalPrice,
                    activeClients: (currentStats.activeClients || 0) + 1, 
                    updatedAt: Date.now()
                }, { merge: true });
            } catch (statsErr) {
                console.warn("Could not update manager stats. Order preserved.", statsErr);
            }
        }
        
        setStep(AppStep.SUCCESS);
        return true; 

    } catch (e: any) { 
        console.error("Failed to save order to Firestore", e); 
        alert(`فشل حفظ الطلب. التفاصيل: ${e.message || "خطأ غير معروف"}. يرجى التحقق من اتصال الإنترنت وقواعد الأمان.`);
        return false; 
    }
  };

  const calculatePrice = () => {
      const base = pricing.find(p => p.styleId === style)?.basePrice || 350; 
      const mult = fabric ? (pricing.find(p => p.styleId === style)?.fabricMultipliers?.[fabric.id] || 1.0) : 1.0;
      return Math.round(base * mult);
  };

  const getNextStepLabel = () => {
    if (step === AppStep.GENDER_SELECTION) return txt.nextToSizes;
    if (step === AppStep.SIZE_INPUT) return txt.nextToStyles;
    if (step === AppStep.STYLE_SELECTION) return txt.nextToFabrics;
    if (step === AppStep.FABRIC_SELECTION) return txt.nextToPattern;
    if (step === AppStep.PATTERN_EDITOR) return txt.nextToExport;
    if (step === AppStep.EXPORT) return txt.nextToPay;
    return txt.nextStep;
  };

  const renderContent = () => {
    if (step === AppStep.LOGIN) {
      return <LoginScreen onLogin={handleLogin} onRegister={handleAddUser} allUsers={allUsers} branding={branding} onBackToHub={onBackToHub} />;
    }
    if (step === AppStep.DEV_DASHBOARD) {
       if (!currentUser) return <LoginScreen onLogin={handleLogin} onRegister={handleAddUser} allUsers={allUsers} branding={branding} onBackToHub={onBackToHub} />;
       return <DevDashboard 
            fabrics={fabrics} setFabrics={setFabrics} 
            styles={styles} setStyles={setStyles} 
            colors={colors} setColors={setColors} 
            pricing={pricing} setPricing={setPricing} 
            orders={orders} setOrders={setOrders}
            branding={branding} setBranding={setBranding} 
            config={config} setConfig={setConfig} 
            onClose={() => setStep('HUB')} 
            activityLogs={activityLogs} currentUser={currentUser} allUsers={allUsers}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onUpdateUserRole={() => {}}
            onDeleteUser={handleDeleteUser}
            onLogout={handleLogout} db={db} 
          />;
    }
    if (step === 'HUB') {
        return (
            <div className="w-full max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 animate-in fade-in duration-1000">
              {referralManager && (
                <div className="w-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-3 shadow-lg backdrop-blur-md mb-8">
                    <span>🛍️</span>
                    <span className="font-bold">{txt.shoppingWith}</span>
                    <span className="font-black underline">{referralManager}</span>
                    <button onClick={() => { setReferralManager(null); localStorage.removeItem('smart_tailor_manager_ref'); }} className="text-xs bg-slate-800 px-3 py-1 rounded-lg text-slate-300 hover:text-white">{txt.changeManager}</button>
                </div>
              )}
              <header className="flex flex-col md:flex-row justify-between items-center mb-10 sm:mb-16 gap-6 sm:gap-8">
                 <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-3xl flex items-center justify-center text-4xl sm:text-5xl shadow-2xl rotate-3" style={{ backgroundColor: branding.primaryColor }}>🧵</div>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter" style={{ color: branding.primaryColor, fontFamily: branding.fontFamily }}>{branding.companyName}</h1>
                 </div>
                 <button onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} className="px-6 sm:px-8 py-3 sm:py-4 bg-slate-800 rounded-2xl border border-white/5 font-black text-xs hover:bg-slate-700 transition-all flex items-center gap-3 w-full md:w-auto justify-center">🌐 {txt.switchLang}</button>
              </header>
              {!referralManager && (
                  <div className="mb-12 bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 max-w-2xl mx-auto shadow-2xl">
                      <h3 className="text-center text-white font-black text-xl mb-2">{txt.enterCodeTitle}</h3>
                      <p className="text-center text-slate-400 text-sm mb-6">{txt.enterCodeDesc}</p>
                      <form onSubmit={handleManualCodeSubmit} className="flex flex-col sm:flex-row gap-4">
                          <input type="text" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder={txt.codePlaceholder} className="flex-1 bg-slate-800 border border-white/10 rounded-2xl p-4 text-white text-center font-mono font-bold uppercase tracking-widest outline-none focus:border-primary transition-all" maxLength={6} />
                          <button type="submit" className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-600 transition-all active:scale-95 whitespace-nowrap" style={{ backgroundColor: branding.primaryColor }}>{txt.validateCode}</button>
                      </form>
                      {codeError && <p className="text-red-500 text-xs font-bold text-center mt-3 animate-pulse">{codeError}</p>}
                  </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                 <HubCard 
                    title={txt.personalDesignerTitle}
                    desc={txt.personalDesignerDesc} 
                    icon="🤝" 
                    onClick={() => {
                        if (referralManager) {
                            setStep(AppStep.GENDER_SELECTION);
                        } else {
                            setCodeError(language === 'ar' ? "الرجاء إدخال الرمز أعلاه للمتابعة" : "Please enter code above to proceed");
                            const input = document.querySelector('input[type="text"]');
                            if(input instanceof HTMLElement) input.focus();
                        }
                    }} 
                    primary={!!referralManager}
                    color={referralManager ? '#10b981' : undefined}
                    disabled={false} 
                 />
                 <HubCard 
                    title={txt.mainDesignerTitle}
                    desc={txt.mainDesignerDesc} 
                    icon="✂️" 
                    onClick={() => setStep(AppStep.GENDER_SELECTION)} 
                    primary 
                    color={branding.primaryColor} 
                 />
                 <HubCard 
                    title={currentUser ? (currentUser.role === UserRole.ADMIN ? txt.devDashboard : 'لوحة المدير') : txt.devDashboard} 
                    desc={currentUser ? 'إدارة الطلبات والحساب' : txt.devDesc} 
                    icon="⚙️" 
                    onClick={() => currentUser ? setStep(AppStep.DEV_DASHBOARD) : setStep(AppStep.LOGIN)} 
                    color={branding.secondaryColor} 
                 />
              </div>
            </div>
        );
    }
    
    switch (step) {
      case AppStep.GENDER_SELECTION: 
         return <GenderSelection selected={gender} onSelect={(g) => { setGender(g); setStep(AppStep.SIZE_INPUT); }} branding={branding} onBackToHub={onBackToHub} language={language} />;
      case AppStep.SIZE_INPUT: 
        return <SizeInput 
          userId={userId} value={measurements} onChange={setMeasurements} gender={gender} style={style} fabric={fabric} color={selectedColor} pattern={selectedPattern}
          savedProfiles={savedProfiles} onSaveProfile={handleSaveProfile} onDeleteProfile={handleDeleteProfile} onSelectProfile={setMeasurements} 
          branding={branding} onBackToHub={onBackToHub} language={language} onImageChange={setClientPhotoUrl} 
        />;
      case AppStep.STYLE_SELECTION: 
        return <StyleSelection gender={gender!} selected={style} onSelect={(s) => { setStyle(s); setStep(AppStep.FABRIC_SELECTION); }} availableStyles={styles.filter(s => s.gender === gender && config.models)} branding={branding} onBackToHub={onBackToHub} language={language} />;
      case AppStep.FABRIC_SELECTION: 
         return <FabricSelection selected={fabric} onSelect={(f) => { setFabric(f); setStep(AppStep.PATTERN_EDITOR); }} fabrics={fabrics.filter(() => config.fabrics)} branding={branding} onBackToHub={onBackToHub} language={language} />;
      case AppStep.PATTERN_EDITOR: 
         return <PatternEditor 
            gender={gender!} style={style!} measurements={measurements} onUpdate={(m) => setMeasurements(m)} 
            branding={branding} onBackToHub={onBackToHub} language={language} onImageChange={setClientPhotoUrl} 
         />;
      case AppStep.EXPORT: 
         return <Checkout orderDetails={{ gender: gender!, style: style!, measurements, fabric: fabric!, color: selectedColor!, pattern: selectedPattern!, sleeveType: SleeveType.BASIC, collarType: CollarType.NONE, totalPrice: calculatePrice(), clientPhotoUrl: clientPhotoUrl || null } as any} onConfirm={() => {}} onNext={() => setStep(AppStep.PAYMENT)} branding={branding} onBackToHub={onBackToHub} language={language} />;
      case AppStep.PAYMENT: 
         return <PaymentStep 
            orderDetails={{ gender: gender!, style: style!, measurements, fabric: fabric!, color: selectedColor!, pattern: selectedPattern!, sleeveType: SleeveType.BASIC, collarType: CollarType.NONE, totalPrice: calculatePrice(), clientPhotoUrl: clientPhotoUrl || null }} 
            onConfirm={handleCompleteOrder} 
            onBack={() => setStep(AppStep.EXPORT)} 
            branding={branding} 
            language={language} 
            referralManager={referralManager} // PASSING THE PROP
         />;
      case AppStep.SUCCESS: 
         return <div className="text-center py-20 sm:py-32 animate-in zoom-in duration-700"><div className="text-7xl sm:text-9xl mb-8 sm:mb-12">🎉</div><h2 className="text-3xl sm:text-5xl font-black text-white mb-6">{language === 'ar' ? 'تم الطلب بنجاح' : 'Order Placed'}</h2><button onClick={() => setStep('HUB')} className="bg-primary px-8 sm:px-12 py-4 sm:py-6 rounded-3xl font-black text-white text-lg sm:text-xl shadow-2xl" style={{ backgroundColor: branding.primaryColor }}>{txt.backToHome}</button></div>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark text-slate-200 selection:bg-primary/30" style={{ fontFamily: branding.fontFamily }}>
      {step !== 'HUB' && step !== AppStep.DEV_DASHBOARD && step !== AppStep.SUCCESS && step !== AppStep.LOGIN && (
        <header className="sticky top-0 z-[100] glass px-4 sm:px-8 h-20 sm:h-24 flex items-center justify-between border-b border-white/5">
           <div className="flex items-center gap-2 sm:gap-4 cursor-pointer" onClick={() => setStep('HUB')}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-xl" style={{ backgroundColor: branding.primaryColor }}>🧵</div>
              <h1 className="text-lg sm:text-2xl font-black text-white hidden sm:block">{branding.companyName}</h1>
           </div>
           <StepProgressBar currentStep={step as AppStep} />
           {currentUser ? (
             <button onClick={handleLogout} className="w-fit px-4 sm:px-6 py-2 sm:py-3 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all border border-red-500/20 text-xs font-black">{txt.logout}</button>
           ) : (
             <button onClick={() => setStep('HUB')} className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5">✕</button>
           )}
        </header>
      )}
      <main className="container mx-auto py-4 sm:py-10 px-4 sm:px-0">
         {renderContent()}
      </main>
      
      {typeof step === 'number' && step < AppStep.PAYMENT && step !== AppStep.LOGIN && (
        <nav className="fixed bottom-0 left-0 right-0 z-[200] glass px-4 sm:px-8 py-4 sm:py-6 pb-8 sm:pb-12 flex items-center justify-center border-t border-white/5">
           <button 
             onClick={() => {
                if (step === AppStep.GENDER_SELECTION) setStep(AppStep.SIZE_INPUT);
                else if (step === AppStep.SIZE_INPUT) setStep(AppStep.STYLE_SELECTION);
                else if (step === AppStep.STYLE_SELECTION) setStep(AppStep.FABRIC_SELECTION);
                else if (step === AppStep.FABRIC_SELECTION) setStep(AppStep.PATTERN_EDITOR);
                else if (step === AppStep.PATTERN_EDITOR) setStep(AppStep.EXPORT);
                else if (step === AppStep.EXPORT) setStep(AppStep.PAYMENT);
             }} 
             className="w-full sm:w-auto bg-primary text-white px-8 sm:px-24 py-4 sm:py-6 rounded-3xl font-black text-xl sm:text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 sm:gap-6" 
             style={{ backgroundColor: branding.primaryColor }}
           >
              <span>{getNextStepLabel()}</span><span className="text-2xl sm:text-3xl">{language === 'ar' ? '←' : '→'}</span>
           </button>
        </nav>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<StoreContent />} />
        <Route path="/ref/:code" element={<StoreContent />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
