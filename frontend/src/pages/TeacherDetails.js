import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  Layout, 
  Phone, 
  Mail, 
  Calendar,
  Clock,
  Briefcase,
  AlertCircle,
  User2,
  Settings,
  Shield,
  Eye,
  EyeOff,
  TrendingUp,
  History,
  Edit2,
  X,
  Target,
  ShieldCheck,
  Award,
  Users,
  ArrowUpRight,
  Trash2,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const TeacherDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPassRevealed, setIsPassRevealed] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Attendance and Performance states
  const [attendance, setAttendance] = useState([]);
  const [attMonthFilter, setAttMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [perfRange, setPerfRange] = useState({
      start: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().slice(0, 7);
      })(),
      end: new Date().toISOString().slice(0, 7)
  });
  const [perfData, setPerfData] = useState([]);

  // Edit form state
  const [editForm, setEditForm] = useState({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      gender: '',
      qualifications: '',
      subjects: ''
  });
  const handleStatusChange = async (newStatus) => {
    try {
      setIsUpdatingStatus(true);
      await axios.put(`${API_BASE_URL}/api/teachers/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTeacher({ ...teacher, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  useEffect(() => {
    fetchTeacherData();
    fetchSchedule();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'attendance') fetchAttendance();
    if (activeTab === 'performance') fetchPerformanceData();
  }, [activeTab, attMonthFilter, perfRange, id]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/teachers/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTeacher(res.data);
      setEditForm({
          fullName: res.data.fullName,
          email: res.data.email,
          phone: res.data.phone,
          password: '',
          gender: res.data.gender,
          qualifications: res.data.qualifications?.join(', '),
          subjects: res.data.subjects?.join(', ')
      });
      setLoading(false);
    } catch (err) {
      toast.error('Failed to fetch profile');
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/teachers/${id}/schedule`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch schedule');
    }
  };

  const fetchAttendance = async () => {
      try {
          const [year, month] = attMonthFilter.split('-');
          const res = await axios.get(`${API_BASE_URL}/api/attendance/teacher/${id}`, {
              params: { month, year },
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setAttendance(res.data || []);
      } catch (err) {
          toast.error('Failed to fetch attendance');
      }
  };

  const fetchPerformanceData = async () => {
      try {
          const res = await axios.get(`${API_BASE_URL}/api/attendance/summary`, {
              params: { 
                  teacherId: id,
                  startMonth: perfRange.start,
                  endMonth: perfRange.end
              },
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setPerfData(res.data || []);
      } catch (err) {
          console.error(err);
      }
  };

  const handleUpdate = async (e) => {
      e.preventDefault();
      try {
          await axios.put(`${API_BASE_URL}/api/teachers/${id}`, editForm, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          toast.success('Teacher updated successfully');
          setIsEditModalOpen(false);
          fetchTeacherData();
      } catch (err) {
          toast.error('Failed to update teacher');
      }
  };

  const handleDeleteTeacher = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(`${API_BASE_URL}/api/teachers/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Teacher profile and user account deleted');
      navigate('/teachers');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to delete teacher');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold animate-pulse uppercase tracking-[0.2em]">Loading Profile...</div>;
  if (!teacher) return <div className="p-10 text-center text-red-500 font-bold uppercase">Teacher not found</div>;

  const tabs = [
      { id: 'details', label: 'Details', icon: <Award size={18}/> },
      { id: 'schedule', label: 'Periods', icon: <BookOpen size={18}/> },
      { id: 'attendance', label: 'Attendance', icon: <Calendar size={18}/> },
      { id: 'performance', label: 'Performance', icon: <TrendingUp size={18}/> }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/teachers')}
            className="w-10 h-10 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              Faculty <span className="text-indigo-500">Profile</span>
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
              <span className="text-white">{teacher.fullName}</span>
              <span className="text-slate-800">•</span>
              <span>{teacher.phone}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <Edit2 size={14} className="inline mr-2" /> Edit Profile
          </button>
          {teacher.status !== 'Active' && (
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 hover:text-red-500 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Trash2 size={14} className="inline mr-2" /> Remove
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
        <div className="flex items-center gap-4">
           <select 
            disabled={isUpdatingStatus}
            value={teacher.status || 'Active'}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-lg outline-none cursor-pointer transition-all ${
              teacher.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              teacher.status === 'On Leave' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
              teacher.status === 'Resigned' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
              'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}
          >
            <option value="Active" className="bg-slate-900 text-white">Active</option>
            <option value="On Leave" className="bg-slate-900 text-white">On Leave</option>
            <option value="Resigned" className="bg-slate-900 text-white">Resigned</option>
            <option value="Suspended" className="bg-slate-900 text-white">Suspended</option>
            <option value="Inactive" className="bg-slate-900 text-white">Inactive</option>
          </select>
        </div>
      </div>

      {/* Profile Card & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Summary Card */}
        {activeTab === 'details' && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
              {/* Background Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] -mr-16 -mt-16 transition-colors ${teacher.gender === 'Female' ? 'bg-pink-500/20' : 'bg-blue-500/20'}`}></div>

              <div className="relative z-10 text-center">
                <div className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center border-4 border-slate-950 shadow-2xl transition-transform duration-500 group-hover:scale-105 ${
                  teacher.gender === 'Female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-600/10 text-blue-500'
                }`}>
                  <User2 size={64} />
                </div>
                
                <h2 className="mt-6 text-2xl font-black text-white px-2 tracking-tight">{teacher.fullName}</h2>
                <div className="flex items-center justify-center gap-2 text-slate-500 mt-1">
                  <ShieldCheck size={14} className="text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-widest">{teacher.phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-10">
                <div className="bg-slate-950/80 p-5 rounded-3xl border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase mb-1">
                     <Calendar size={10} className="text-emerald-500" /> Lifetime Attendance
                  </div>
                  <div className="text-2xl font-black text-emerald-400">{teacher.attendanceRate || 0}%</div>
                </div>
              </div>

              <div className="mt-8 space-y-3 relative z-10">
                <SidebarValueItem icon={<Mail size={16} />} label="Official Email" value={teacher.email} color="text-slate-300" />
                <div className="h-px bg-slate-800/50 my-4"></div>
                <SidebarValueItem icon={<Calendar size={16} />} label="Joining Date" value={new Date(teacher.createdAt || Date.now()).toLocaleDateString()} color="text-slate-300" />
                <SidebarValueItem icon={<History size={16} />} label="Total Classes" value={sessions.reduce((acc, s) => acc + s.periods.length, 0)} color="text-blue-400" />
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Tabbed Content */}
        <div className={`${activeTab === 'details' ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
          {/* Custom Tabs */}
          <div className="bg-slate-950/50 p-1.5 rounded-[1.5rem] border border-slate-800 flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden min-h-[500px] shadow-2xl shadow-slate-950/50">
            {activeTab === 'schedule' && (
              <div className="p-8 space-y-12 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-6">
                   <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                      <BookOpen size={14} /> Assigned Weekly Periods
                   </h3>
                </div>

                <div className="space-y-12">
                  {sessions.length === 0 && <EmptyState text="No classes assigned" />}
                  {sessions.map((session, sIdx) => (
                    <div key={sIdx} className="space-y-6">
                       <div className="flex items-center gap-4">
                          <span className={`px-4 py-1.5 ${session.name.toLowerCase().includes('friday') ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-600/10 text-blue-500 border-blue-500/20'} text-[10px] font-black uppercase rounded-xl border tracking-[0.2em]`}>
                             {session.name}
                          </span>
                          <div className="h-px bg-slate-800 flex-1 opacity-50"></div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {session.periods.map((p, pIdx) => (
                            <div key={`${sIdx}-${pIdx}`} className="bg-slate-950/50 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/30 transition-all group relative overflow-hidden">
                               <div className="flex justify-between items-start mb-4 relative z-10">
                                  <div className={`w-10 h-10 ${session.name.toLowerCase().includes('friday') ? 'bg-emerald-600/10 text-emerald-500' : 'bg-blue-600/10 text-blue-500'} rounded-xl flex items-center justify-center border border-blue-500/10`}>
                                     <Layout size={20} />
                                  </div>
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                                     {p.startTime} - {p.endTime}
                                  </span>
                               </div>
                               <h4 className="text-sm font-black text-white uppercase group-hover:text-blue-500 transition-colors tracking-tight relative z-10">{p.subject}</h4>
                               <div className="mt-2 flex flex-col gap-1 relative z-10">
                                  <div className="text-[10px] font-bold text-slate-400">Class: <span className="text-slate-200">{p.className}</span></div>
                                  <div className="text-[10px] font-bold text-slate-500">Section: <span className="text-slate-300">{p.sectionName}</span></div>
                               </div>
                               <div className="mt-4 flex gap-1 flex-wrap relative z-10">
                                  {p.days.map(d => (
                                     <span key={d} className="text-[8px] font-black px-2 py-0.5 bg-slate-900 text-slate-500 rounded-md border border-slate-800 uppercase tracking-widest">
                                        {d.slice(0, 3)}
                                     </span>
                                  ))}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="p-8 space-y-10 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic & Qualifications */}
                  <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
                       <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                          <User size={14} /> Teacher Information
                       </h4>
                    </div>
                    <div className="space-y-2">
                       <DetailRow label="Full Name" value={teacher.fullName} />
                       <DetailRow label="Gender" value={teacher.gender} />
                       <DetailRow label="Phone" value={teacher.phone} color="text-blue-400" />
                       <DetailRow label="Joining Date" value={new Date(teacher.createdAt).toLocaleDateString()} />
                       <DetailRow label="Qualifications" value={teacher.qualifications?.join(', ')} />
                       <DetailRow label="Subjects" value={teacher.subjects?.join(', ')} color="text-emerald-400" />
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Account Access */}
                    <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 space-y-6">
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                         <Settings size={14} /> Profile Access
                      </h4>
                      <div className="space-y-4">
                         <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left">
                            <div className="text-[8px] font-black text-slate-500 uppercase mb-1">Login Username</div>
                            <div className="text-sm font-bold text-white tracking-tight">{teacher.email}</div>
                         </div>
                         <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between group">
                            <div className="flex-1 text-left">
                               <div className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Account Password</div>
                               <div className="text-sm font-black tracking-widest text-emerald-400">
                                  {isPassRevealed ? (teacher.user?.plainPassword || 'UNSET') : '●●●●●●●●'}
                               </div>
                            </div>
                            <button 
                              onClick={() => setIsPassRevealed(!isPassRevealed)}
                              className="p-3 bg-slate-950 rounded-xl text-emerald-500/50 border border-slate-800 hover:text-emerald-500 transition-colors"
                            >
                               {isPassRevealed ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                         </div>
                         <p className="text-[9px] text-slate-600 font-bold px-1 uppercase tracking-tighter">Credentials are visible for administrative reference ONLY</p>
                      </div>
                    </div>

                    {/* Assigned Sections */}
                    <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 space-y-6">
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                         <ShieldCheck size={14} /> Managed Sections
                      </h4>
                      <div className="space-y-4">
                         {teacher.managedSections?.length > 0 ? teacher.managedSections.map(sec => (
                            <div key={sec._id} className="group relative p-5 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center gap-5 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden"
                              onClick={() => navigate(`/classes/${sec.class?._id || sec.class}`)}
                            >
                               <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ArrowUpRight size={14} className="text-blue-500" />
                               </div>
                               <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/10 group-hover:scale-110 transition-transform">
                                  <Users size={20} />
                               </div>
                               <div className="text-left">
                                  <div className="text-sm font-black text-white uppercase tracking-tight">Grade {sec.class?.name || 'N/A'}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section {sec.name}</span>
                                     <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                     <span className="text-[10px] font-bold text-blue-400 capitalize">Class Head</span>
                                  </div>
                               </div>
                            </div>
                         )) : (
                            <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-3xl">
                               <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest italic">No sections managed</p>
                            </div>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-slate-950 p-6 rounded-[2.5rem] border border-slate-800 flex items-center justify-between">
                   <div className="px-2">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">Monthly Attendance</h4>
                      <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 tracking-tighter">View and verify monthly presence logs</p>
                   </div>
                   <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 pr-4 rounded-2xl">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Select Month</label>
                    <input 
                      type="month" 
                      className="bg-slate-950 border border-slate-800 text-white px-5 py-2 rounded-xl outline-none text-xs font-bold focus:border-blue-500/50 transition-all font-bold"
                      value={attMonthFilter}
                      onChange={(e) => setAttMonthFilter(e.target.value)}
                    />
                   </div>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="border-b border-slate-800">
                         <th className="py-4 px-4 font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em]">Date</th>
                         <th className="py-4 px-4 font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em]">Marked By</th>
                         <th className="py-4 px-4 font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em] text-right">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800/50">
                       {attendance.length > 0 ? attendance.map((at, idx) => (
                         <tr key={idx} className="hover:bg-slate-800/20 transition-all group">
                           <td className="py-5 px-4">
                              <div className="text-sm text-slate-300 font-bold">{new Date(at.date).toDateString()}</div>
                           </td>
                           <td className="py-5 px-4">
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                 {at.isPadding ? (
                                   <span className="text-slate-700 italic">No Entry</span>
                                 ) : (
                                   at.markedBy?.name || (typeof at.markedBy === 'string' ? at.markedBy : 'System')
                                 )}
                              </div>
                           </td>
                           <td className="py-5 px-4 text-right">
                              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                at.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/10' :
                                at.status === 'Absent' ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-900/10' :
                                at.status === 'Leave' || at.status === 'Half Leave' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-900/10' :
                                (at.status === 'Holiday' || at.status === 'Sunday') ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-indigo-900/10' :
                                at.status === 'Late' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20 shadow-sky-900/10' :
                                at.status === 'Not Marked' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20 shadow-slate-900/10' :
                                'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 shadow-fuchsia-900/10'
                              }`}>
                                {at.status}
                              </span>
                           </td>
                         </tr>
                       )) : (
                         <tr><td colSpan="3" className="py-20 text-center text-slate-600 font-black uppercase text-[10px] tracking-[0.3em] italic">Record Clean - No entries found</td></tr>
                       )}
                     </tbody>
                   </table>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div className="bg-slate-950 p-6 rounded-[2.5rem] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="px-2">
                       <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">Growth Performance</h4>
                       <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 tracking-tighter">Teaching efficiency and presence trends</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 border border-slate-800 p-2 sm:pr-4 rounded-2xl w-full md:w-auto">
                       <div className="flex items-center gap-4 w-full sm:w-auto">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 whitespace-nowrap">From</label>
                          <input 
                            type="month" 
                            className="bg-slate-950 border border-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold outline-none focus:border-blue-500/50 transition-all font-bold w-full" 
                            value={perfRange?.start || ''}
                            onChange={e => setPerfRange({...perfRange, start: e.target.value})}
                          />
                       </div>
                       <div className="flex items-center gap-4 w-full sm:w-auto">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 sm:ml-0 whitespace-nowrap">To</label>
                          <input 
                            type="month" 
                            className="bg-slate-950 border border-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold outline-none focus:border-blue-500/50 transition-all font-bold w-full" 
                            value={perfRange?.end || ''}
                            onChange={e => setPerfRange({...perfRange, end: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-950 p-10 rounded-[3rem] border border-slate-800 shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                    <div className="h-[300px] w-full">
                       <Line 
                         key={`teacher-perf-${perfData.length}-${perfRange.start}-${perfRange.end}`}
                         data={{
                            labels: (Array.isArray(perfData) ? perfData : []).map(d => d.month),
                            datasets: [{
                              label: 'Attendance Rate',
                              data: (Array.isArray(perfData) ? perfData : []).map(d => d.percentage),
                              borderColor: '#3b82f6',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              fill: true,
                              tension: 0.4,
                              borderWidth: 3,
                              pointRadius: perfData.length > 31 ? 0 : 4,
                              pointBackgroundColor: '#fff',
                              pointBorderColor: '#3b82f6',
                              pointBorderWidth: 2
                            }]
                         }} 
                         options={{ 
                           responsive: true, 
                           maintainAspectRatio: false,
                           plugins: { 
                              legend: { display: false },
                              tooltip: {
                                 callbacks: {
                                    label: (context) => `Status: ${context.raw}%`
                                 }
                              }
                           },
                           scales: { 
                             y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => v + '%' } },
                             x: { grid: { display: false }, border: { display: false }, ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } } }
                           }
                         }} 
                       />
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
               <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Edit Profile</h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Update basic account information</p>
               </div>
               <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400">
                  <X size={24} />
               </button>
            </div>

            <form onSubmit={handleUpdate} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
               <div className="grid grid-cols-2 gap-5">
                  <EditInput label="Teacher Full Name" value={editForm.fullName} onChange={v => setEditForm({...editForm, fullName: v})} />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Gender</label>
                    <select 
                        className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl focus:ring-2 focus:ring-blue-600/50 outline-none transition-all font-bold text-sm"
                        value={editForm.gender}
                        onChange={e => setEditForm({...editForm, gender: e.target.value})}
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                  </div>
                  <EditInput label="Phone Number" value={editForm.phone} onChange={v => setEditForm({...editForm, phone: v})} />
                  <EditInput label="Official Email" type="email" value={editForm.email} onChange={v => setEditForm({...editForm, email: v})} />
                  <EditInput label="Qualifications" value={editForm.qualifications} onChange={v => setEditForm({...editForm, qualifications: v})} />
                  <EditInput label="Subjects" value={editForm.subjects} onChange={v => setEditForm({...editForm, subjects: v})} />
                  <div className="col-span-2">
                    <EditInput label="Update Password (Optional)" type="text" value={editForm.password} onChange={v => setEditForm({...editForm, password: v})} />
                  </div>
               </div>

               <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Cancel</button>
                  <button type="submit" className="flex-2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-900/30 transition-all">Save Changes</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Critical Action!</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                You are about to permanently delete <span className="text-white font-bold">{teacher.fullName}</span>. 
                This will also remove their login access and history.
              </p>
              
              <div className="mt-8 space-y-4">
                <div className="text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                    Type teacher's name to confirm
                  </label>
                  <input 
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-red-500/50 outline-none transition-all font-bold"
                    placeholder={teacher.fullName}
                    value={deleteConfirmation}
                    onChange={e => setDeleteConfirmation(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmation('');
                    }}
                    className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={deleteConfirmation !== teacher.fullName || isDeleting}
                    onClick={handleDeleteTeacher}
                    className="flex-[1.5] px-6 py-4 bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black hover:bg-red-500 transition-all shadow-xl shadow-red-900/30 uppercase tracking-widest text-xs"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarValueItem = ({ icon, label, value, color }) => (
  <div className="flex items-center gap-4 p-4 hover:bg-slate-800/50 rounded-2xl transition-all duration-300 group">
    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700 transition-all border border-slate-700">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</div>
      <div className={`text-xs font-bold ${color || 'text-slate-200'} truncate`}>{value || 'Not provided'}</div>
    </div>
  </div>
);

const DetailRow = ({ label, value, color }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-800/30 last:border-0 hover:bg-slate-900/50 px-3 rounded-xl transition-all">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <span className={`text-xs font-bold ${color || 'text-slate-300'} text-right ml-4`}>{value || 'N/A'}</span>
  </div>
);

const EditInput = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">{label}</label>
    <input 
      type={type}
      className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl focus:ring-2 focus:ring-blue-600/50 outline-none transition-all font-bold text-sm"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={type === 'password' ? 'Leave blank to keep current' : ''}
    />
  </div>
);

const EmptyState = ({ text }) => (
   <div className="col-span-full py-16 bg-slate-950/20 border border-slate-800 border-dashed rounded-[3rem] flex flex-col items-center justify-center text-slate-600 gap-4">
      <AlertCircle size={40} className="text-slate-800" />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{text}</span>
   </div>
);

export default TeacherDetails;

