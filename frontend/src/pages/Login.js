import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BRANDING from '../branding';
import BrandLogo from '../components/BrandLogo';
import { ShieldCheck, UserCheck, GraduationCap, Users, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

const Login = () => {
  const [activeTab, setActiveTab] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const roleConfig = {
    admin: {
      label: 'Admin',
      icon: ShieldCheck,
      placeholder: 'afnanjaved38@gmail.com',
      color: 'blue'
    },
    teacher: {
      label: 'Teacher',
      icon: UserCheck,
      placeholder: 'teacher@school.com',
      color: 'indigo'
    },
    student: {
      label: 'Student',
      icon: GraduationCap,
      placeholder: 'student@school.com or STU-1001',
      color: 'emerald'
    },
    parent: {
      label: 'Parent',
      icon: Users,
      placeholder: 'parent@school.com or P-1001',
      color: 'violet'
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email.trim(), password, activeTab);
      toast.success(`Welcome to ${activeTab.toUpperCase()} Portal!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10 group transform transition-all duration-700">
          <div className="inline-flex mb-6 group-hover:scale-110 transition-transform">
            <BrandLogo size="lg" className="border-4 border-slate-200" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase mb-2">{BRANDING.productName}</h1>
          <p className="text-blue-400 font-black tracking-[0.2em] uppercase text-xs">{BRANDING.tagline}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {/* 4 Icon-based Tabs */}
          <div className="flex p-2 bg-slate-950/60 gap-1.5 border-b border-slate-800/40">
            {Object.keys(roleConfig).map((roleKey) => {
              const config = roleConfig[roleKey];
              const Icon = config.icon;
              const isActive = activeTab === roleKey;
              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => {
                    setActiveTab(roleKey);
                    setEmail('');
                    setPassword('');
                  }}
                  title={`${config.label} Portal`}
                  className={`flex-1 flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl transition-all duration-300 relative group ${
                    isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]' 
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-white' : 'group-hover:text-blue-400 transition-colors'} />
                  <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">
                  {roleConfig[activeTab].label} Email / ID
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={roleConfig[activeTab].placeholder}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-6 py-5 rounded-2xl focus:ring-4 focus:ring-blue-600/20 outline-none transition-all placeholder:text-slate-700 font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 text-white px-6 py-5 rounded-2xl focus:ring-4 focus:ring-blue-600/20 outline-none transition-all placeholder:text-slate-700 font-bold text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center group uppercase text-xs tracking-[0.2em]"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <span>Sign In To Portal</span>
                )}
              </button>
            </form>
          </div>
        </div>
        
        <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.25em] mt-12">
          {BRANDING.poweredBy}
        </p>
        <p className="text-center text-slate-600 text-[9px] font-bold uppercase tracking-[0.2em] mt-2">
          {BRANDING.copyright}
        </p>
      </div>
    </div>
  );
};

export default Login;
