import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  Plus, 
  Search, 
  Settings, 
  UserSquare2, 
  Mail, 
  Phone, 
  GraduationCap, 
  BookMarked,
  X,
  PlusCircle,
  MoreVertical,
  Trash2,
  Lock,
  User,
  User2,
  Eye
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';

const Teachers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [teachers, setTeachers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(location.state?.openForm || false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTeacher, setNewTeacher] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    gender: '',
    qualifications: '',
    subjects: ''
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/teachers`);
      setTeachers(res.data);
    } catch (err) {
      toast.error('Failed to load teachers');
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/teachers`, newTeacher);
      toast.success('Teacher registered successfully');
      setShowAddModal(false);
      setNewTeacher({ fullName: '', email: '', phone: '', password: '', gender: '', qualifications: '', subjects: '' });
      fetchTeachers();
    } catch (err) {
      toast.error('Failed to register teacher. Email might be in use.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <UserSquare2 className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Faculty <span className="text-indigo-500">Fleet</span>
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em]">
              Teaching staff management and assignment control
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-[0_20px_50px_-15px_rgba(99,102,241,0.5)] transition-all active:scale-95"
        >
          <PlusCircle size={18} /> Register Staff
        </button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, subject, or qualification..."
            className="w-full bg-slate-900 border border-slate-800 text-white pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-indigo-600/50 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Teacher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.filter(t => (t.fullName || '').toLowerCase().includes((searchTerm || '').toLowerCase())).map((teacher) => (
          <div 
            key={teacher._id} 
            onClick={() => navigate(`/teachers/${teacher._id}`)}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group cursor-pointer active:scale-[0.98] shadow-lg hover:shadow-indigo-900/10"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${teacher.gender === 'Female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-500/10 text-blue-500'}`}>
                <User2 size={40} />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); /* Logic for options */ }}
                className="text-slate-600 hover:text-slate-400 p-2"
              >
                <MoreVertical size={20}/>
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{teacher.fullName}</h3>
            <p className="text-sm text-indigo-400 font-bold uppercase tracking-widest text-[10px] mb-4">
                {teacher.subjects?.join(' • ')}
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <Mail size={16} className="text-slate-600" />
                <span className="truncate">{teacher.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <Phone size={16} className="text-slate-600" />
                <span>{teacher.phone}</span>
              </div>
              <div className="flex items-start gap-3 text-slate-400 text-sm">
                <GraduationCap size={16} className="text-slate-600 mt-1" />
                <span className="flex-1 line-clamp-2">{teacher.qualifications?.join(', ')}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center">
               <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${teacher.gender === 'Female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-500/10 text-blue-500'}`}>
                 {teacher.gender}
               </span>
               <div className="flex gap-2">
                 <div className="text-indigo-400 text-sm font-bold flex items-center gap-1 group-hover:text-white transition-all bg-indigo-500/10 p-2 rounded-xl group-hover:bg-indigo-600">
                   <Eye size={18} />
                 </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-800 p-8 md:p-12 animate-in zoom-in-95 duration-300 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-10 border-b border-slate-800/50 pb-8">
                 <div>
                   <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">Registration</h2>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2">Faculty Access Provisioning</p>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="bg-slate-950 p-3 rounded-2xl text-slate-500 hover:text-white border border-slate-800 transition-all hover:rotate-90 hover:scale-110 active:scale-95 shadow-2xl">
                    <X size={24}/>
                 </button>
               </div>

               <form onSubmit={handleAddTeacher} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                       <input 
                          required
                          className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-600/50 outline-none transition-all placeholder:text-slate-700"
                          value={newTeacher.fullName}
                          onChange={e => setNewTeacher({...newTeacher, fullName: e.target.value})}
                          placeholder="Dr. Christopher Nolan"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                       <select 
                          required
                          className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all appearance-none cursor-pointer"
                          value={newTeacher.gender}
                          onChange={e => setNewTeacher({...newTeacher, gender: e.target.value})}
                       >
                          <option value="">Choose Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                       </select>
                    </div>
                 </div>

                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Email Address</label>
                   <div className="relative group">
                     <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors" size={18}/>
                     <input 
                        required
                        type="email"
                        className="w-full bg-slate-950 border border-slate-800 text-white pl-14 pr-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all placeholder:text-slate-700"
                        value={newTeacher.email}
                        onChange={e => setNewTeacher({...newTeacher, email: e.target.value})}
                        placeholder="nolan@ogces.edu.pk"
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact Number</label>
                       <input 
                          required
                          className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all placeholder:text-slate-700"
                          value={newTeacher.phone}
                          onChange={e => setNewTeacher({...newTeacher, phone: e.target.value})}
                          placeholder="+92 300 1234567"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Password</label>
                       <div className="relative group">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors" size={18}/>
                          <input 
                            required
                            type="password"
                            className="w-full bg-slate-950 border border-slate-800 text-white pl-14 pr-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all"
                            value={newTeacher.password}
                            onChange={e => setNewTeacher({...newTeacher, password: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Qualifications</label>
                   <input 
                      required
                      className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all placeholder:text-slate-700"
                      value={newTeacher.qualifications}
                      onChange={e => setNewTeacher({...newTeacher, qualifications: e.target.value})}
                      placeholder="M.Phil English Literature, PhD (Applied Linguistics)"
                   />
                 </div>

                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Core Subjects</label>
                   <input 
                      required
                      className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all placeholder:text-slate-700"
                      value={newTeacher.subjects}
                      onChange={e => setNewTeacher({...newTeacher, subjects: e.target.value})}
                      placeholder="English, Sociology, Critical Thinking"
                   />
                 </div>

                 <div className="pt-4">
                    <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[12px] tracking-[0.3em] py-5 rounded-2xl shadow-2xl shadow-indigo-900/40 transition-all hover:scale-[1.02] active:scale-95">
                      Confirm Registration
                    </button>
                 </div>
               </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
