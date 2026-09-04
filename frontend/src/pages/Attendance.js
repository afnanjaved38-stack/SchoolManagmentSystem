import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  Check, 
  X, 
  Clock, 
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  FileClock,
  Timer,
  Search,
  Filter,
  Users,
  GraduationCap,
  User,
  User2,
  CalendarCheck,
  Sun
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';

const Attendance = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'teacher'
  const [searchTerm, setSearchTerm] = useState('');

  // Get actual TODAY string for Karachi timezone (UTC+5)
  const getTodayStr = () => {
    const now = new Date();
    const kTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const year = kTime.getUTCFullYear();
    const month = String(kTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();

  // Format timestamp to PKT (UTC+5) with AM/PM
  const formatPKT = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const kTime = new Date(d.getTime() + (5 * 60 * 60 * 1000));
    let hours = kTime.getUTCHours();
    const mins = String(kTime.getUTCMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${mins} ${ampm}`;
  };

  const [filters, setFilters] = useState({
    classId: location.state?.classId || '',
    sectionId: location.state?.sectionId || '',
    date: location.state?.date || todayStr,
    statusFilter: 'All'
  });

  const isToday = filters.date === todayStr;

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (filters.classId) {
      const selectedClass = classes.find(c => c._id === filters.classId);
      setSections(selectedClass ? selectedClass.sections : []);
    } else {
      setSections([]);
    }
  }, [classes, filters.classId]);

  useEffect(() => {
    fetchData();
  }, [filters.date, filters.sectionId, filters.classId, activeTab]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(res.data);
    } catch (err) {
      toast.error('Error loading classes');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/attendance/school-wide`, {
        params: { 
          date: filters.date,
          type: activeTab,
          classId: filters.classId,
          sectionId: filters.sectionId
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Ensure we always have an array even on unexpected responses
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Error fetching data');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMark = async (id, clickedStatus) => {
    if (!isToday && user?.role === 'teacher') {
      toast.warning('Teachers can only mark attendance for today');
      return;
    }
    try {
      // Toggle: if same status clicked again, deselect (set to null)
      let newStatus = clickedStatus;
      const currentRec = (records || []).find(rec => {
        const item = activeTab === 'student' ? rec.student : rec.teacher;
        return item?._id?.toString() === id?.toString();
      });
      if (currentRec?.status === clickedStatus) {
        newStatus = null;
      }

      // Optimistic update
      setRecords(prev => (prev || []).map(rec => {
        const item = activeTab === 'student' ? rec.student : rec.teacher;
        if (item?._id?.toString() === id?.toString()) {
          return newStatus 
            ? { ...rec, status: newStatus, markedBy: user?.name || 'Me' }
            : { ...rec, status: null, markedBy: '', markedAt: null };
        }
        return rec;
      }));

      await axios.post(`${API_BASE_URL}/api/attendance`, {
        date: filters.date,
        type: activeTab,
        records: [{ id, status: newStatus }]
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Toast removed as per user request
    } catch (err) {
      const errorMsg = err.response?.data?.msg || err.response?.data?.message || 'Failed to update attendance';
      toast.error(errorMsg);
      fetchData(); // Rollback
    }
  };

  const filteredRecords = (records || []).filter(rec => {
    const item = activeTab === 'student' ? rec?.student : rec?.teacher;
    if (!item) return false;

    // Search logic with heavy safety checks
    const nameStr = (item.name || item.fullName || '').toString().toLowerCase();
    const subStr = (item.regNo || item.rollNumber || item.email || '').toString().toLowerCase();
    const normalizedSearch = (searchTerm || '').toLowerCase();

    const nameMatch = nameStr.includes(normalizedSearch);
    const regMatch = subStr.includes(normalizedSearch);
    
    // Multi-factor Match
    let factorMatch = nameMatch || regMatch;
    
    // Class/Section filter (Students only)
    let csMatch = true;
    if (activeTab === 'student') {
        const itemClassId = (item.class?._id || item.class)?.toString();
        const itemSectionId = (item.section?._id || item.section)?.toString();
        if (filters.classId && itemClassId !== filters.classId) csMatch = false;
        if (filters.sectionId && itemSectionId !== filters.sectionId) csMatch = false;
    }

    const statusMatch = filters.statusFilter === 'All' || rec.status === filters.statusFilter;

    return factorMatch && csMatch && statusMatch;
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setRecords([]); // Clear to avoid data type mismatch during loading
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Timer className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Roll Call <span className="text-blue-500">Center</span>
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
              <CalendarIcon size={12} className="text-blue-500" /> {isToday ? "Live Daily Attendance" : `Archived Record: ${filters.date}`}
            </p>
          </div>
        </div>
        
        <div className="flex gap-1 bg-slate-900 shadow-inner p-1 rounded-2xl border border-slate-800">
           <button 
             onClick={() => handleTabChange('student')}
             className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${activeTab === 'student' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
           >
             <GraduationCap size={16} /> Students
           </button>
           {user?.role === 'admin' && (
             <button 
               onClick={() => handleTabChange('teacher')}
               className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${activeTab === 'teacher' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
             >
               <Users size={18} /> Teachers
             </button>
           )}
        </div>
      </header>

      {/* Modern Dropdown Filters - Responsive Grid */}
      <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-2xl space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-5 md:gap-4 items-end">
        <div className="space-y-1 md:space-y-2">
          <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">date</label>
          <div className="relative">
            <CalendarIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="date"
              max={todayStr}
              className="w-full bg-slate-950 border border-slate-800 text-white pl-11 pr-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 text-xs md:text-sm"
              value={filters.date}
              onChange={e => {
                const date = new Date(e.target.value);
                if (date.getDay() === 0) {
                  toast.error("Sundays are school holidays. Attendance cannot be recorded.");
                  return;
                }
                setFilters({...filters, date: e.target.value});
              }}
            />
          </div>
        </div>

        <div className="space-y-1 md:space-y-2">
           <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">status</label>
           <select 
             className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl outline-none text-xs md:text-sm appearance-none"
             value={filters.statusFilter}
             onChange={e => setFilters({...filters, statusFilter: e.target.value})}
           >
             <option value="All">All Status</option>
             <option value="Present">Present</option>
             <option value="Absent">Absent</option>
             <option value="Leave">Leave</option>
             <option value="Half Leave">Half Leave</option>
             <option value="Late">Late</option>
           </select>
        </div>

        {activeTab === 'student' && (
          <>
            <div className="space-y-1 md:space-y-2">
              <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">class</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl outline-none text-xs md:text-sm appearance-none"
                value={filters.classId}
                onChange={e => setFilters({...filters, classId: e.target.value, sectionId: ''})}
                disabled={user?.role === 'teacher'}
              >
                <option value="">{user?.role === 'teacher' ? 'My Managed Class' : 'All Classes'}</option>
                {classes?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1 md:space-y-2">
              <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">section</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl outline-none text-xs md:text-sm appearance-none"
                value={filters.sectionId}
                onChange={e => setFilters({...filters, sectionId: e.target.value})}
                disabled={!filters.classId || user?.role === 'teacher'}
              >
                <option value="">{user?.role === 'teacher' ? 'All My Sections' : 'All Sections'}</option>
                {sections?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </>
        )}

        <div className={`space-y-1 md:space-y-2 col-span-full ${activeTab === 'teacher' ? 'lg:col-span-3' : 'lg:col-span-1'}`}>
          <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">search {activeTab}s</label>
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              placeholder={`Search by name...`}
              className="w-full bg-slate-950 border border-slate-800 text-white pl-11 pr-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl outline-none text-xs md:text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
         {[
           { label: 'Total Strength', value: records.length, color: 'text-slate-300', bg: 'bg-slate-800/60', icon: Users },
           { label: 'Present Today', value: records.filter(r => r.status === 'Present').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
           { label: 'Absent Today', value: records.filter(r => r.status === 'Absent').length, color: 'text-rose-400', bg: 'bg-rose-500/10', icon: XCircle },
           { label: 'Leave / Half', value: records.filter(r => r.status === 'Leave' || r.status === 'Half Leave').length, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: FileClock },
           { label: 'Late Arrival', value: records.filter(r => r.status === 'Late').length, color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Timer },
         ].map((stat, i) => {
           const StatIcon = stat.icon;
           return (
           <div key={i} className={`${stat.bg} p-4 rounded-[1.5rem] border border-slate-800 transition-all shadow-sm`}>
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-xl bg-slate-950 shadow-sm ${stat.color}`}>
                    <StatIcon size={16} strokeWidth={3} />
                 </div>
                 <div>
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{stat.label}</label>
                    <div className={`text-xl font-black ${stat.color} leading-none tracking-tight`}>{stat.value}</div>
                 </div>
              </div>
           </div>
         );})}
      </div>

      {records.length > 0 && records[0].status === 'Holiday' && (
        <div className="p-5 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 rounded-3xl flex items-center justify-between gap-4 text-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-300">
              <CalendarCheck size={20} />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-tight text-white">
                School Closed / Holiday: {records[0].holidayTitle || 'Official Holiday'}
              </div>
              <p className="text-[10px] text-purple-300/80 font-medium">
                Attendance is locked for this date. No students or teachers are marked absent.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[9px] font-black uppercase tracking-wider">
            Holiday Protected
          </span>
        </div>
      )}

      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-sm">
         {/* Table view for Desktop, Card view for Mobile */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left table-fixed md:table-auto border-separate border-spacing-0">
               <thead>
                 <tr className="bg-slate-50 dark:bg-slate-950/50">
                   <th className="px-4 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest w-[20%]">profile</th>
                   {activeTab === 'student' && <th className="px-4 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest w-[17%]">Guardian Info</th>}
                   {activeTab === 'student' && <th className="px-4 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest w-[10%]">class</th>}
                   <th className="px-4 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center w-[8%]">status</th>
                   <th className="px-4 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center w-[22%]">action</th>
                   <th className="px-4 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right w-[12%]">by</th>
                   <th className="px-4 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right w-[11%]">time</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {loading ? (
                   <tr><td colSpan="7" className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">working...</td></tr>
                 ) : (filteredRecords || []).length === 0 ? (
                   <tr><td colSpan="7" className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">no records found</td></tr>
                 ) : (filteredRecords || []).map((rec, idx) => {
                   const item = activeTab === 'student' ? rec.student : rec.teacher;
                   const gender = item?.gender?.toLowerCase();
                   
                   return (
                     <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all group">
                        <td className="px-4 py-5">
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all ${gender === 'female' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-500' : 'bg-blue-600/10 text-blue-600 dark:text-blue-500'}`}>
                                 {gender === 'female' ? <User2 size={18} /> : <User size={18} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="font-bold text-slate-800 dark:text-slate-100 text-[13px] truncate leading-none">{(item?.name || item?.fullName || 'Unknown')}</div>
                                 <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate mt-1">
                                    {activeTab === 'student' ? `${item?.regNo || item?.rollNumber || 'N/A'}` : `${item?.email || 'N/A'}`}
                                 </div>
                              </div>
                           </div>
                        </td>
                        {activeTab === 'student' && (
                          <td className="px-4 py-5">
                             <div className="flex flex-col min-w-0">
                                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate leading-tight">{item.fatherName || 'N/A'}</div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 leading-none">{item.phone || item.parentContact || 'No Contact'}</div>
                             </div>
                          </td>
                        )}
                        {activeTab === 'student' && (
                          <td className="px-4 py-5">
                             <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400 truncate tracking-tight">{item.class?.name || 'N/A'}</div>
                             <div className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase truncate mt-0.5">Sec {item.section?.name || 'N/A'}</div>
                          </td>
                        )}
                        <td className="px-4 py-5 text-center">
                           {rec.status ? (
                             <span className={`text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                               rec.status === 'Present' ? 'text-emerald-500' :
                               rec.status === 'Absent' ? 'text-rose-500' :
                               rec.status === 'Leave' ? 'text-amber-500' :
                               rec.status === 'Half Leave' ? 'text-orange-500' :
                               'text-blue-500'
                             }`}>
                                {rec.status}
                             </span>
                           ) : (
                             <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest leading-none">Pending</span>
                           )}
                        </td>
                        <td className="px-4 py-5">
                           <div className="flex justify-center gap-1.5 md:gap-2">
                              {[
                                { s: 'Present', c: 'bg-emerald-600', i: CheckCircle, t: 'P' },
                                { s: 'Absent', c: 'bg-rose-600', i: XCircle, t: 'A' },
                                { s: 'Leave', c: 'bg-amber-600', i: FileClock, t: 'L' },
                                { s: 'Half Leave', c: 'bg-orange-600', i: Clock, t: 'H' },
                                { s: 'Late', c: 'bg-blue-600', i: Timer, t: 'LT' },
                              ].map(btn => {
                                const BtnIcon = btn.i;
                                return (
                                <button
                                  key={btn.s}
                                  onClick={() => handleMark(item._id, btn.s)}
                                  disabled={!isToday && user?.role === 'teacher'}
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                    rec.status === btn.s 
                                    ? `${btn.c} text-white shadow-lg` 
                                    : (!isToday && user?.role === 'teacher')
                                      ? 'bg-slate-900 text-slate-700 border border-slate-800 cursor-not-allowed grayscale'
                                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                                  }`}
                                  title={(!isToday && user?.role === 'teacher') ? 'History cannot be edited' : btn.s}
                                >
                                   <BtnIcon size={14} strokeWidth={3} />
                                </button>
                              );})}
                           </div>
                        </td>
                        <td className="px-4 py-5 text-right">
                           <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-none mb-1 text-[8px]">Marked By</span>
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                 {rec.markedBy || 'System Admin'}
                              </span>
                           </div>
                        </td>
                        <td className="px-4 py-5 text-right">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                              {formatPKT(rec.markedAt)}
                           </span>
                        </td>
                     </tr>
                   );
                 })}
               </tbody>
            </table>
         </div>

         {/* Mobile Card List View */}
         <div className="md:hidden divide-y divide-slate-800">
           {loading ? (
             <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">working...</div>
           ) : (filteredRecords || []).length === 0 ? (
             <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">no records found</div>
           ) : (filteredRecords || []).map((rec, idx) => {
             const item = activeTab === 'student' ? rec.student : rec.teacher;
             const gender = item?.gender?.toLowerCase();
             
             return (
               <div key={idx} className="p-4 bg-slate-900/40 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${gender === 'female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-600/10 text-blue-500'}`}>
                          {gender === 'female' ? <User2 size={18} /> : <User size={18} />}
                       </div>
                       <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">{(item?.name || item?.fullName || 'Unknown')}</div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter truncate">
                             {activeTab === 'student' ? `${item?.regNo || item?.rollNumber || 'N/A'}` : `${item?.email || 'N/A'}`}
                          </div>
                          {activeTab === 'student' && item?.fatherName && (
                            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tight truncate mt-0.5">
                               F: {item.fatherName}
                            </div>
                          )}
                       </div>
                    </div>
                    {rec.status && (
                       <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${
                          rec.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          rec.status === 'Absent' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                       }`}>
                          {rec.status}
                       </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2 w-full overflow-x-auto pb-1 scrollbar-hide">
                       {[
                         { s: 'Present', active: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400', i: CheckCircle, label: 'P' },
                         { s: 'Absent', active: 'bg-rose-600/20 border-rose-500/40 text-rose-400', i: XCircle, label: 'A' },
                         { s: 'Leave', active: 'bg-amber-600/20 border-amber-500/40 text-amber-400', i: FileClock, label: 'LV' },
                         { s: 'Half Leave', active: 'bg-orange-600/20 border-orange-500/40 text-orange-400', i: Clock, label: 'HL' },
                         { s: 'Late', active: 'bg-blue-600/20 border-blue-500/40 text-blue-400', i: Timer, label: 'LT' },
                       ].map(btn => {
                         const BtnIcon = btn.i;
                         return (
                         <button
                           key={btn.s}
                           onClick={() => handleMark(item._id, btn.s)}
                           disabled={!isToday}
                           className={`flex-1 min-w-[54px] py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border ${
                             rec.status === btn.s 
                             ? `${btn.active} shadow-lg` 
                             : 'bg-slate-800 border-slate-700 text-slate-300 active:bg-slate-700'
                           } ${!isToday ? 'opacity-50 grayscale' : ''}`}
                         >
                            <BtnIcon size={14} strokeWidth={2.5} />
                            <span className="text-[8px] font-black uppercase">{btn.label}</span>
                         </button>
                       );})}
                    </div>
                  </div>
                  
                  {rec.markedBy && (
                    <div className="flex items-center justify-end gap-1.5">
                       <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest overflow-hidden truncate max-w-[100px]">By {rec.markedBy}</span>
                       {rec.markedAt && <span className="text-[8px] font-bold text-slate-400">• {formatPKT(rec.markedAt)}</span>}
                       <CheckCircle size={8} className="text-emerald-500" />
                    </div>
                  )}
               </div>
             );
           })}
         </div>
      </div>
    </div>
  );
};

export default Attendance;
