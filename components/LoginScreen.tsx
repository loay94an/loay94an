
import React, { useState } from 'react';
import { User, BrandingSettings, UserRole } from '../types';

interface Props {
  onLogin: (user: User) => void;
  onRegister: (username: string, password: string, role: UserRole) => Promise<User | null>; // Changed return type
  allUsers: User[]; // List of all registered users
  branding: BrandingSettings;
  onBackToHub: () => void; 
}

export const LoginScreen: React.FC<Props> = ({ onLogin, onRegister, allUsers, branding, onBackToHub }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN); // Default to Admin
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimUser = username.trim();
    const trimPass = password.trim();

    if (!trimUser || !trimPass) {
        setError('الرجاء إدخال اسم المستخدم وكلمة المرور.');
        return;
    }

    if (isRegistering) {
        // Registration Logic
        if (allUsers.some(u => u.username === trimUser)) {
            setError('اسم المستخدم هذا مسجل مسبقاً.');
            return;
        }

        setLoading(true);
        // We now expect a full User object (including generated referralCode) or null
        const registeredUser = await onRegister(trimUser, trimPass, role);
        setLoading(false);

        if (registeredUser) {
            alert('✅ تم إنشاء الحساب بنجاح! سيتم تسجيل دخولك الآن.');
            // Log in with the complete user object containing the ID and Code
            onLogin(registeredUser);
        } else {
            setError('حدث خطأ أثناء إنشاء الحساب. الرجاء المحاولة مرة أخرى.');
        }

    } else {
        // Login Logic
        const user = allUsers.find(u => u.username === trimUser && u.password === trimPass);
        if (user) {
          onLogin(user);
        } else {
          setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
        }
    }
  };

  const toggleMode = () => {
      setIsRegistering(!isRegistering);
      setError('');
      setUsername('');
      setPassword('');
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6 animate-in fade-in duration-500" style={{ fontFamily: branding.fontFamily }}>
      <div className="bg-slate-900 rounded-[4rem] p-8 sm:p-12 border border-white/5 shadow-2xl max-w-lg w-full text-center space-y-8 relative pt-16">
        <button 
          onClick={onBackToHub} 
          className="absolute top-8 right-8 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg group"
          title="العودة للقائمة الرئيسية"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>

        <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-2xl rotate-3" style={{ backgroundColor: branding.primaryColor }}>
            {isRegistering ? '👤' : '🔐'}
        </div>
        
        <h2 className="text-4xl font-black text-white mb-2" style={{ color: branding.primaryColor }}>
            {isRegistering ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
        </h2>
        <p className="text-slate-500 font-medium mb-10">
            {isRegistering ? 'أدخل بياناتك للانضمام إلى فريق التطوير.' : 'الرجاء إدخال بيانات الاعتماد للمتابعة إلى لوحة تحكم المطور.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-right">
            <label htmlFor="username" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">اسم المستخدم</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-white/5 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/40 font-bold text-white placeholder:text-slate-700"
              placeholder="البريد الإلكتروني أو اسم المستخدم"
              required
            />
          </div>
          
          <div className="space-y-2 text-right">
            <label htmlFor="password" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">كلمة المرور</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-white/5 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/40 font-bold text-white placeholder:text-slate-700"
              placeholder="كلمة المرور"
              required
            />
          </div>

          {isRegistering && (
             <div className="space-y-2 text-right animate-in fade-in slide-in-from-top-2">
                <label htmlFor="role" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">نوع الصلاحية</label>
                <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-800 border border-white/5 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/40 font-bold text-white text-sm"
                >
                    <option value={UserRole.ADMIN}>مدير عام (Admin)</option>
                    <option value={UserRole.ASSISTANT}>مساعد (Assistant)</option>
                    <option value={UserRole.VIEWER}>مشاهد (Viewer)</option>
                </select>
             </div>
          )}

          {error && (
            <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-500/20" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-primary text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-primary/30 active:scale-95 hover:scale-[1.02] transition-all ${loading ? 'opacity-70 cursor-wait' : ''}`}
            style={{ backgroundColor: branding.primaryColor }}
          >
            {loading ? 'جاري المعالجة...' : (isRegistering ? 'إنشاء الحساب' : 'تسجيل الدخول')}
          </button>
        </form>

        <div className="pt-4 border-t border-white/5">
             <button 
                onClick={toggleMode}
                className="text-slate-400 text-sm font-bold hover:text-white transition-colors"
             >
                {isRegistering ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
             </button>
        </div>
      </div>
    </div>
  );
};
