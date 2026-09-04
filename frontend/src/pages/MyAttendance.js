import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_BASE_URL from '../config';
import { 
  CalendarCheck, 
  ChevronLeft, 
  ChevronRight,
  User2,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Users,
  GraduationCap
} from 'lucide-react';
import { toast } from 'react-toastify';

const MyAttendance = () => {
    const { user } = useContext(AuthContext);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [allChildren, setAllChildren] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState('');
    const [holidays, setHolidays] = useState([]);

    useEffect(() => {
        if (user?.role === 'parent') {
            fetchChildren();
        }
        fetchHolidays();
    }, [user]);

    const fetchHolidays = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/holidays`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setHolidays(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [selectedMonth, selectedChildId]);

    const fetchChildren = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/students/portal/me`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.allChildren && res.data.allChildren.length > 0) {
                setAllChildren(res.data.allChildren);
                if (!selectedChildId) {
                    setSelectedChildId(res.data.allChildren[0]._id);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAttendance = async (childId = selectedChildId) => {
        try {
            setLoading(true);
            let url = `${API_BASE_URL}/api/attendance/my-attendance?month=${selectedMonth}`;
            if (user?.role === 'parent' && childId) {
                url += `&studentId=${childId}`;
            }
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setAttendance(res.data);
            setLoading(false);
        } catch (err) {
            toast.error('Failed to load attendance history');
            setLoading(false);
        }
    };

    const getDaysInMonth = (monthStr) => {
        const [year, month] = monthStr.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        
        // Get today's ISO string in local timezone
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const days = [];
        while (date.getMonth() === month - 1) {
            const currentStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            // Only add days that are not in the future
            if (currentStr <= todayStr) {
                days.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
        }
        return days.reverse(); // Latest first
    };

    const allDays = getDaysInMonth(selectedMonth);

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div>
                   <h1 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">
                        {user?.role === 'parent' ? 'Child ' : 'Monthly '}<span className="text-blue-500">Attendance</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">
                        {user?.role === 'parent' ? 'Track your child\'s daily presence and punctuality logs' : 'View and verify monthly presence logs'}
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Select Month</label>
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-w-[200px]">
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent border-none text-slate-800 dark:text-white rounded-xl px-4 py-2 text-xs font-black uppercase outline-none focus:ring-0 cursor-pointer w-full text-center"
                        />
                    </div>
                </div>
            </header>

            {/* Multi-Child Selector for Parent */}
            {user?.role === 'parent' && allChildren.length > 1 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-blue-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Select Child:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allChildren.map(child => (
                    <button
                      key={child._id}
                      onClick={() => {
                        setSelectedChildId(child._id);
                        fetchAttendance(child._id);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                        selectedChildId === child._id
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                          : 'bg-slate-100 dark:bg-slate-950 text-slate-500 hover:text-white border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <GraduationCap size={14} />
                      <span>{child.name} ({child.class?.name}-{child.section?.name})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Stats Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-2">
                {[
                  { label: 'Working Days', value: allDays.filter(d => d.getDay() !== 0).length, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/40', icon: CalendarCheck },
                  { label: 'Days Present', value: attendance.filter(r => r.status === 'Present').length, color: 'text-emerald-600 dark:text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 },
                  { label: 'Days Absent', value: attendance.filter(r => r.status === 'Absent').length, color: 'text-rose-600 dark:text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: XCircle },
                  { label: 'Leave / Other', value: attendance.filter(r => r.status !== 'Present' && r.status !== 'Absent').length, color: 'text-amber-600 dark:text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: Clock },
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg} p-4 rounded-[1.5rem] border border-transparent dark:border-slate-800 transition-all shadow-sm`}>
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm ${stat.color}`}>
                           <stat.icon size={16} strokeWidth={3} />
                        </div>
                        <div>
                           <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">{stat.label}</label>
                           <div className={`text-xl font-black ${stat.color} leading-none tracking-tight`}>{stat.value}</div>
                        </div>
                     </div>
                  </div>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Date</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Marked By</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="py-20 text-center">
                                        <div className="animate-pulse text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Synchronizing Records...</div>
                                    </td>
                                </tr>
                            ) : (
                                allDays.map((dayDate, i) => {
                                    const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
                                    const record = attendance.find(a => a.date && a.date.split('T')[0] === dateStr);
                                    
                                    const dayHoliday = holidays.find(h => {
                                        const s = new Date(h.startDate).toISOString().slice(0, 10);
                                        const e = new Date(h.endDate).toISOString().slice(0, 10);
                                        return dateStr >= s && dateStr <= e;
                                    });
                                    const isHoliday = !!dayHoliday;
                                    const isSunday = dayDate.getDay() === 0;

                                    return (
                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                                                    {dayDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                                                    {record ? (typeof record.markedBy === 'object' ? record.markedBy?.name : (record.markedBy || 'System Admin')) : isHoliday ? `Holiday (${dayHoliday.title})` : 'No Entry'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                                                    record ? (
                                                        record.status.toLowerCase() === 'present' ? 'text-emerald-500' :
                                                        record.status.toLowerCase() === 'absent' ? 'text-rose-500' :
                                                        record.status.toLowerCase() === 'holiday' ? 'text-purple-400' :
                                                        'text-amber-500'
                                                    ) : isHoliday ? 'text-purple-400 font-black' : isSunday ? 'text-blue-500/50' : 'text-slate-300 dark:text-slate-700'
                                                }`}>
                                                    {record ? (record.holidayTitle ? `Holiday (${record.holidayTitle})` : record.status) : (isHoliday ? `Holiday (${dayHoliday.title})` : isSunday ? 'Sunday' : 'Not Marked')}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MyAttendance;