import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  Users,
  Layout,
  Filter,
  CheckCircle,
  Search
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const TeacherAssignments = () => {
  const { user } = useContext(AuthContext);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'Long' }));

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchMySchedule();
  }, []);

  const fetchMySchedule = async () => {
    try {
      setLoading(true);
      // We need an endpoint that returns the teacher's schedule.
      // Since periods are in Sections, we need to find all sections where this teacher is assigned.
      const res = await axios.get(`${API_BASE_URL}/api/teachers/my-schedule`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSchedule(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <BookOpen className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
              Academic <span className="text-blue-500">Schedule</span>
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em]">
              Weekly teaching periods and classroom assignments
            </p>
          </div>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeDay === day 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              {day.substring(0, 3)}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-slate-900/50 rounded-[2.5rem] animate-pulse"></div>
          ))
        ) : schedule[activeDay]?.length > 0 ? (
          schedule[activeDay].map((period, idx) => (
            <div key={idx} className="group bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] hover:bg-slate-800/30 transition-all border-b-4 border-b-blue-600 shadow-2xl shadow-blue-900/5">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Clock size={28} />
                </div>
                <div className="text-right">
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time Slot</div>
                   <div className="font-bold text-white group-hover:text-blue-400 transition-colors">{period.time}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <div className="text-2xl font-bold text-white tracking-tight leading-none">{period.subject}</div>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-medium ml-5">
                   <Layout size={16} />
                   <span>{period.sectionName} ({period.className})</span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-800/50 flex items-center justify-between">
                 <button className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                    <Users size={14} /> Student List
                 </button>
                 <button className="bg-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">
                    View Details
                 </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3rem] text-center">
            <BookOpen className="mx-auto text-slate-700 mb-6" size={64} />
            <h3 className="text-xl font-bold text-slate-400">No periods scheduled for {activeDay}</h3>
            <p className="text-slate-600 mt-2">Enjoy your break or catch up on grading!</p>
          </div>
        )}
      </div>

      {/* Information Panel */}
      <div className="bg-blue-600/5 border border-blue-500/20 p-8 rounded-[3rem] flex flex-col md:flex-row items-center gap-8">
         <div className="w-16 h-16 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-400 shrink-0">
            <CheckCircle size={32} />
         </div>
         <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">Weekly Summary</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
               You are currently assigned to <span className="text-blue-400 font-bold">18 periods</span> per week across 4 different sections. 
               Your total workload is within the recommended school standards.
            </p>
         </div>
         <div className="flex gap-4">
            <div className="text-center px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl">
               <div className="text-2xl font-black text-white">4.8</div>
               <div className="text-[10px] font-bold text-slate-500 uppercase">Avg Rating</div>
            </div>
            <div className="text-center px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl">
               <div className="text-2xl font-black text-white">98%</div>
               <div className="text-[10px] font-bold text-slate-500 uppercase">Attendance</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TeacherAssignments;
