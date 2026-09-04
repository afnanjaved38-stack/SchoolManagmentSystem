import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  Users, 
  UserMinus, 
  RefreshCw, 
  Calendar, 
  Clock, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Search,
  User2,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';

const Substitutions = () => {
  const [absentTeachers, setAbsentTeachers] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableTeachers, setAvailableTeachers] = useState([]);

  // Correct Karachi Date Logic
  const getTodayStr = () => {
    const now = new Date();
    const kTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const year = kTime.getUTCFullYear();
    const month = String(kTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filterDate, setFilterDate] = useState(getTodayStr());

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const absentRes = await axios.get(`${API_BASE_URL}/api/substitutions/absent-staff?date=${filterDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAbsentTeachers(absentRes.data);
      
      const subsRes = await axios.get(`${API_BASE_URL}/api/substitutions/today?date=${filterDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSubstitutions(subsRes.data);
      
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const handleCreateSub = (teacher, slot) => {
    const d = new Date(filterDate);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames[d.getDay()];
    
    setSelectedSlot({ 
        teacher, 
        ...slot, 
        day: currentDay 
    });
    fetchAvailableTeachers(currentDay, slot.startTime);
    setShowSubModal(true);
  };

  const fetchAvailableTeachers = async (day, time) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/substitutions/suggestions?day=${day}&time=${time}&date=${filterDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAvailableTeachers(res.data);
    } catch (err) {
      toast.error('Could not load available teachers');
    }
  };

  const isToday = filterDate === getTodayStr();

  const handleAssignSub = async (substituteTeacher) => {
    try {
        await axios.post(`${API_BASE_URL}/api/substitutions`, {
            originalTeacherId: selectedSlot.teacher._id,
            substituteTeacherId: substituteTeacher._id,
            classId: selectedSlot.classId,
            sectionId: selectedSlot.sectionId,
            subject: selectedSlot.subject,
            time: selectedSlot.startTime,
            date: filterDate
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        toast.success(`Assigned ${substituteTeacher.fullName} for ${selectedSlot.subject}`);
        setShowSubModal(false);
        fetchData(); // Refresh both lists
    } catch (err) {
        toast.error('Failed to assign substitution');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <RefreshCw className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
              Replacement <span className="text-amber-600 dark:text-amber-500">Center</span>
            </h1>
            <p className="text-slate-400 dark:text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em]">
              Duty substitution and absentee management
            </p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-2xl flex items-center gap-4 focus-within:border-blue-600/20 dark:focus-within:border-blue-500/50 transition-all shadow-xl dark:shadow-none">
          <Calendar className="text-blue-600 dark:text-blue-500" size={20} />
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-transparent text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Absent Teachers & Their Periods */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl dark:shadow-none">
            <div className="bg-slate-50 dark:bg-slate-950/50 p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserMinus className="text-red-600 dark:text-red-500" size={18} /> Absent Staff Today
              </h3>
              <span className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-red-100 dark:border-red-500/20">
                {absentTeachers.length} Absent
              </span>
            </div>
            <div className="p-6 space-y-6">
              {(absentTeachers || []).map(teacher => (
                <div key={teacher._id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                      teacher.gender === 'Female' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-500' : 'bg-blue-600/10 text-blue-600 dark:text-blue-500'
                    }`}>
                      <User2 size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{teacher?.fullName || teacher?.name || 'Unknown Teacher'}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">{teacher?.designation || 'Teacher'}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {teacher.schedule && teacher.schedule.length > 0 ? teacher.schedule.map((slot, sIdx) => {
                        const sub = substitutions.find(s => 
                            s.originalTeacher?._id === teacher._id && 
                            s.time === slot.startTime &&
                            s.section?._id === slot.sectionId
                        );
                        
                        return (
                           <PeriodCard 
                              key={sIdx}
                              subject={slot.subject} 
                              classRoom={`${slot.className} - ${slot.sectionName}`} 
                              time={slot.startTime} 
                              status={sub ? 'ASSIGNED' : (isToday ? 'UNASSIGNED' : 'NOT COVERED')}
                              substitute={sub?.substituteTeacher?.fullName}
                              onClick={() => !sub && isToday && handleCreateSub(teacher, slot)}
                           />
                        );
                     }) : (
                        <div className="col-span-full py-4 text-center text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest italic">
                           No classes scheduled for today
                        </div>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Active Substitutions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl dark:shadow-none">
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Today's Assignments</h3>
            <div className="space-y-4">
               {substitutions.length > 0 ? substitutions.map((sub, i) => (
                 <div key={i} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl border-l-4 border-l-emerald-600 dark:border-l-emerald-500">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-xs font-black text-slate-900 dark:text-slate-200 tabular-nums">{sub.time}</span>
                       <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                       <span className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase">{sub.subject}</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{sub.substituteTeacher?.fullName}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase">Replacing {sub.originalTeacher?.fullName}</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-600 font-black mt-1 uppercase tracking-widest">{sub.class?.name} - {sub.section?.name}</div>
                 </div>
               )) : (
                 <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <AlertCircle className="mx-auto mb-2 opacity-20" size={32} />
                    <p className="text-xs font-bold uppercase tracking-widest">No substitutions assigned yet.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Substitution Selection Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
               <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Assign Substitute</h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Finding replacement for {selectedSlot.teacher.fullName || selectedSlot.teacher.name}</p>
               </div>
               <button onClick={() => setShowSubModal(false)} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors">
                 <X size={24} />
               </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 mb-4 shadow-inner">
                   <div>
                      <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Period Info</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedSlot.subject}</div>
                   </div>
                   <ArrowRight className="text-slate-300 dark:text-slate-700" />
                   <div>
                      <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Class & Time</div>
                      <div className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                        {selectedSlot.className} - {selectedSlot.sectionName} @ {selectedSlot.startTime}
                      </div>
                   </div>
                </div>

                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-2">Available Teachers</h4>
                <div className="grid gap-3">
                   {(availableTeachers || []).map(t => (
                     <div key={t._id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                       t.isAvailable ? 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm' : 'bg-slate-50 dark:bg-slate-900/50 border-red-900/10 dark:border-red-900/20 opacity-50 grayscale'
                     }`}>
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                             t.isAvailable 
                               ? (t.gender === 'Female' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-500' : 'bg-blue-600/10 text-blue-600 dark:text-blue-500')
                               : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                           }`}>
                             <User2 size={18} />
                           </div>
                           <div>
                              <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{t?.fullName || t?.name || 'Unknown'}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{t.isAvailable ? 'Free this period' : 'Busy'}</div>
                           </div>
                        </div>
                        {t.isAvailable && (
                          <button 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                            onClick={() => handleAssignSub(t)}
                          >
                            Assign
                          </button>
                        )}
                     </div>
                   ))}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PeriodCard = ({ subject, classRoom, time, status, substitute, onClick }) => (
  <button 
    onClick={onClick}
    disabled={status === 'ASSIGNED' || status === 'NOT COVERED'}
    className={`flex items-center justify-between p-4 border rounded-2xl transition-all text-left ${
      status === 'ASSIGNED' 
        ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 opacity-80' 
        : status === 'NOT COVERED'
          ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-40 cursor-not-allowed'
          : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:bg-slate-900 shadow-sm'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        status === 'ASSIGNED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'
      }`}>
        <Clock size={18} />
      </div>
      <div>
        <div className="text-sm font-bold text-white">{subject}</div>
        <div className="text-[10px] text-slate-500 font-bold">{classRoom}</div>
      </div>
    </div>
    <div className="text-right">
       <div className={`text-[10px] font-black uppercase ${
         status === 'ASSIGNED' ? 'text-emerald-500' : status === 'NOT COVERED' ? 'text-slate-600' : 'text-amber-500'
       }`}>
         {status}
       </div>
       <div className="text-[10px] text-slate-500 font-bold">
         {status === 'ASSIGNED' ? `BY ${substitute?.toUpperCase()}` : time}
       </div>
    </div>
  </button>
);

export default Substitutions;
