import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  BarChart2, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Timer,
  FileClock,
  Search,
  Filter,
  TrendingUp,
  Award,
  Edit,
  Edit2,
  Save,
  X,
  PlusCircle,
  MoreVertical,
  ChevronDown,
  Trash2,
  AlertCircle,
  ArrowUpRight,
  User2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement 
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const ClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [activeTab, setActiveTab] = useState('sections');
  const [selectedSection, setSelectedSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [perfRange, setPerfRange] = useState({
    start: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 7);
    })(),
    end: new Date().toISOString().slice(0, 7)
  });
  const [perfData, setPerfData] = useState([]);
  const [perfStats, setPerfStats] = useState({
    avgPresence: 0,
    topStudents: [],
    sectionPerformance: [],
    growth: []
  });
  const [globalSessions, setGlobalSessions] = useState([]);
  
  const getTodayStr = () => {
    const now = new Date();
    const kTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const year = kTime.getUTCFullYear();
    const month = String(kTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [attFilters, setAttFilters] = useState({
    sectionId: '',
    status: 'All',
    search: '',
    date: getTodayStr()
  });
  const [allAttendance, setAllAttendance] = useState([]);

  const [showClassSettings, setShowClassSettings] = useState(false);
  const [editedClass, setEditedClass] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSection, setNewSection] = useState({ name: '', periods: [] });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduleIdx, setEditingScheduleIdx] = useState(-1);
  const [tempSchedule, setTempSchedule] = useState({ name: '', days: [], periods: [] });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showSectionDeleteModal, setShowSectionDeleteModal] = useState(false);
  const [sectionDeleteConfirmation, setSectionDeleteConfirmation] = useState('');

  const [editingPeriod, setEditingPeriod] = useState(null);
  const [editingPeriodIdx, setEditingPeriodIdx] = useState(-1);

  useEffect(() => {
    fetchClassDetails();
    fetchTeachers();
    fetchGlobalSessions();
  }, [id]);

  const fetchGlobalSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setGlobalSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch global sessions');
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance' || activeTab === 'students') {
      fetchGlobalAttendance();
    }
  }, [activeTab, attFilters.date, attFilters.sectionId]);

  useEffect(() => {
    if (activeTab === 'performance') {
       fetchPerformanceData();
    }
  }, [activeTab, perfRange, selectedSection]);

  const fetchPerformanceData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/attendance/summary`, {
        params: { 
          classId: id,
          sectionId: selectedSection?._id,
          startMonth: perfRange.start,
          endMonth: perfRange.end
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (res.data) {
        setPerfStats({
          avgPresence: res.data.overallAvg || 0,
          topStudents: res.data.topStudents || [],
          sectionPerformance: res.data.sectionPerformance || [],
          growth: res.data.growth || []
        });
      }
    } catch (err) {
      console.error(err);
      setPerfStats({
        avgPresence: 0,
        topStudents: [],
        sectionPerformance: [],
        growth: []
      });
    }
  };

  const fetchGlobalAttendance = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/attendance/school-wide?date=${attFilters.date}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const classAttendance = res.data.filter(item => item.student.class?._id === id || item.student.class === id);
      setAllAttendance(classAttendance);
    } catch (err) {
      toast.error('Failed to fetch attendance');
    }
  };

  const fetchClassDetails = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCls(res.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to fetch class details');
      navigate('/classes');
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/teachers`);
      setTeachers(res.data);
    } catch (err) {
      toast.error('Failed to load teachers');
    }
  };

  const [allSections, setAllSections] = useState([]);
  const fetchAllSections = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes/all-sections`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Label with class name for display in busy message
      const formatted = res.data.map(sec => ({
        ...sec,
        className: sec.class?.name || 'Unknown Class'
      }));
      setAllSections(formatted);
    } catch (err) {
      console.error('Error fetching sections for conflicts:', err);
    }
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const checkTeacherConflict = (teacherId, startTime, endTime, days, currentPeriodIdx) => {
    if (!teacherId || !startTime || !endTime || !days || !days.length) return null;

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    // 1. Check against other periods in THIS current session (tempSchedule)
    for (let i = 0; i < tempSchedule.periods.length; i++) {
      if (i === currentPeriodIdx) continue;
      const p = tempSchedule.periods[i];
      const pTeacherId = p.teacher?._id || p.teacher;
      if (pTeacherId && pTeacherId.toString() === teacherId.toString()) {
        const pStart = timeToMinutes(p.startTime);
        const pEnd = timeToMinutes(p.endTime);
        if (Math.max(start, pStart) < Math.min(end, pEnd)) {
          return { class: 'Current Session', period: p.title || `Period ${i+1}` };
        }
      }
    }

    // 2. Check against OTHER sessions of the SAME section
    if (selectedSection && selectedSection.schedules) {
      for (let sIdx = 0; sIdx < selectedSection.schedules.length; sIdx++) {
        // Skip the one we are currently editing
        if (sIdx === editingScheduleIdx) continue;
        const sch = selectedSection.schedules[sIdx];

        // Check for day overlaps
        const commonDays = sch.days.filter(d => days.includes(d));
        if (commonDays.length > 0) {
          for (const p of sch.periods) {
            const pTeacherId = p.teacher?._id || p.teacher;
            if (pTeacherId && pTeacherId.toString() === teacherId.toString()) {
              const pStart = timeToMinutes(p.startTime);
              const pEnd = timeToMinutes(p.endTime);
              if (Math.max(start, pStart) < Math.min(end, pEnd)) {
                return { class: `Other Session (${sch.name})`, period: p.title || p.subject };
              }
            }
          }
        }
      }
    }

    // 3. Check against ALL other sections in the school
    for (const sec of allSections) {
      // Skip the current section we are editing (it's handled in point 2)
      if (selectedSection && sec._id === selectedSection._id) continue;

      if (sec.schedules) {
        for (const sch of sec.schedules) {
          const commonDays = sch.days.filter(d => days.includes(d));
          if (commonDays.length > 0) {
            for (const p of sch.periods) {
              const pTeacherId = p.teacher?._id || p.teacher;
              if (pTeacherId && pTeacherId.toString() === teacherId.toString()) {
                const pStart = timeToMinutes(p.startTime);
                const pEnd = timeToMinutes(p.endTime);
                if (Math.max(start, pStart) < Math.min(end, pEnd)) {
                  return { class: `${sec.className} - ${sec.name}`, period: p.title || p.subject };
                }
              }
            }
          }
        }
      }
    }
    return null;
  };

  useEffect(() => {
    if (showScheduleModal) {
       fetchAllSections();
    }
  }, [showScheduleModal]);

  const fetchSectionStudents = async (sectionId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes/section/${sectionId}/students`);
      setStudents(res.data);
    } catch (err) {
      toast.error('Failed to fetch students');
    }
  };

  const openScheduleModal = (sch, idx) => {
    setEditingScheduleIdx(idx);
    const preparedPeriods = (sch?.periods || []).map((p, i) => ({
        ...p,
        title: p.title || `Period ${i + 1}`
    }));
    setTempSchedule({ ...sch, periods: preparedPeriods });
    setShowScheduleModal(true);
  };

  const handleSectionClick = (section) => {
    setSelectedSection(section);
    fetchSectionStudents(section._id);
    setActiveTab('students');
  };

  const updateClass = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/api/classes/${cls._id}`, editedClass || cls, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Class updated');
      setShowClassSettings(false);
      fetchClassDetails();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const deleteClass = async () => {
    if (deleteConfirmation !== cls.name) {
      return toast.error("Class name doesn't match. Deletion aborted.");
    }
    
    try {
      await axios.delete(`${API_BASE_URL}/api/classes/${cls._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Class and all related records deleted successfully');
      navigate('/classes');
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const deleteSection = async () => {
    if (sectionDeleteConfirmation !== editingSection.name) {
      return toast.error("Section name doesn't match. Deletion aborted.");
    }
    
    try {
      await axios.delete(`${API_BASE_URL}/api/classes/section/${editingSection._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Section and related students deleted successfully');
      setShowSectionDeleteModal(false);
      setEditingSection(null);
      fetchClassDetails();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const updateSection = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/api/classes/section/${editingSection._id}`, editingSection, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Section updated');
      setEditingSection(null);
      fetchClassDetails();
    } catch (err) {
      const errorMsg = err.response?.data?.msg || err.response?.data?.message || 'Update failed';
      toast.error(errorMsg);
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/classes/section`, { ...newSection, classId: cls._id }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Section added');
      setShowAddSection(false);
      setNewSection({ name: '', periods: [] });
      fetchClassDetails();
    } catch (err) {
      toast.error('Failed to add section');
    }
  };

  const handleDirectMark = async (studentId, status) => {
    try {
      await axios.post(`${API_BASE_URL}/api/attendance/single`, {
        id: studentId,
        type: 'student',
        status,
        date: attFilters.date
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(`Marked as ${status}`);
      fetchGlobalAttendance();
    } catch (err) {
      toast.error('Failed to mark attendance');
    }
  };

  const saveSchedule = async (e) => {
    e.preventDefault();
    if (!tempSchedule.name || tempSchedule.days.length === 0) {
      return toast.error("Please provide a name and select at least one day");
    }

    // Filter out invalid periods (must have subject and teacher)
    const validPeriods = tempSchedule.periods.filter(p => p.subject && (p.teacher?._id || p.teacher));
    if (validPeriods.length === 0) {
      return toast.error("Please add at least one complete period with subject and teacher");
    }

    // Time validation
    for (const p of validPeriods) {
       if (timeToMinutes(p.startTime) >= timeToMinutes(p.endTime)) {
          return toast.error(`Inconsistent timing for ${p.title || p.subject}: Start time must be before end time.`);
       }
    }

    const cleanSchedule = { ...tempSchedule, periods: validPeriods };

    try {
      const sectionId = selectedSection._id;
      let newSchedules = [...(selectedSection.schedules || [])];

      if (editingScheduleIdx === -1) {
        newSchedules.push(cleanSchedule);
      } else {
        newSchedules[editingScheduleIdx] = cleanSchedule;
      }

      const res = await axios.put(`${API_BASE_URL}/api/classes/section/${sectionId}`, {
        ...selectedSection,
        schedules: newSchedules
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success('Schedule updated successfully');
      setShowScheduleModal(false);
      fetchClassDetails();
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Failed to save schedule';
      toast.error(errorMsg, { duration: 5000 });
    }
  };

  useEffect(() => {
    if (cls && selectedSection) {
        const updatedSec = cls.sections?.find(s => s._id === selectedSection._id);
        if (updatedSec) setSelectedSection(updatedSec);
    }
  }, [cls]);

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (selectedSection) {
                setSelectedSection(null);
                setActiveTab('sections');
              } else {
                navigate('/classes');
              }
            }}
            className="w-10 h-10 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              {selectedSection ? `Section ${selectedSection.name}` : cls.name}
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em]">
              {selectedSection ? `${selectedSection.studentCount} Active Students` : `${cls.sections?.length} Sections • ${cls.sections?.reduce((acc, s) => acc + (s.studentCount || 0), 0)} Total Students`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <button 
                onClick={() => navigate('/students', { state: { classId: id, sectionId: selectedSection?._id, openForm: true } })}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
           >
                <Plus size={14} /> Student
           </button>
           {!selectedSection && (
             <button 
              onClick={() => setShowAddSection(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2"
             >
                <Plus size={14} /> Section
             </button>
           )}
           <button 
            onClick={() => selectedSection ? setEditingSection(selectedSection) : setShowClassSettings(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all flex items-center gap-2"
           >
              Settings
           </button>
        </div>
      </header>

      <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 w-fit">
        {['sections', 'attendance', 'periods', 'performance'].map((tab) => {
          if (tab === 'periods' && !selectedSection) return null;
          const label = tab === 'sections' && selectedSection ? 'students' : tab;
          const isActive = (tab === 'sections' && (activeTab === 'sections' || activeTab === 'students')) || activeTab === tab;
          
          return (
            <button 
              key={tab}
              onClick={() => { 
                if (tab === 'sections' && selectedSection) {
                  setActiveTab('students');
                } else {
                  setActiveTab(tab);
                  if (tab === 'sections') setSelectedSection(null);
                }
              }}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all capitalize ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'sections' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {cls.sections?.map(sec => (
                 <div 
                   key={sec._id} 
                   onClick={() => handleSectionClick(sec)}
                   className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] hover:border-blue-500/50 transition-all group cursor-pointer shadow-xl dark:shadow-2xl dark:hover:bg-slate-800/50 relative overflow-hidden"
                 >
                    <div className="flex justify-between items-start mb-6">
                       <div>
                          <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter group-hover:text-blue-500 transition-colors leading-none">Section {sec.name}</h3>
                       </div>
                       <div className="flex flex-col items-end gap-1.5">
                          <div className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                             <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{sec.todayPresence || 0}%</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex justify-end gap-2 mb-4">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/students', { state: { classId: id, sectionId: sec._id, openForm: true } });
                            }}
                            className="p-2 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110 active:scale-90 border border-blue-200 dark:border-blue-500/20"
                            title="Register student to this section"
                        >
                            <Plus size={14} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="space-y-4">
                       <div className="relative z-20">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] block mb-0.5">Class Teacher</span>
                          <button 
                            onClick={(e) => {
                               e.stopPropagation();
                               if(sec.classTeacher?._id) navigate(`/teachers`);
                            }}
                            className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-tight text-left leading-tight"
                          >
                             {sec.classTeacher?.fullName || 'Not Assigned'}
                          </button>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-4 rounded-[1.5rem] text-center shadow-inner">
                             <span className="block text-xl font-black text-slate-900 dark:text-white">{sec.studentCount || 0}</span>
                             <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Students</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-4 rounded-[1.5rem] text-center shadow-inner">
                             <span className="block text-xl font-black text-blue-600 dark:text-blue-500">{sec.totalPeriodsToday || 0}</span>
                             <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Periods Today</span>
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'students' && selectedSection && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search students..."
                      className="bg-slate-900 border border-slate-800 text-white pl-9 pr-4 py-2.5 rounded-2xl text-sm outline-none w-64 focus:ring-2 focus:ring-blue-500/50 transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => navigate('/students', { state: { classId: cls._id, sectionId: selectedSection._id, openForm: true } })}
                    className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-white px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-slate-800"
                  >
                    <Plus size={14} /> Register Student
                  </button>
                  <button 
                    onClick={() => navigate('/attendance', { state: { classId: cls._id, sectionId: selectedSection._id, date: getTodayStr() }})}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
                  >
                    mark attendance
                  </button>
                </div>
             </div>

             <div className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Student Profile</th>
                      <th className="px-8 py-5">Guardian Info</th>
                      <th className="px-8 py-5">Today's Status</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right flex justify-end"><MoreVertical size={14} /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => {
                      const todayAtt = allAttendance.find(a => a.student._id === student._id);
                      return (
                        <tr key={student._id} onClick={() => navigate(`/students/${student._id}`, { state: { from: `/classes/${id}` } })} className="hover:bg-slate-800/30 cursor-pointer transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                               <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${student.gender?.toLowerCase() === 'female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-600/10 text-blue-500'}`}>
                                  {student.gender?.toLowerCase() === 'female' ? <User2 size={24} /> : <User size={24} />}
                               </div>
                               <div>
                                  <div className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors uppercase tracking-tight">{student.name}</div>
                                  <div className="text-[10px] font-black text-slate-500 tracking-tighter uppercase">{student.regNo || student.rollNumber}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                             <div className="flex flex-col min-w-0">
                                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate leading-tight">{student.fatherName || 'N/A'}</div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 leading-none uppercase">{student.phone || student.parentContact || 'No Contact'}</div>
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             {todayAtt ? (
                               <span className={`text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                                 todayAtt.status === 'Present' ? 'text-emerald-500' : 
                                 todayAtt.status === 'Absent' ? 'text-rose-500' : 
                                 todayAtt.status === 'Leave' ? 'text-amber-500' : 
                                 todayAtt.status === 'Half Leave' ? 'text-orange-500' :
                                 'text-blue-500'
                               }`}>{todayAtt.status}</span>
                             ) : (
                               <span className="text-slate-500 dark:text-slate-600 text-[10px] uppercase font-bold tracking-widest">Pending</span>
                             )}
                          </td>
                          <td className="px-8 py-4">
                            <span className={`text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                              student.status === 'Active' ? 'text-emerald-500' :
                              student.status === 'Expelled' ? 'text-rose-500' :
                              'text-slate-500'
                            }`}>
                              {student.status}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right"><ChevronRight size={18} className="text-slate-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all inline"/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
             {/* Stats Summary Cards for Class/Section */}
             <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-2">
                {[
                  { label: 'Total Strength', value: allAttendance.filter(item => !selectedSection || (item.student?.section?._id || item.student?.section) === selectedSection._id).length, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/40', icon: Users },
                  { label: 'Present Today', value: allAttendance.filter(item => (!selectedSection || (item.student?.section?._id || item.student?.section) === selectedSection._id) && item.status === 'Present').length, color: 'text-emerald-600 dark:text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle },
                  { label: 'Absent Today', value: allAttendance.filter(item => (!selectedSection || (item.student?.section?._id || item.student?.section) === selectedSection._id) && item.status === 'Absent').length, color: 'text-rose-600 dark:text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: XCircle },
                  { label: 'Leave / Half', value: allAttendance.filter(item => (!selectedSection || (item.student?.section?._id || item.student?.section) === selectedSection._id) && (item.status === 'Leave' || item.status === 'Half Leave')).length, color: 'text-amber-600 dark:text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: FileClock },
                  { label: 'Late Arrival', value: allAttendance.filter(item => (!selectedSection || (item.student?.section?._id || item.student?.section) === selectedSection._id) && item.status === 'Late').length, color: 'text-blue-600 dark:text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', icon: Timer },
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

             <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900 p-5 rounded-[2rem] border border-slate-800 items-end shadow-xl">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">search student</label>
                   <div className="relative">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        placeholder="Name or Reg..."
                        className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        value={attFilters.search}
                        onChange={e => setAttFilters({...attFilters, search: e.target.value})}
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">status filter</label>
                   <select 
                    className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    value={attFilters.status}
                    onChange={e => setAttFilters({...attFilters, status: e.target.value})}
                   >
                      {['All', 'Present', 'Absent', 'Leave', 'Half Leave', 'Late', 'N/A'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">date</label>
                   <input 
                    type="date" 
                    max={getTodayStr()}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={attFilters.date}
                    onChange={e => setAttFilters({...attFilters, date: e.target.value})}
                   />
                </div>
             </div>

             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="bg-slate-50 dark:bg-slate-950/50">
                    <tr>
                      <th className="px-8 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Student</th>
                      <th className="px-8 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Guardian Info</th>
                      <th className="px-8 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Class & Section</th>
                      <th className="px-8 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Actions</th>
                      <th className="px-8 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right">Marked By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {allAttendance
                      .filter(item => {
                        // Filter by section if one is selected
                        if (selectedSection && (item.student?.section?._id || item.student?.section) !== selectedSection._id) {
                           return false;
                        }
                        
                        const query = attFilters.search.toLowerCase();
                        const sMatch = item.student.name.toLowerCase().includes(query) || (item.student.rollNumber || item.student.regNo || '').toLowerCase().includes(query);
                        const statusMatch = attFilters.status === 'All' || (attFilters.status === 'N/A' ? !item.status : item.status === attFilters.status);
                        return sMatch && statusMatch;
                      })
                      .map(item => (
                        <tr key={item.student._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all group">
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all ${item.student.gender?.toLowerCase() === 'female' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-500' : 'bg-blue-600/10 text-blue-600 dark:text-blue-500'}`}>
                                   {item.student.gender?.toLowerCase() === 'female' ? <User2 size={18} /> : <User size={18} />}
                                </div>
                                <div className="min-w-0">
                                   <div className="text-[13px] font-bold text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors leading-none truncate">{item.student.name}</div>
                                   <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate mt-1">{item.student.regNo || item.student.rollNumber}</div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex flex-col min-w-0">
                                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate leading-tight">{item.student.fatherName || 'N/A'}</div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 leading-none uppercase">{item.student.phone || item.student.parentContact || 'No Contact'}</div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400 truncate tracking-tight uppercase leading-tight">{item.student.class?.name || cls.name}</div>
                             <div className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase truncate mt-0.5">Sec {item.student.section?.name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             {item.status ? (
                               <span className={`text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                                 item.status === 'Present' ? 'text-emerald-500' : 
                                 item.status === 'Absent' ? 'text-rose-500' : 
                                 item.status === 'Leave' ? 'text-amber-500' : 
                                 item.status === 'Half Leave' ? 'text-orange-500' :
                                 'text-blue-500'
                               }`}>{item.status}</span>
                             ) : <span className="text-slate-500 dark:text-slate-600 text-[10px] uppercase font-bold tracking-widest leading-none">Pending</span>}
                          </td>
                          <td className="px-8 py-5">
                             <div className="flex justify-center gap-1.5 md:gap-2">
                                {[
                                  { s: 'Present', c: 'bg-emerald-600', i: CheckCircle },
                                  { s: 'Absent', c: 'bg-rose-600', i: XCircle },
                                  { s: 'Leave', c: 'bg-amber-600', i: FileClock },
                                  { s: 'Half Leave', c: 'bg-orange-600', i: Clock },
                                  { s: 'Late', c: 'bg-blue-600', i: Timer },
                                ].map(btn => (
                                  <button 
                                    key={btn.s}
                                    onClick={() => handleDirectMark(item.student._id, btn.s)}
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                      item.status === btn.s 
                                      ? `${btn.c} text-white shadow-lg` 
                                      : 'bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-800'
                                    }`}
                                    title={btn.s}
                                  >
                                    <btn.i size={14} strokeWidth={3}/>
                                  </button>
                                ))}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-none mb-1 text-[8px]">Entered By</span>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                   {typeof item.markedBy === 'object' ? item.markedBy?.name : (item.markedBy || 'System Admin')}
                                </span>
                             </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'periods' && selectedSection && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 gap-10">
                {globalSessions.map((gs, gsIdx) => {
                   const sectionSchedule = (selectedSection.schedules || []).find(s => s.name === gs.name);
                   const sIdx = (selectedSection.schedules || []).findIndex(s => s.name === gs.name);
                   
                   return (
                      <div key={gs._id} className="bg-slate-900 border border-slate-800 rounded-[3.5rem] overflow-hidden shadow-2xl relative">
                         <div className="p-8 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                            <div className="flex items-center gap-6">
                               <div className="w-16 h-16 bg-blue-600/10 rounded-[2rem] flex items-center justify-center text-blue-500 border border-blue-600/20 shadow-inner">
                                  <Calendar size={32} />
                               </div>
                               <div>
                                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">{gs.name}</h3>
                                  <div className="flex gap-1.5 mt-2">
                                     {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                       <span key={d} className={`text-[9px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-widest border transition-all ${gs.days?.includes(d) ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                                          {d.slice(0, 3)}
                                       </span>
                                     ))}
                                  </div>
                               </div>
                            </div>
                            <button 
                               onClick={() => openScheduleModal(sectionSchedule || { name: gs.name, days: gs.days, periods: [] }, sIdx)}
                               className="bg-slate-800 hover:bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all border border-slate-700 flex items-center gap-2 group"
                            >
                               <Edit2 size={16} className="group-hover:rotate-12 transition-transform" /> {sectionSchedule ? 'Edit Timetable' : 'Add Timetable'}
                            </button>
                         </div>
                         <div className="p-0">
                            <table className="w-full text-left">
                               <thead className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                  <tr>
                                     <th className="px-10 py-5">Period Label</th>
                                     <th className="px-10 py-5">Subject</th>
                                     <th className="px-10 py-5">Assigned Teacher</th>
                                     <th className="px-10 py-5 text-right">Timings</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-800/20">
                                  {sectionSchedule?.periods?.map((p, pIdx) => (
                                     <tr key={pIdx} className="hover:bg-slate-800/10 transition-colors">
                                        <td className="px-10 py-5">
                                           <div className="inline-flex h-9 items-center justify-center px-5 rounded-xl bg-blue-600/10 border border-blue-600/20 text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                              {p.title || `Period ${pIdx + 1}`}
                                           </div>
                                        </td>
                                        <td className="px-10 py-5">
                                           <span className="font-bold text-white uppercase tracking-tight text-sm">{p.subject}</span>
                                        </td>
                                        <td className="px-10 py-5">
                                           <div className="flex items-center gap-4">
                                              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700">
                                                 <User2 size={16} />
                                              </div>
                                              <span className="text-sm font-bold text-slate-400">{teachers.find(t => (t._id === p.teacher?._id || t._id === p.teacher))?.fullName || 'No Teacher'}</span>
                                           </div>
                                        </td>
                                        <td className="px-10 py-5 text-right">
                                           <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] font-black text-white uppercase tracking-widest shadow-inner">
                                              <Clock size={14} className="text-blue-500" /> {p.startTime} - {p.endTime}
                                           </div>
                                        </td>
                                     </tr>
                                  ))}
                               </tbody>
                            </table>
                            {(!sectionSchedule || !sectionSchedule.periods || sectionSchedule.periods.length === 0) && (
                               <div className="text-center py-20 flex flex-col items-center gap-6">
                                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-700 border border-slate-800/50"><Clock size={40}/></div>
                                  <div className="space-y-1">
                                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 block">no periods defined yet</span>
                                     <span className="text-[9px] font-bold text-slate-700 uppercase">Click "Add Timetable" above to start</span>
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                   );
                })}
                {globalSessions.length === 0 && (
                  <div className="py-24 bg-slate-900/50 border-4 border-dashed border-slate-800 rounded-[4rem] flex flex-col items-center justify-center gap-6 grayscale opacity-50">
                     <Calendar size={80} className="text-slate-800" />
                     <div className="text-center">
                        <h3 className="text-2xl font-black text-slate-600 uppercase tracking-tighter">no sessions configured</h3>
                        <p className="text-slate-700 text-sm font-bold uppercase tracking-widest mt-2">Create a global session first from school settings</p>
                     </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-10">
             <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-6 rounded-[2rem] border border-slate-800 w-full shadow-xl">
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">From</label>
                      <input 
                        type="month" 
                        className="bg-slate-950 border border-slate-800 text-white px-4 py-2.5 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/50"
                        value={perfRange.start}
                        onChange={e => setPerfRange({...perfRange, start: e.target.value})}
                      />
                   </div>
                   <div className="w-px h-8 bg-slate-800 hidden lg:block"></div>
                   <div className="flex items-center gap-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">To</label>
                      <input 
                        type="month" 
                        className="bg-slate-950 border border-slate-800 text-white px-4 py-2.5 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/50"
                        value={perfRange.end}
                        onChange={e => setPerfRange({...perfRange, end: e.target.value})}
                      />
                   </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-800/50">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Analysis</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-16 h-16 bg-blue-600/10 rounded-[2rem] flex items-center justify-center text-blue-500 border border-blue-600/20 shadow-inner group-hover:scale-110 transition-transform">
                         <TrendingUp size={32} />
                      </div>
                   </div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Average Presence</span>
                   <div className="text-4xl font-black text-white tracking-tighter">
                      {perfStats.avgPresence}%
                   </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
                         <Award size={32} />
                      </div>
                   </div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Top Performers</span>
                   <div className="text-4xl font-black text-white tracking-tighter">
                      {(perfStats.topStudents || []).filter(s => s.percentage > 90).length} <span className="text-sm text-slate-500 uppercase tracking-widest">Students</span>
                   </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-16 h-16 bg-purple-600/10 rounded-[2rem] flex items-center justify-center text-purple-500 border border-purple-600/20 shadow-inner group-hover:scale-110 transition-transform">
                         <Users size={32} />
                      </div>
                   </div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Total Enrollment</span>
                   <div className="text-4xl font-black text-white tracking-tighter">
                      {cls?.activeStudents || 0}
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {!selectedSection && (
                   <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 px-4">Section Performance Map</h3>
                      <div className="h-[250px]">
                         <Bar 
                           key={`sec-map-${perfStats.sectionPerformance.length}-${perfRange.start}-${perfRange.end}`}
                           data={{
                             labels: (perfStats.sectionPerformance || []).map(s => `Section ${s.name}`),
                             datasets: [{
                               label: 'Average Performance',
                               data: (perfStats.sectionPerformance || []).map(s => s.percentage.toFixed(1)),
                               backgroundColor: 'rgba(59, 130, 246, 0.5)',
                               borderColor: '#3b82f6',
                               borderWidth: 2,
                               borderRadius: 12
                             }]
                           }}
                           options={{
                             responsive: true,
                             maintainAspectRatio: false,
                             plugins: { legend: { display: false } },
                             scales: {
                               y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
                               x: { grid: { display: false }, border: { display: false }, ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } } }
                             }
                           }}
                         />
                      </div>
                   </div>
                )}
                
                <div className={`bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl ${selectedSection ? 'lg:col-span-2' : ''}`}>
                   <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 px-4">Attendance Growth Trend</h3>
                   <div className="h-[250px]">
                      <Line 
                        key={`growth-chart-${perfStats.growth.length}-${perfRange.start}-${perfRange.end}-${selectedSection?._id || 'all'}`}
                        data={{
                          labels: (perfStats.growth || []).length > 0 ? (perfStats.growth || []).map(d => d.month) : ['No Data'],
                          datasets: [{
                            label: 'Attendance %',
                            data: (perfStats.growth || []).map(d => d.percentage),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#3b82f6'
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: {
                            y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
                            x: { grid: { display: false }, border: { display: false }, ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } } }
                          }
                        }}
                      />
                   </div>
                </div>
             </div>

             <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                   <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tighter">
                      <Award className="text-yellow-500" /> Top Achievers Leaderboard
                   </h3>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                            <th className="px-10 py-5">Rank</th>
                            <th className="px-10 py-5">Student / Parent Profile</th>
                            <th className="px-10 py-5">Class & Identity</th>
                            <th className="px-10 py-5 text-right">Attendance Rate</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                         {(perfStats.topStudents || []).map((st, index) => (
                           <tr key={st.studentId} className="hover:bg-slate-800/10 transition-colors group">
                              <td className="px-10 py-6">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-lg ${
                                   index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-950' : 
                                   index === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950' : 
                                   index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' : 
                                   'bg-slate-800 text-slate-500'
                                 }`}>
                                    #{index + 1}
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-inner ${st.gender?.toLowerCase() === 'female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-600/10 text-blue-500'}`}>
                                       {st.gender?.toLowerCase() === 'female' ? <User2 size={24} /> : <User size={24} />}
                                    </div>
                                    <div>
                                       <button 
                                         onClick={() => navigate(`/students/${st.studentId}`)}
                                         className="font-bold text-white hover:text-blue-400 transition-colors uppercase tracking-tight block text-left"
                                       >
                                          {st.name}
                                       </button>
                                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">S/O: {st.fatherName || '...'}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="text-sm font-bold text-slate-400">{cls?.name}</div>
                                 <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section: {st.sectionName}</div>
                              </td>
                              <td className="px-10 py-6 text-right">
                                 <div className="flex items-center justify-end gap-4">
                                    <div className="w-32 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                                       <div className={`h-full ${index < 3 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-blue-500'}`} style={{ width: `${st.percentage}%` }}></div>
                                    </div>
                                    <span className={`text-sm font-black ${index < 3 ? 'text-white' : 'text-slate-400'}`}>{st.percentage.toFixed(1)}%</span>
                                 </div>
                              </td>
                           </tr>
                         ))}
                         {(perfStats.topStudents || []).length === 0 && (
                            <tr>
                               <td colSpan="4" className="py-20 text-center">
                                  <div className="flex flex-col items-center gap-4 opacity-50">
                                     <Award size={48} className="text-slate-800" />
                                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No students found</span>
                                  </div>
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
           <div className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-800 shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white">Add New Section</h2>
                 <button onClick={() => setShowAddSection(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddSection} className="p-6 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Section Name</label>
                       <input 
                         required
                         className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" 
                         placeholder="e.g. A, Blue"
                         value={newSection.name}
                         onChange={e => setNewSection({...newSection, name: e.target.value})}
                       />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm shadow-lg">Create Section</button>
              </form>
           </div>
        </div>
      )}

      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
           <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Edit Section Settings</h2>
                 <button onClick={() => setEditingSection(null)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={20}/>
                 </button>
              </div>
              <form onSubmit={updateSection} className="p-6 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Section Identity</label>
                       <input 
                        className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none font-bold focus:border-blue-500/50 transition-all" 
                        value={editingSection.name}
                        onChange={e => setEditingSection({...editingSection, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Class Teacher</label>
                       <select 
                        className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none font-bold focus:border-blue-500/50 transition-all" 
                        value={editingSection.classTeacher?._id || editingSection.classTeacher || ''}
                        onChange={e => setEditingSection({...editingSection, classTeacher: e.target.value})}
                       >
                          <option value="">Select Teacher (N/A)</option>
                          {teachers.map(t => <option key={t._id} value={t._id}>{t.fullName}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="flex flex-col gap-3 pt-2">
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm shadow-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                       <Save size={16} /> Update Section Details
                    </button>
                    <button 
                       type="button" 
                       onClick={() => setShowSectionDeleteModal(true)}
                       className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white py-4 rounded-xl font-bold text-sm border border-red-600/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                       <Trash2 size={16} /> Delete Section
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 w-full max-w-6xl rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                 <div>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                          <Calendar size={20}/>
                       </div>
                       <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                          {editingScheduleIdx === -1 ? 'Configure New Session' : `Manage ${tempSchedule.name}`}
                       </h2>
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Set days and define period timetable below</p>
                 </div>
                 <button onClick={() => setShowScheduleModal(false)} className="w-12 h-12 bg-slate-800 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-slate-700 hover:border-blue-500/50">
                    <X size={24}/>
                 </button>
              </div>

              <div className="p-8 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
                 {/* Top Config: Name and Days */}
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-4 space-y-4">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Session Identity</label>
                       <div className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white font-bold text-lg shadow-inner opacity-70">
                          {tempSchedule.name || 'Global Session'}
                       </div>
                       <p className="text-[10px] text-slate-600 font-bold uppercase px-2 italic text-emerald-500">✓ Linked with Global School Sessions</p>
                    </div>
                    <div className="lg:col-span-8 space-y-4">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Working Days (Global Setting)</label>
                       <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                             <div key={day} className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border transition-all ${
                                tempSchedule.days?.includes(day) ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-slate-950/50 border-slate-800/50 text-slate-700'
                             }`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${tempSchedule.days?.includes(day) ? 'text-blue-400' : 'text-slate-700'}`}>{day.slice(0, 3)}</span>
                                <div className={`w-2 h-2 rounded-full ${tempSchedule.days?.includes(day) ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`}></div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* Period Table Editor */}
                 <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                       <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                             <Clock size={16} className="text-blue-500" /> period list editor
                          </h3>
                       </div>
                       <button 
                         onClick={() => {
                            const lastPeriod = tempSchedule.periods[tempSchedule.periods.length - 1];
                            const nextPeriodNum = tempSchedule.periods.length + 1;
                            
                            // Calculate default times
                            let startTime = '08:00';
                            let endTime = '08:45';
                            
                            if (lastPeriod && lastPeriod.endTime) {
                               startTime = lastPeriod.endTime;
                               // Add 45 minutes to end time as default
                               const [h, m] = startTime.split(':').map(Number);
                               const date = new Date();
                               date.setHours(h, m + 45);
                               endTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                            }
                            
                            const newPeriod = { 
                               title: `Period ${nextPeriodNum}`, 
                               subject: '', 
                               teacher: '', 
                               startTime: startTime, 
                               endTime: endTime 
                            };
                            setTempSchedule({...tempSchedule, periods: [...tempSchedule.periods, newPeriod]});
                         }}
                         className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 border border-emerald-500/50"
                       >
                          <Plus size={18} /> Add New Period Row
                       </button>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
                       <table className="w-full text-left">
                          <thead className="bg-slate-900/50 border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                             <tr>
                                <th className="px-6 py-5 w-16">#</th>
                                <th className="px-6 py-5">Period Label</th>
                                <th className="px-6 py-5 outline-none">Academic Subject</th>
                                <th className="px-6 py-5">Assigned Teacher</th>
                                <th className="px-6 py-5">Start Time</th>
                                <th className="px-6 py-5">End Time</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/30">
                             {tempSchedule.periods.map((p, idx) => (
                                <tr key={idx} className="group hover:bg-slate-900/40 transition-colors">
                                   <td className="px-6 py-4">
                                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-blue-500">
                                         {idx + 1}
                                      </div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <input 
                                         className="w-full bg-slate-900/50 border border-slate-800/50 p-3 rounded-xl text-white outline-none focus:border-blue-500 font-bold text-xs uppercase tracking-tight"
                                         value={p.title || ''}
                                         onChange={e => {
                                            const np = [...tempSchedule.periods];
                                            np[idx].title = e.target.value;
                                            setTempSchedule({...tempSchedule, periods: np});
                                         }}
                                         placeholder="e.g. Period 1"
                                      />
                                   </td>
                                   <td className="px-6 py-4">
                                      <input 
                                         className="w-full bg-slate-900/50 border border-slate-800/50 p-3 rounded-xl text-white outline-none focus:border-blue-500 font-bold text-xs uppercase tracking-tight"
                                         value={p.subject}
                                         onChange={e => {
                                            const np = [...tempSchedule.periods];
                                            np[idx].subject = e.target.value;
                                            setTempSchedule({...tempSchedule, periods: np});
                                         }}
                                         placeholder="e.g. Maths"
                                      />
                                   </td>
                                   <td className="px-6 py-4">
                                      <select 
                                         className="w-full bg-slate-900/50 border border-slate-800/50 p-3 rounded-xl text-white outline-none focus:border-blue-500 font-bold text-xs"
                                         value={p.teacher?._id || p.teacher || ''}
                                         onChange={e => {
                                            const np = [...tempSchedule.periods];
                                            np[idx].teacher = e.target.value;
                                            setTempSchedule({...tempSchedule, periods: np});
                                         }}
                                      >
                                         <option value="">Select Teacher</option>
                                         {teachers.map(t => {
                                            const conflict = checkTeacherConflict(t._id, p.startTime, p.endTime, tempSchedule.days || [], idx);
                                            return (
                                               <option 
                                                 key={t._id} 
                                                 value={t._id} 
                                                 className={conflict ? 'text-slate-500 bg-slate-900 line-through' : 'text-white bg-slate-900 font-bold'}
                                               >
                                                  {t.fullName} {conflict ? `(Busy in ${conflict.class})` : ''}
                                               </option>
                                            );
                                         })}
                                      </select>
                                   </td>
                                   <td className="px-6 py-4">
                                      <input 
                                         type="time"
                                         className="w-full bg-slate-900/50 border border-slate-800/50 p-3 rounded-xl text-white outline-none focus:border-blue-500 font-bold text-xs"
                                         value={p.startTime}
                                         onChange={e => {
                                            const np = [...tempSchedule.periods];
                                            np[idx].startTime = e.target.value;
                                            // Ensure end time is not before start time
                                            if (np[idx].endTime <= e.target.value) {
                                               const [h, m] = e.target.value.split(':').map(Number);
                                               const date = new Date();
                                               date.setHours(h, m + 45);
                                               np[idx].endTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                                            }
                                            setTempSchedule({...tempSchedule, periods: np});
                                         }}
                                      />
                                   </td>
                                   <td className="px-6 py-4">
                                      <input 
                                         type="time"
                                         min={p.startTime}
                                         className="w-full bg-slate-900/50 border border-slate-800/50 p-3 rounded-xl text-white outline-none focus:border-blue-500 font-bold text-xs"
                                         value={p.endTime}
                                         onChange={e => {
                                            if (e.target.value <= p.startTime) {
                                               toast.warn("End time cannot be before or same as start time");
                                               return;
                                            }
                                            const np = [...tempSchedule.periods];
                                            np[idx].endTime = e.target.value;
                                            setTempSchedule({...tempSchedule, periods: np});
                                         }}
                                      />
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      <button 
                                         onClick={() => {
                                            const np = tempSchedule.periods.filter((_, i) => i !== idx);
                                            setTempSchedule({...tempSchedule, periods: np});
                                         }}
                                         className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                                      >
                                         <X size={16}/>
                                      </button>
                                   </td>
                                </tr>
                             ))}
                             {tempSchedule.periods.length === 0 && (
                                <tr>
                                   <td colSpan="6" className="py-20 text-center">
                                      <div className="flex flex-col items-center gap-4">
                                         <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 border border-slate-800">
                                            <AlertCircle size={32} />
                                         </div>
                                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No periods added yet. Click "Add New Period Row" above.</span>
                                      </div>
                                   </td>
                                </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>

              <div className="p-8 border-t border-slate-800 bg-slate-950/80 flex justify-end items-center backdrop-blur-xl">
                 <div className="flex gap-4">
                    <button onClick={() => setShowScheduleModal(false)} className="px-10 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700">Discard Changes</button>
                    <button 
                       onClick={saveSchedule}
                       className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/40 border border-blue-400/50 flex items-center gap-3"
                    >
                       <Save size={18} /> Update Timetable & Save
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showClassSettings && cls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
           <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white">Class Settings</h2>
                 <button onClick={() => setShowClassSettings(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>
              <form onSubmit={updateClass} className="p-6 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 uppercase">Class Name</label>
                       <input className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" value={editedClass?.name || cls.name} onChange={e => setEditedClass({...cls, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       {[ 'admissionFee', 'monthlyTuition'].map(f => (
                         <div key={f} className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                               {f === 'monthlyTuition' ? 'Monthly Fee' : f.replace(/([A-Z])/g, ' $1')}
                            </label>
                            <input type="number" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" value={editedClass?.fees?.[f] || cls.fees?.[f] || 0} onChange={e => setEditedClass({...cls, fees: {...(editedClass?.fees || cls.fees), [f]: parseInt(e.target.value) || 0}})} />
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="flex flex-col gap-3">
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm shadow-lg uppercase tracking-widest">
                       update class details
                    </button>
                    <button 
                       type="button" 
                       onClick={() => {
                         setShowClassSettings(false);
                         setShowDeleteModal(true);
                       }}
                       className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white py-4 rounded-xl font-bold text-sm border border-red-600/20 transition-all uppercase tracking-widest"
                    >
                       delete entire class
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border-2 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden">
              <div className="p-8 bg-red-500/10 border-b border-red-500/20 text-center space-y-4">
                 <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto border-2 border-red-500/20">
                    <Trash2 size={32} />
                 </div>
                 <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Critical Class Deletion</h2>
                 <div className="bg-slate-950/80 p-4 rounded-2xl border border-red-500/30">
                    <p className="text-red-400 text-xs font-bold leading-relaxed">
                       WARNING: This action is irreversible. Deleting <span className="text-white font-black underline">{cls.name}</span> will permanently erase:
                    </p>
                    <ul className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 space-y-1 text-left list-disc list-inside">
                       <li>All Sections & Schedules</li>
                       <li>ALL enrolled students & their profiles</li>
                       <li>All Academic Records & Progress</li>
                    </ul>
                 </div>
              </div>
              
              <div className="p-8 space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type <span className="text-white">"{cls.name}"</span> to confirm</label>
                    <input 
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500/50 font-bold text-center"
                      placeholder="Enter class name here"
                      value={deleteConfirmation}
                      onChange={e => setDeleteConfirmation(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex gap-4">
                    <button 
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                      disabled={deleteConfirmation !== cls.name}
                      onClick={deleteClass}
                      className={`flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                         deleteConfirmation === cls.name 
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/40' 
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                       Confirm Delete
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showSectionDeleteModal && editingSection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border-2 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden">
              <div className="p-8 bg-red-500/10 border-b border-red-500/20 text-center space-y-4">
                 <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto border-2 border-red-500/20">
                    <Trash2 size={32} />
                 </div>
                 <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Confirm Section Delete</h2>
                 <div className="bg-slate-950/80 p-4 rounded-2xl border border-red-500/30">
                    <p className="text-red-400 text-xs font-bold leading-relaxed">
                       You are about to delete section <span className="text-white font-black underline">{editingSection.name}</span>. This will permanently erase:
                    </p>
                    <ul className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 space-y-1 text-left list-disc list-inside">
                       <li>All Enrolled Students in this section</li>
                       <li>Section Timetable & Schedules</li>
                       <li>Attendance records for these students</li>
                    </ul>
                 </div>
              </div>
              
              <div className="p-8 space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type <span className="text-white">"{editingSection.name}"</span> to confirm</label>
                    <input 
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500/50 font-bold text-center"
                      placeholder="Enter section name here"
                      value={sectionDeleteConfirmation}
                      onChange={e => setSectionDeleteConfirmation(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        setShowSectionDeleteModal(false);
                        setSectionDeleteConfirmation('');
                      }}
                      className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                      disabled={sectionDeleteConfirmation !== editingSection.name}
                      onClick={deleteSection}
                      className={`flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        sectionDeleteConfirmation === editingSection.name 
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/40' 
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                       Delete Section
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetail;
