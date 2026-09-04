import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Check, 
  GraduationCap, 
  ArrowRight, 
  Sparkles, 
  X,
  Clock,
  Layers,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AcademicYears = () => {
  const navigate = useNavigate();
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newYear, setNewYear] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/academic-years`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAcademicYears(res.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load academic years');
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newYear.name || !newYear.startDate || !newYear.endDate) {
      return toast.error('Please fill in all fields');
    }

    try {
      await axios.post(`${API_BASE_URL}/api/academic-years`, newYear, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Academic Year created successfully');
      setIsModalOpen(false);
      setNewYear({
        name: '',
        startDate: '',
        endDate: '',
        isActive: false
      });
      fetchAcademicYears();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create academic year');
    }
  };

  const handleActivate = async (id) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/api/academic-years/${id}/activate`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(res.data.message || 'Active Academic Year switched');
      fetchAcademicYears();
    } catch (err) {
      toast.error('Failed to switch active academic year');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this academic year? Archived records referencing it will be retained.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/academic-years/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Academic year deleted');
      fetchAcademicYears();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) {
    return <div className="p-10 text-center animate-pulse font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-xs">Loading Academic Years...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-16">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              Annual <span className="text-emerald-400">Academic Years</span>
            </h1>
            <p className="text-slate-500 mt-1 font-bold uppercase text-[10px] tracking-[0.3em]">
              Annual School Cycles • Session Boundaries & Promotion Anchors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/students/promotion')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all"
          >
            <GraduationCap size={16} /> Batch Promote Students
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
          >
            <Plus size={16} /> New Academic Year
          </button>
        </div>
      </header>

      {/* Promotion Quick Banner */}
      <div 
        onClick={() => navigate('/students/promotion')}
        className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-blue-950/40 border border-emerald-500/30 p-6 rounded-[2rem] flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">Academic Year Transition & Promotions</h3>
            <p className="text-xs text-slate-300 mt-0.5">Promote whole classes to the next grade and retain repeat students in one streamlined workflow.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-wider group-hover:translate-x-1 transition-all">
          <span>Open Promotion Engine</span>
          <ArrowRight size={16} />
        </div>
      </div>

      {/* Academic Years Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {academicYears.map(year => (
          <div 
            key={year._id} 
            className={`bg-slate-900 border ${year.isActive ? 'border-emerald-500/60 ring-2 ring-emerald-500/20' : 'border-slate-800'} p-7 rounded-[2rem] transition-all group relative overflow-hidden shadow-xl flex flex-col justify-between`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${year.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">{year.name}</h3>
                    {year.isActive && (
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <Check size={12} /> Active Academic Cycle
                      </span>
                    )}
                  </div>
                </div>

                {!year.isActive && (
                  <button 
                    onClick={() => handleDelete(year._id)}
                    className="p-2.5 bg-slate-950 text-slate-500 hover:text-red-400 rounded-xl border border-slate-800 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Academic Year"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Date Boundaries */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Starts On:</span>
                  <span className="font-black text-white">
                    {new Date(year.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Ends On:</span>
                  <span className="font-black text-white">
                    {new Date(year.endDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {year.isActive ? 'Active attendance & fee anchor' : 'Archived academic cycle'}
              </span>

              {!year.isActive && (
                <button
                  onClick={() => handleActivate(year._id)}
                  className="px-4 py-2 bg-slate-950 hover:bg-emerald-600 hover:text-white border border-slate-800 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Set Active
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: New Academic Year */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Create Academic Year</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Annual school calendar cycle</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Year Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Academic Year 2025-26"
                  required
                  value={newYear.name}
                  onChange={e => setNewYear({...newYear, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                  <input 
                    type="date"
                    required
                    value={newYear.startDate}
                    onChange={e => setNewYear({...newYear, startDate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                  <input 
                    type="date"
                    required
                    value={newYear.endDate}
                    onChange={e => setNewYear({...newYear, endDate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl border border-slate-800 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-900/30"
                >
                  Save Academic Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicYears;
