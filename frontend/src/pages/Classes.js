import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Settings, 
  Trash2, 
  X,
  User,
  User2,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { toast } from 'react-toastify';

const Classes = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newClass, setNewClass] = useState({
    name: '',
    fees: {
      admissionFee: 0,
      monthlyTuition: 0,
      examFee: 0,
      miscCharges: 0
    }
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(res.data);
    } catch (err) {
      toast.error('Failed to fetch classes');
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/classes`, newClass, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Class added successfully');
      setShowAddModal(false);
      setNewClass({
        name: '',
        fees: { admissionFee: 0, monthlyTuition: 0, examFee: 0, miscCharges: 0 }
      });
      fetchClasses();
    } catch (err) {
      toast.error('Failed to create class');
    }
  };

  const deleteClass = async (id) => {
    if (window.confirm('Warning: Deleting this class will delete all its sections, students, and their records. Continue?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/api/classes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Class deleted');
        fetchClasses();
      } catch (err) {
        toast.error('Failed to delete class');
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <BookOpen className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
              Academic <span className="text-blue-600 dark:text-blue-500">Units</span>
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em]">
              Management of school grades and fee protocols
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => navigate('/sessions')}
            className="w-full sm:w-auto bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all"
          >
            Sessions
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-[0_20px_50px_-15px_rgba(59,130,246,0.5)] transition-all active:scale-95"
          >
            <Plus size={18} /> New Class
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div 
            key={cls._id} 
            onClick={() => navigate(`/classes/${cls._id}`)}
            className="group bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden shadow-2xl hover:bg-slate-800/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-600/10 dark:bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-500 border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform">
                    <BookOpen size={24} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight leading-none">{cls.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">View Details</p>
                 </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                 <span className="text-xs font-black text-emerald-600 dark:text-emerald-500 tabular-nums">{cls.todayPresence || 0}%</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 flex flex-col items-center group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-all shadow-sm">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{cls.totalStudents || 0}</span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">Students</span>
               </div>
               <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 flex flex-col items-center group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-all shadow-sm">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-500">{cls.sectionsCount || 0}</span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">Sections</span>
               </div>
            </div>

            {/* Footer Fee Badge */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800/50">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Enrollment Fee</span>
               </div>
               <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">PKR</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{(cls.fees?.admissionFee || 0).toLocaleString()}</span>
               </div>
            </div>

            {/* Subtle Hover Effect */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-800 my-8 overflow-hidden">
            <div className="flex items-center justify-between p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Create New Class</h2>
                <p className="text-slate-500 mt-3 font-black uppercase text-[10px] tracking-widest">Configure academic unit and fee schedule</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-4 hover:bg-white dark:hover:bg-slate-800 rounded-2xl group transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <X className="text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" size={24} />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="p-10 space-y-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-1 uppercase tracking-widest">Academic Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Metric-B, Class-1"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-6 py-5 rounded-[1.25rem] focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-600/20 outline-none transition-all shadow-sm font-bold uppercase placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    value={newClass.name}
                    onChange={e => setNewClass({...newClass, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-1 uppercase tracking-widest">Admission Protocol</label>
                       <div className="relative">
                          <input 
                              type="number" 
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-6 py-5 rounded-[1.25rem] focus:ring-4 focus:ring-emerald-600/10 dark:focus:ring-emerald-600/20 outline-none transition-all font-black text-lg tabular-nums"
                              value={newClass.fees.admissionFee}
                              onChange={e => setNewClass({...newClass, fees: {...newClass.fees, admissionFee: parseInt(e.target.value) || 0}})}
                          />
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase">PKR</span>
                       </div>
                       <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest ml-1 mt-2 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-emerald-500"></div> One-time setup
                       </p>
                  </div>
                  <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-1 uppercase tracking-widest">Monthly Tuition</label>
                       <div className="relative">
                          <input 
                              type="number" 
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-6 py-5 rounded-[1.25rem] focus:ring-4 focus:ring-emerald-600/10 dark:focus:ring-emerald-600/20 outline-none transition-all font-black text-lg tabular-nums"
                              value={newClass.fees.monthlyTuition}
                              onChange={e => setNewClass({...newClass, fees: {...newClass.fees, monthlyTuition: parseInt(e.target.value) || 0}})}
                          />
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase">PKR</span>
                       </div>
                       <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest ml-1 mt-2 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-blue-500"></div> Regular billing
                       </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-5 pt-10 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-8 py-5 font-black text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all uppercase text-[10px] tracking-widest rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black shadow-2xl shadow-blue-900/40 transition-all active:scale-95 uppercase text-[10px] tracking-widest"
                >
                  Create Academic Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
