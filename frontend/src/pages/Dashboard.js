import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  Users, 
  User2, 
  GraduationCap, 
  CalendarCheck, 
  Calendar,
  TrendingUp, 
  Wallet, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Bell,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  Printer,
  BookOpen,
  Receipt,
  MessageSquareWarning
} from 'lucide-react';
import { generateFeeVoucher } from '../utils/feeVoucherGenerator';
import { AuthContext } from '../context/AuthContext';
import BRANDING from '../branding';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  LineController,
  BarController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  LineController,
  BarController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
const formatTimeParts = (date) => {
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi'
  });
  const [time, period] = timeStr.split(' ');
  const [hh, mm, ss] = time.split(':');
  return { hh, mm, ss, period };
};

const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi'
  });
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Helper for Karachi Time (UTC+5)
  const getKarachiNow = () => {
    return new Date(); // Return current time, formatting will handle timezone
  };

  const [stats, setStats] = useState(null);
  const [portalData, setPortalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getKarachiNow());
  const [attTab, setAttTab] = useState('students');
  const [timeframe, setTimeframe] = useState('month');
  
  // Robust Karachi Date String
  const getKarachiDateStr = (date = new Date()) => {
    const kTime = new Date(date.getTime() + (5 * 60 * 60 * 1000));
    const year = kTime.getUTCFullYear();
    const month = String(kTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [financeTimeframe, setFinanceTimeframe] = useState(getKarachiDateStr().slice(0, 7));
  const [myAssignments, setMyAssignments] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');

  useEffect(() => {
    fetchDashboardData();
    if (user?.role === 'teacher') {
        fetchMyAssignments();
    }
    const timer = setInterval(() => setCurrentTime(getKarachiNow()), 1000);
    return () => clearInterval(timer);
  }, [user, timeframe, financeTimeframe]);

  const fetchDashboardData = async (childId = selectedChildId) => {
    try {
      setLoading(true);
      const userRole = user?.role?.toLowerCase();
      if (userRole === 'student' || userRole === 'parent') {
        const res = await axios.get(`${API_BASE_URL}/api/students/portal/me${childId ? `?studentId=${childId}` : ''}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPortalData(res.data);
      } else {
        const res = await axios.get(`${API_BASE_URL}/api/students/dashboard-stats?timeframe=${timeframe}&financeTimeframe=${financeTimeframe}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setStats(res.data);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchMyAssignments = async () => {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/substitutions/my-assignments`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMyAssignments(res.data);
    } catch (err) {
        console.error("Sub assignments fetch error:", err);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em]">Initialising System...</div>;

  const role = user?.role?.toLowerCase();
  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  // ---------------------------------------------------------------------------
  // STUDENT / PARENT DASHBOARD VIEW
  // ---------------------------------------------------------------------------
  if (isStudent || isParent) {
    if (!portalData) {
      return (
        <div className="p-10 text-center text-red-500 font-bold uppercase tracking-[0.2em]">
          Failed to load student portal data. Please contact school administration.
        </div>
      );
    }

    const { hh, mm, ss, period } = formatTimeParts(currentTime);
    const student = portalData.student;
    const attSummary = portalData.attendanceSummary || {};
    const todayAtt = portalData.todayAttendance;
    const attendanceRate = portalData.attendanceRate || 0;
    const schedule = portalData.todaySchedule || [];
    const feeRecords = portalData.feeRecords || [];
    const totalDues = portalData.totalDues || 0;
    const classTeacher = student?.section?.classTeacher;

    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 md:pb-8">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                isStudent 
                ? 'bg-emerald-600 shadow-emerald-500/20 text-white' 
                : 'bg-indigo-600 shadow-indigo-500/20 text-white'
              } flex-shrink-0`}>
                {isStudent ? <GraduationCap size={26} /> : <Users size={26} />}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none truncate">
                  {isStudent ? 'Student' : 'Parent'} <span className={isStudent ? 'text-emerald-400' : 'text-indigo-400'}>Portal</span>
                </h1>
                <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em] truncate">
                  {isStudent ? student?.name : `Guardian of ${student?.name || 'Student'}`} • {formatDate(currentTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Active Academic Year Badge & Karachi Live Clock */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {portalData.activeYear && (
              <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 p-2.5 px-4 rounded-2xl shadow-lg">
                <Calendar size={15} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                  {portalData.activeYear.name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 px-5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2">
                <Clock size={16} className={isStudent ? 'text-emerald-400' : 'text-indigo-400'} />
                <span className="font-mono text-sm font-black text-white tracking-wider">
                  {hh}:{mm}:{ss} <span className="text-[10px] text-slate-500 uppercase">{period}</span>
                </span>
              </div>
              <div className="h-4 w-px bg-slate-800"></div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Karachi (PKT)</span>
            </div>
          </div>
        </header>

        {/* Multi-Child Selector for Parent */}
        {isParent && portalData.allChildren?.length > 1 && (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users size={18} className="text-indigo-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">Switch Active Child:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {portalData.allChildren.map(child => (
                <button
                  key={child._id}
                  onClick={() => {
                    setSelectedChildId(child._id);
                    fetchDashboardData(child._id);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                    student?._id === child._id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <GraduationCap size={14} />
                  <span>{child.name} ({child.class?.name}-{child.section?.name})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Top 4 Quick Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Attendance Rate */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attendance Rate</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <CalendarCheck size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mb-2">{attendanceRate}%</div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase">
              <span className={`px-2.5 py-1 rounded-lg ${
                todayAtt === 'Present' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                todayAtt === 'Absent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                todayAtt === 'Late' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                Today: {todayAtt}
              </span>
            </div>
          </div>

          {/* Card 2: Student Class & Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enrolled Class</span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <BookOpen size={20} />
              </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight mb-1">
              Grade {student?.class?.name || 'N/A'}
            </div>
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
              Section {student?.section?.name || 'A'} • #{student?.regNo}
            </div>
          </div>

          {/* Card 3: Class Teacher */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Class Incharge</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <User2 size={20} />
              </div>
            </div>
            <div className="text-xl font-black text-white tracking-tight truncate mb-1">
              {classTeacher?.fullName || 'Assigned Staff'}
            </div>
            <div className="text-xs font-bold text-slate-300 truncate mt-1">
              {classTeacher?.phoneHidden ? (
                <span className="text-slate-500 italic text-[11px]">Phone hidden by school</span>
              ) : (
                classTeacher?.phone || classTeacher?.email || 'Contact Admin for queries'
              )}
            </div>
          </div>

          {/* Card 4: Fee Balance / Dues OR Daily Diary if fees hidden */}
          {(isParent || portalData?.showFeesOnStudentPortal !== false) ? (
            <div 
              onClick={() => navigate('/my-fees')}
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-rose-500/40 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isParent ? 'Child Fee Status' : 'Fee Status'}</span>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
              </div>
              <div className={`text-2xl font-black ${totalDues > 0 ? 'text-rose-400' : 'text-emerald-400'} tracking-tight mb-1`}>
                {totalDues > 0 ? `Rs. ${totalDues.toLocaleString()}` : 'All Cleared'}
              </div>
              <div className="text-[10px] font-black uppercase tracking-wider text-blue-400 group-hover:text-blue-300 flex items-center gap-1 mt-1">
                <span>{isParent ? 'View Fee Invoices' : 'View Fee Ledger'}</span>
                <ArrowRight size={12} />
              </div>
            </div>
          ) : (
            <div 
              onClick={() => navigate('/diary')}
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-amber-500/40 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Daily Diary</span>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight mb-1">
                Homework
              </div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 group-hover:text-amber-300 flex items-center gap-1 mt-1">
                <span>View Today's Diary</span>
                <ArrowRight size={12} />
              </div>
            </div>
          )}
        </div>

        {/* 2 Column Main Grid: Today's Schedule & Attendance Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Today's Timetable / Classes (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Today's Class Schedule</h3>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Daily periods & subjects</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest">
                {schedule.length} Periods
              </span>
            </div>

            {schedule.length > 0 ? (
              <div className="space-y-3">
                {schedule.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-xs text-blue-400">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white uppercase">{item.subject}</div>
                        <div className="text-[10px] font-bold text-slate-500 tracking-wider">
                          {item.startTime} - {item.endTime}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                <Clock size={32} className="mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No classes scheduled for today or holiday</p>
              </div>
            )}
          </div>

          {/* Right Column: Attendance Breakdown (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <CalendarCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Attendance Record</h3>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lifetime presence counts</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/my-attendance')}
                className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest flex items-center gap-1"
              >
                Full Log <ArrowRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Marked</div>
                <div className="text-2xl font-black text-white">{attSummary.total || 0}</div>
              </div>
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Present Days</div>
                <div className="text-2xl font-black text-emerald-400">{attSummary.presentCount || 0}</div>
              </div>
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Late Arrivals</div>
                <div className="text-2xl font-black text-amber-400">{attSummary.lateCount || 0}</div>
              </div>
              <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Absences</div>
                <div className="text-2xl font-black text-red-400">{attSummary.absentCount || 0}</div>
              </div>
            </div>

            <button 
              onClick={() => navigate('/my-attendance')}
              className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-black py-4 rounded-2xl transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
            >
              <CalendarCheck size={16} /> View Monthly Attendance Calendar
            </button>
          </div>
        </div>

        {/* Quick Portal Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {(isParent || portalData?.showFeesOnStudentPortal !== false) ? (
            <div 
              onClick={() => navigate('/my-fees')}
              className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex items-center justify-between cursor-pointer hover:border-blue-500/40 hover:bg-slate-800/60 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{isParent ? 'Child Fee Invoices & History' : 'Fee Vouchers & History'}</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{isParent ? "Inspect child's billing statements & print reference receipts" : 'Inspect billing statements & print reference receipts'}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          ) : (
            <div 
              onClick={() => navigate('/diary')}
              className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex items-center justify-between cursor-pointer hover:border-amber-500/40 hover:bg-slate-800/60 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-600/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Daily Homework Diary</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Check assigned class tasks & homework submission deadlines</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          )}

          <div 
            onClick={() => navigate('/complaints')}
            className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex items-center justify-between cursor-pointer hover:border-rose-500/40 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/10 text-rose-400 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquareWarning size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight">Complaints & Feedback</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Direct communication line with Principal's office</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="p-10 text-center text-red-500 font-bold uppercase tracking-[0.2em]">Failed to connect to school server. Please try again.</div>;

  // ---------------------------------------------------------------------------
  // TEACHER DASHBOARD VIEW
  // ---------------------------------------------------------------------------
  if (isTeacher) {
    const { hh, mm, ss, period } = formatTimeParts(currentTime);

    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 md:pb-8">
            <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                    <User2 className="text-white" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none truncate">
                        Faculty <span className="text-blue-500">Portal</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em] truncate">
                      {user.name} • {formatDate(currentTime)}
                    </p>
                  </div>
                </div>
            </div>
            
            <div className="flex-shrink-0 flex items-center gap-4 self-center md:self-auto">
               <div className="bg-slate-900/30 p-0.5 rounded-xl flex items-center shadow-lg">
                  <div className="bg-slate-950/80 px-3 md:px-4 py-2 rounded-lg border border-slate-800/30 flex items-center justify-between gap-3 md:gap-4 w-40 md:w-48">
                     <div className="flex items-baseline gap-1 md:gap-2">
                        <span className="text-white font-black text-base md:text-lg tracking-tight tabular-nums">{hh}:{mm}</span>
                        <span key={ss} className="text-[9px] md:text-[10px] text-slate-600 font-bold tabular-nums">
                           {ss}
                        </span>
                        <span className="text-blue-500 font-black text-[9px] md:text-[10px] uppercase leading-none md:ml-1">{period}</span>
                     </div>
                     <div className="w-[1px] h-4 bg-slate-800/50"></div>
                     <span className="text-[8px] md:text-[9px] text-slate-300 font-black uppercase tracking-widest leading-none bg-slate-900 px-2 py-1.5 rounded-md border border-slate-800">
                        {formatDate(currentTime).split(',')[0].slice(0,3)}
                     </span>
                  </div>
               </div>
            </div>
        </header>

        {/* Substitution Alert */}
        {myAssignments.length > 0 && (
            <div className="bg-emerald-600 border border-emerald-400/30 p-6 rounded-[2rem] flex items-center justify-between gap-6 relative overflow-hidden group shadow-2xl shadow-emerald-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-90"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center shadow-inner border border-white/20 ring-4 ring-white/10">
                        <CalendarCheck size={28} className="animate-bounce" />
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase text-lg tracking-tight">Substitution Assigned!</h3>
                        <p className="text-emerald-100/80 text-[10px] font-black uppercase mt-0.5 tracking-[0.2em]">You have {myAssignments.length} extra replacement classes allocated today.</p>
                    </div>
                </div>
                <div className="px-8 py-3 bg-white/20 text-white text-[10px] font-black uppercase rounded-xl border border-white/30 backdrop-blur-md shadow-xl relative z-10">
                    Check Schedule Below
                </div>
            </div>
        )}

        {/* Stat Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="My Total Students" value={stats.totalStudents || 0} sub="Managed Sections" icon={Users} color="blue" />
            <StatCard label="Attendance Recorded" value={`${stats.attendanceToday || 0}%`} sub="Presence Rate" icon={CalendarCheck} color="emerald" />
            <StatCard label="My Periods Today" value={stats.todaySchedule?.length || 0} sub="Assigned Classes" icon={Clock} color="indigo" />
            <StatCard label="Active Replacements" value={myAssignments.length} sub="Substitution Duties" icon={RefreshCw} color="rose" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Schedule */}
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-black text-xl tracking-tight uppercase">Regular Timeline</h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Normal Assigned periods</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                        <Clock size={18} />
                    </div>
                </div>
                <div className="p-8 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {stats.todaySchedule?.length > 0 ? stats.todaySchedule.map((p, i) => (
                        <div key={i} className="flex items-center gap-6 p-5 bg-slate-950 border border-slate-800 rounded-3xl group hover:border-blue-500/30 transition-all">
                            <div className="w-20 font-black text-blue-500 text-sm tabular-nums text-center px-3 py-2 bg-blue-500/5 rounded-2xl border border-blue-500/10">{p.time}</div>
                            <div className="flex-1">
                                <div className="text-white font-black uppercase text-xs tracking-tight">{p.subject}</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1 flex items-center gap-2">
                                  <span className="bg-slate-900 px-2 py-1 rounded-md border border-slate-800">{p.className}</span>
                                  <span className="text-slate-600">•</span>
                                  <span>Section {p.sectionName}</span>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowUpRight className="text-slate-700" size={16} />
                            </div>
                        </div>
                    )) : (
                        <div className="p-10 text-center text-slate-600 font-black uppercase text-[10px] tracking-[0.5em] italic py-20 bg-slate-950/30 rounded-[2rem] border-2 border-dashed border-slate-800">
                            No Classes Today
                        </div>
                    )}
                </div>
            </div>

            {/* Substitution List for Teacher */}
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-black text-xl tracking-tight uppercase">Replacements</h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Covering for colleagues</p>
                    </div>
                    <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-500">
                        <RefreshCw size={18} className={myAssignments.length > 0 ? "animate-spin-slow" : ""} />
                    </div>
                </div>
                <div className="p-8 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {myAssignments.length > 0 ? myAssignments.map((sub, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 p-5 rounded-3xl group hover:border-rose-500/30 transition-all">
                             <div className="flex justify-between items-center mb-4">
                                <span className="text-rose-500 font-black text-sm tabular-nums bg-rose-500/5 px-3 py-1 rounded-xl border border-rose-500/10">{sub.time}</span>
                                <span className="bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                                  <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div> Active Assignment
                                </span>
                             </div>
                             <div className="text-white font-black text-base uppercase leading-none mb-2">{sub.subject}</div>
                             <div className="text-slate-400 text-[10px] font-bold uppercase flex items-center gap-2">
                                <User2 size={12} className="text-rose-500" />
                                <span>Replacing {sub.originalTeacher?.fullName}</span>
                             </div>
                             <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate max-w-[150px]">{sub.class?.name} • Sec {sub.section?.name}</div>
                                <button className="p-2 bg-slate-900 text-slate-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-xl active:scale-95">
                                   <ArrowRight size={14} />
                                </button>
                             </div>
                        </div>
                    )) : (
                        <div className="p-10 text-center text-slate-600 font-black uppercase text-[10px] tracking-[0.5em] italic py-20 bg-slate-950/30 rounded-[2rem] border-2 border-dashed border-slate-800">
                           No replacements
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Dynamic App Access Bar Deleted as per request */}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ADMIN DASHBOARD VIEW (EXISTING)
  // ---------------------------------------------------------------------------
  const { hh, mm, ss, period } = formatTimeParts(currentTime);

  const lineData = {
    labels: (attTab === 'students' ? (stats?.studentTrend || []) : (stats?.teacherTrend || [])).map(d => d._id),
    datasets: [
      {
        label: 'Present',
        data: (attTab === 'students' ? (stats?.studentTrend || []) : (stats?.teacherTrend || [])).map(d => d.present),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        borderWidth: 3,
        spanGaps: true,
        showLine: true
      },
      {
        label: 'Absent',
        data: (attTab === 'students' ? (stats?.studentTrend || []) : (stats?.teacherTrend || [])).map(d => d.absent),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        borderWidth: 3,
        spanGaps: true,
        showLine: true
      }
    ]
  };

  const financeChartData = {
    labels: (stats?.financialTrend || []).map(d => {
      // Format YYYY-MM-DD to DD/MM or YYYY-MM to Month
      if (d._id.length === 10) { // YYYY-MM-DD
        return d._id.split('-').slice(1, 3).reverse().join('/');
      } else if (d._id.length === 7) { // YYYY-MM
        const [year, month] = d._id.split('-');
        return new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'short' });
      }
      return d._id;
    }),
    datasets: [
      {
        label: 'Collected',
        data: (stats?.financialTrend || []).map(d => d.paid),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        borderWidth: 3,
        spanGaps: true,
        showLine: true
      },
      {
        label: 'Dues',
        data: (stats?.financialTrend || []).map(d => d.unpaid),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        borderWidth: 3,
        spanGaps: true,
        showLine: true
      }
    ]
  };

  const doughnutData = {
    labels: ['Collected', 'Pending'],
    datasets: [{
      data: [stats?.monthlyStats?.paid || 0, stats?.monthlyStats?.unpaid || 0],
      backgroundColor: ['#10b981', '#ef4444'],
      hoverBackgroundColor: ['#059669', '#dc2626'],
      borderWidth: 0,
      cutout: '85%',
      borderRadius: 10,
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#020617',
        padding: 12,
        cornerRadius: 12,
        titleFont: { weight: 'bold' }
      }
    }
  };

  if (!isAdmin && !isTeacher) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-center animate-pulse">
                Authorising Portal Access...
            </p>
        </div>
    );
  }

  if (isAdmin) {
    return (
       <div className="space-y-10 md:space-y-12 animate-in fade-in duration-700 pb-20 px-1 md:px-0">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-800/50 pb-8 md:pb-10">
        <div className="pt-2">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
            Command <span className="text-blue-500">Center</span>
          </h1>
          <p className="text-slate-500 mt-3 font-black uppercase text-[10px] tracking-widest md:tracking-[0.4em]">{BRANDING.fullProductLabel}</p>
        </div>
        <div className="flex flex-col gap-2 w-fit">
           <div className="px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-[0.3em] rounded-lg animate-pulse flex items-center justify-center gap-2 shadow-sm w-full">
              <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]"></span>
              System Active
           </div>
           <div className="bg-slate-900/30 p-0.5 rounded-xl flex items-center shadow-lg w-full">
              <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800/30 flex items-center justify-between gap-4 w-full">
                 <div className="flex items-baseline gap-2">
                    <span className="text-white font-black text-base tracking-tight tabular-nums">{hh}:{mm}</span>
                    <span key={ss} className="text-[9px] text-slate-600 font-bold tabular-nums">
                       {ss}
                    </span>
                    <span className="text-blue-500 font-black text-[9px] uppercase leading-none ml-1">{period}</span>
                 </div>
                 <div className="w-[1px] h-3 bg-slate-800/50"></div>
                 <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest leading-none bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                    {formatDate(currentTime).split(',')[0].slice(0,3)}
                 </span>
              </div>
           </div>
        </div>
      </header>

      {/* Core Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
             label="Total Students" 
             value={stats.activeStudents} 
             sub="Verified Admissions"
             icon={Users} 
             color="blue" 
          />
          <StatCard 
             label="Staff Members" 
             value={stats.activeTeachers || 0} 
             sub="Faculty Strength"
             icon={User2} 
             color="indigo" 
          />
          <StatCard 
             label="Attendance Rate" 
             value={`${stats.attendanceToday || 0}%`} 
             sub="Today's Performance"
             icon={TrendingUp} 
             color="emerald" 
          />
          <StatCard 
             label="Lifetime Dues" 
             value={`${(stats.pendingDues || 0).toLocaleString()}`} 
             sub="Lifetime Unpaid"
             icon={AlertCircle} 
             color="rose" 
          />
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-white font-black text-xl tracking-tight uppercase">Attendance Analytics</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Real-time presence tracking</p>
              </div>
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 shadow-inner">
                 {['week', 'month', 'year'].map(t => (
                   <button 
                     key={t}
                     onClick={() => setTimeframe(t)}
                     className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${timeframe === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white'}`}
                   >
                     {t}
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex gap-2 mb-8">
              {['students', 'teachers'].map(tab => (
                 <button 
                   key={tab}
                   onClick={() => setAttTab(tab)}
                   className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${attTab === tab ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:text-white bg-slate-950 border border-slate-800'}`}
                 >
                   {tab}
                 </button>
              ))}
           </div>

           <div className="h-[300px]">
              <Line data={lineData} options={chartOptions} />
           </div>
        </div>

        {/* Collection Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex flex-col items-center">
           <div className="w-full text-center mb-5">
              <h3 className="text-white font-black text-lg tracking-tight uppercase">Monthly Performance</h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1.5 px-4">Cash Received vs Arrears</p>
           </div>

           <div className="mb-6 w-full px-4">
              <input 
                type="month"
                value={financeTimeframe}
                onChange={(e) => setFinanceTimeframe(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all text-center"
              />
           </div>

           <div className="h-[180px] w-full mb-6 relative flex items-center justify-center">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute flex flex-col items-center">
                 <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Recovery</span>
                 <span className="text-2xl font-black text-white mt-1">
                    {Math.round((stats.monthlyStats.paid / (stats.monthlyStats.paid + stats.monthlyStats.unpaid || 1)) * 100)}%
                 </span>
              </div>
           </div>

           <div className="w-full space-y-2">
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 group hover:border-emerald-500/30 transition-all">
                 <div className={`flex items-center gap-2.5`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Received (Cash)</span>
                 </div>
                 <span className="text-white font-black tabular-nums text-xs">{(stats.monthlyStats.paid || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 group hover:border-red-500/30 transition-all">
                 <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Arrears (Dues)</span>
                 </div>
                 <span className="text-white font-black tabular-nums text-xs">{(stats.monthlyStats.unpaid || 0).toLocaleString()}</span>
              </div>
           </div>
        </div>
        </div>

      {/* Quick Access Section */}
      <div className="pt-10">
         <div className="flex items-center gap-4 mb-6">
            <h2 className="text-white font-black text-sm uppercase tracking-[0.3em]">Quick Access</h2>
            <div className="flex-1 h-[1px] bg-slate-800/50"></div>
         </div>
         
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Admission', icon: GraduationCap, color: 'blue', path: '/students', state: { openForm: true } },
              { label: 'Attendance', icon: CalendarCheck, color: 'emerald', path: '/attendance' },
              { label: 'Staff Hub', icon: User2, color: 'indigo', path: '/teachers', state: { openForm: true } },
              { label: 'Fees/Invoice', icon: Wallet, color: 'rose', path: '/finance' }
            ].map((act, i) => {
              const actionColors = {
                blue: 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500',
                emerald: 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500',
                indigo: 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500',
                rose: 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500'
              };
              const colorClass = actionColors[act.color] || actionColors.blue;
              
              return (
                <button 
                  key={i}
                  onClick={() => navigate(act.path, { state: act.state })}
                  className="group bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[1.5rem] flex flex-col items-center gap-4 hover:bg-slate-800 hover:border-slate-500 transition-all active:scale-95 shadow-xl shadow-black/20"
                >
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${colorClass} flex items-center justify-center group-hover:scale-110 group-hover:text-white transition-all duration-300`}>
                     <act.icon size={28} />
                  </div>
                  <span className="text-white font-black uppercase text-[10px] md:text-xs tracking-[0.2em]">{act.label}</span>
                </button>
              );
            })}
         </div>
      </div>
    </div>
    );
  }
  return null;
};

const StatCard = ({ label, value, sub, icon: Icon, color }) => {
  const colorMap = {
    blue: {
      text: 'text-blue-500',
      bg: 'bg-blue-500',
      border: 'group-hover:border-blue-500/50',
      glow: 'bg-blue-500/5',
      shadow: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]'
    },
    indigo: {
      text: 'text-indigo-500',
      bg: 'bg-indigo-500',
      border: 'group-hover:border-indigo-500/50',
      glow: 'bg-indigo-500/5',
      shadow: 'shadow-[0_0_8px_rgba(99,102,241,0.5)]'
    },
    emerald: {
      text: 'text-emerald-500',
      bg: 'bg-emerald-500',
      border: 'group-hover:border-emerald-500/50',
      glow: 'bg-emerald-500/5',
      shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]'
    },
    rose: {
      text: 'text-rose-500',
      bg: 'bg-rose-500',
      border: 'group-hover:border-rose-500/50',
      glow: 'bg-rose-500/5',
      shadow: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]'
    }
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-[1.5rem] relative overflow-hidden group hover:border-slate-700 transition-all shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
       <div className="flex items-start justify-between mb-4 relative z-10">
          <div className={`w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 ${style.text} flex items-center justify-center shadow-inner ${style.border} transition-all`}>
             <Icon size={18} />
          </div>
          <div className={`w-10 h-10 ${style.glow} rounded-full absolute -right-4 -top-4 blur-xl`}></div>
       </div>
       <div className="flex flex-col relative z-10">
          <h4 className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">{value}</h4>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 group-hover:text-white transition-colors">{label}</p>
          <div className="flex items-center gap-2 mt-3">
             <div className={`w-2 h-2 rounded-full ${style.bg} ${style.shadow}`}></div>
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-80 leading-none">{sub}</span>
          </div>
       </div>
    </div>
  );
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  spanGaps: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#020617',
      titleFont: { family: "'Inter', sans-serif", weight: '900', size: 13 },
      bodyFont: { family: "'Inter', sans-serif", weight: '700', size: 12 },
      padding: 16,
      cornerRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)'
    }
  },
  elements: {
    line: {
      borderWidth: 3,
      tension: 0.4,
      fill: 'origin'
    },
    point: {
      radius: 4,
      hoverRadius: 6
    }
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10, weight: '700' }, color: '#64748b' } },
    y: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { font: { size: 10, weight: '700' }, color: '#64748b' } }
  }
};

export default Dashboard;