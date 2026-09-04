import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  Clock, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Calendar,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';

const SessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    name: '',
    days: []
  });

  const availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSessions(res.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to fetch timetable sessions');
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (sessions.length >= 6) {
      toast.error('Maximum 6 day schedule profiles allowed');
      return;
    }
    if (newSession.days.length === 0) {
      toast.error('Select at least one day');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/sessions`, newSession, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Timetable day profile created successfully');
      setIsModalOpen(false);
      setNewSession({ name: '', days: [] });
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create profile');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this day profile? This will affect class timetable schedules.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/sessions/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Day profile deleted');
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const toggleDay = (day) => {
    setNewSession(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day) 
        : [...prev.days, day]
    }));
  };

  if (loading) return <div className="p-10 text-center animate-pulse font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-xs">Loading Timetable Day Profiles...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-16">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <Clock size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              Weekly Timetable <span className="text-blue-500">Day Profiles</span>
            </h1>
            <p className="text-slate-500 mt-1 font-bold uppercase text-[10px] tracking-[0.3em]">
              Configure Multi-Day Schedule Profiles (e.g. Regular 7-Periods vs Friday 5-Periods)
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus size={16} /> New Day Profile
        </button>
      </header>

      {/* Info Notice */}
      <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl flex items-start gap-4">
        <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1">
          <p className="text-xs font-black text-blue-400 uppercase tracking-wider">Weekly Schedule Grouping</p>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Define day groups like <strong>"Regular Days (Mon-Thu, Sat)"</strong> and <strong>"Friday Schedule"</strong>. These profiles automatically appear inside every Class Section's timetable editor so you can configure different period timings for different days of the week.
          </p>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map(session => (
          <div 
            key={session._id} 
            className="bg-slate-900 border border-slate-800 p-7 rounded-[2rem] hover:border-slate-700 transition-all group relative overflow-hidden shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight uppercase">{session.name}</h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {session.days?.length || 0} Operational Days
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => handleDelete(session._id)}
                  className="p-2.5 bg-slate-950 text-slate-500 hover:text-red-400 rounded-xl border border-slate-800 transition-all opacity-0 group-hover:opacity-100"
                  title="Delete Day Profile"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Active Days Badges */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {availableDays.map(day => {
                  const isDayActive = session.days?.includes(day);
                  return (
                    <span 
                      key={day}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        isDayActive 
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                          : 'bg-slate-950 text-slate-600 border border-slate-800/80'
                      }`}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: New Day Profile */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Create Timetable Day Profile</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">e.g. Regular Schedule, Friday Short Day</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Profile / Schedule Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Regular Days (Mon-Thu, Sat)"
                  required
                  value={newSession.name}
                  onChange={e => setNewSession({...newSession, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Applicable School Days</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableDays.map(day => {
                    const isSelected = newSession.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                            : 'bg-slate-950 text-slate-500 border-slate-800'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl border border-slate-800 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-900/30"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManager;
