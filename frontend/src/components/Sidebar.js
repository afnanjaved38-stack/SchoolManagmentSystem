import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import { AuthContext } from '../context/AuthContext';
import BRANDING from '../branding';
import BrandLogo from './BrandLogo';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  UserSquare2, 
  CalendarCheck, 
  Wallet, 
  LogOut,
  GraduationCap,
  Clock,
  Settings,
  X,
  Calendar,
  ClipboardList,
  Award,
  AlertCircle,
  FileText,
  TrendingUp,
  CheckSquare,
  Sun,
  Sparkles,
  Bot
} from 'lucide-react';

const Sidebar = ({ onClose }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [portalSettings, setPortalSettings] = useState(null);

  const role = user?.role?.toLowerCase();

  useEffect(() => {
    if (role === 'student') {
      axios.get(`${API_BASE_URL}/api/settings`)
        .then(res => setPortalSettings(res.data))
        .catch(err => console.error(err));
    }
  }, [role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  const menuItems = [];

  if (role === 'admin') {
    menuItems.push(
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Academic Years', path: '/academic-years', icon: Calendar },
      { name: 'Sessions', path: '/sessions', icon: Clock },
      { name: 'Classes', path: '/classes', icon: BookOpen },
      { name: 'Students', path: '/students', icon: Users },
      { name: 'Promotion', path: '/students/promotion', icon: TrendingUp },
      { name: 'Teachers', path: '/teachers', icon: UserSquare2 },
      { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
      { name: 'Holidays & Vacations', path: '/holidays', icon: Sun },
      { name: 'Diary', path: '/diary', icon: FileText },
      { name: 'Assignments', path: '/assignments', icon: ClipboardList },
      { name: 'Exams', path: '/exams', icon: GraduationCap },
      { name: 'Class Tests', path: '/class-tests', icon: CheckSquare },
      { name: 'Complaints', path: '/complaints', icon: AlertCircle },
      { name: 'Substitutions', path: '/substitutions', icon: Clock },
      { name: 'Finance', path: '/finance', icon: Wallet },
      { name: 'AI Management', path: '/ai-settings', icon: Sparkles },
      { name: 'Settings', path: '/settings', icon: Settings }
    );
  } else if (role === 'teacher') {
    menuItems.push(
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Classes', path: '/classes', icon: BookOpen },
      { name: 'Students', path: '/students', icon: Users },
      { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
      { name: 'My Attendance', path: '/my-attendance', icon: Clock },
      { name: 'Diary', path: '/diary', icon: FileText },
      { name: 'Assignments', path: '/assignments', icon: ClipboardList },
      { name: 'Exams', path: '/exams', icon: GraduationCap },
      { name: 'Class Tests', path: '/class-tests', icon: CheckSquare },
      { name: 'AI Teaching Suite', path: '/teacher-ai', icon: Sparkles },
      { name: 'Complaints', path: '/complaints', icon: AlertCircle }
    );
  } else if (role === 'student') {
    const showFees = portalSettings ? portalSettings.showFeesOnStudentPortal !== false : true;
    menuItems.push(
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'AI Learning Tutor', path: '/student-ai', icon: Sparkles },
      { name: 'My Attendance', path: '/my-attendance', icon: CalendarCheck },
      ...(showFees ? [{ name: 'My Fees', path: '/my-fees', icon: Wallet }] : []),
      { name: 'Daily Diary', path: '/diary', icon: FileText },
      { name: 'Assignments', path: '/assignments', icon: ClipboardList },
      { name: 'Exams & Results', path: '/exams', icon: GraduationCap },
      { name: 'Class Tests', path: '/class-tests', icon: CheckSquare },
      { name: 'Complaints', path: '/complaints', icon: AlertCircle }
    );
  } else if (role === 'parent') {
    menuItems.push(
      { name: 'Child Overview', path: '/', icon: LayoutDashboard },
      { name: 'Child AI Tutor', path: '/student-ai', icon: Sparkles },
      { name: 'Child Attendance', path: '/my-attendance', icon: CalendarCheck },
      { name: 'Fee Invoices', path: '/my-fees', icon: Wallet },
      { name: 'Child Diary', path: '/diary', icon: FileText },
      { name: 'Homework & Tasks', path: '/assignments', icon: ClipboardList },
      { name: 'Exams & Results', path: '/exams', icon: GraduationCap },
      { name: 'Class Tests', path: '/class-tests', icon: CheckSquare },
      { name: 'Complaints & Help', path: '/complaints', icon: AlertCircle }
    );
  }

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col relative overflow-hidden">
      <div className="p-5 flex flex-col items-center border-b border-slate-800/50 flex-shrink-0">
        <button 
          onClick={onClose}
          className="lg:hidden absolute right-3 top-3 p-2 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <BrandLogo size="md" className="mb-4 border-2 border-slate-800" />
        <h1 className="text-lg font-black tracking-tight text-white uppercase text-center leading-none">{BRANDING.productName}</h1>
        <div className="mt-2.5 px-2.5 py-0.5 bg-blue-600/10 rounded-full border border-blue-500/20 shadow-lg shadow-blue-900/10 dark:shadow-blue-900/20">
          <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] leading-none">
            {BRANDING.tagline}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar min-h-0">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => onClose && onClose()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'} />
                <span className="font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-slate-800/50 bg-slate-950/20 flex-shrink-0">
        <div>
          <p className="text-center text-[7px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-2 px-2">
            {BRANDING.poweredBy} · {BRANDING.productName}
          </p>
          <div className="flex items-center justify-between gap-2.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800 transition-all hover:border-slate-700 shadow-inner group">
            <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-blue-500 flex-shrink-0 uppercase shadow-lg">
                {user?.name?.charAt(0) || user?.email?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-white truncate uppercase tracking-tight leading-none mb-1">
                  {user?.name || user?.email?.split('@')[0]}
                </p>
                <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest truncate">
                  {user?.role === 'admin' ? 'SYSTEM ADMIN' : user?.role === 'teacher' ? 'FACULTY' : user?.role === 'student' ? 'STUDENT' : 'PARENT'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0 border border-transparent hover:border-red-500/20"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;