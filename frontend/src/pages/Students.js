import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  Plus, 
  Search, 
  Filter, 
  UserPlus, 
  Users,
  User,
  User2, 
  MoreVertical, 
  Calendar, 
  Phone, 
  CreditCard,
  ChevronLeft,
  X,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  GraduationCap
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Students = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(location.state?.openForm ? 'add' : (location.state?.classId ? 'add' : (user?.role === 'teacher' ? 'classes' : 'list'))); // Toggle view if coming from details
  const [selectedSection, setSelectedSection] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    classId: location.state?.classId || '',
    sectionId: location.state?.sectionId || '',
    status: '', // Set to empty to show all students by default
    search: ''
  });

  const [newStudent, setNewStudent] = useState({
    regNo: '',
    admissionDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local
    name: '',
    fatherName: '',
    dob: '',
    gender: '',
    phone: '',
    bForm: '',
    fatherCnic: '',
    cast: '',
    religion: '',
    address: '',
    class: location.state?.classId || '',
    section: location.state?.sectionId || '',
    discount: 0,
    admissionFeePaid: false
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classes.length > 0 && location.state?.classId) {
      const selectedClass = classes.find(c => c._id === location.state.classId);
      if (selectedClass) {
        setSections(selectedClass.sections || []);
        // Sync newStudent state with location state as well
        if (location.state.sectionId) {
          setNewStudent(prev => ({
            ...prev,
            class: location.state.classId,
            section: location.state.sectionId
          }));
        }
      }
    }
  }, [classes, location.state]);

  useEffect(() => {
    fetchStudents();
  }, [filters.classId, filters.sectionId, filters.status]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(res.data);
    } catch (err) {
      toast.error('Failed to load classes');
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { classId, sectionId, status } = filters;
      const res = await axios.get(`${API_BASE_URL}/api/students`, {
        params: { classId, sectionId, status },
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (classId) => {
    setFilters({ ...filters, classId, sectionId: '' });
    const selectedClass = classes.find(c => c._id === classId);
    setSections(selectedClass ? selectedClass.sections : []);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/students`, newStudent, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Student registered successfully');
      setView('list');
      fetchStudents();
    } catch (err) {
        console.error(err);
      toast.error('Failed to register student');
    }
  };

  const deleteStudent = async (id) => {
    if (window.confirm('Warning: This will delete all records for this student. Continue?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/api/students/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Student deleted');
        fetchStudents();
      } catch (err) {
        toast.error('Failed to delete student');
      }
    }
  };

  const filteredStudents = students.filter(s => 
    (s.name || '').toLowerCase().includes((filters.search || '').toLowerCase()) ||
    (s.regNo || '').toLowerCase().includes((filters.search || '').toLowerCase()) ||
    (s.fatherName || '').toLowerCase().includes((filters.search || '').toLowerCase())
  );

  if (view === 'classes' && user?.role === 'teacher') {
    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        <header>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">My Assigned Classes</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-[0.2em]">Select a class to view student group</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {classes.map(cls => (
             cls.sections.map(sec => (
                <div 
                  key={sec._id}
                  onClick={() => {
                    setFilters({...filters, classId: cls._id, sectionId: sec._id});
                    setSelectedSection({ className: cls.name, sectionName: sec.name });
                    setView('list');
                  }}
                  className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] group hover:border-blue-500/50 hover:bg-slate-900/50 transition-all cursor-pointer relative overflow-hidden shadow-2xl"
                >
                   <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <GraduationCap size={80} />
                   </div>
                   <div className="relative z-10">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Grade Unit</span>
                      <h3 className="text-3xl font-black text-white mt-1 uppercase tracking-tight">{cls.name} <span className="text-blue-500">{sec.name}</span></h3>
                      
                      <div className="mt-8 space-y-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                               <User2 size={20} />
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-slate-500 uppercase">Class Teacher</p>
                               <p className="text-sm font-bold text-slate-200">{sec.classTeacher?.fullName || 'Not Assigned'}</p>
                            </div>
                         </div>
                         <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                               <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Students</div>
                               <div className="text-xl font-bold text-white">{sec.studentCount || 0}</div>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                               <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Present</div>
                               <div className="text-xl font-bold text-emerald-500">{sec.presentCount || 0}</div>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                               <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Periods</div>
                               <div className="text-xl font-bold text-blue-500">{sec.totalPeriodsToday || 0}</div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             ))
           ))}
        </div>
      </div>
    );
  }

  if (view === 'add') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        <header className="flex items-center gap-4">
          <button 
            onClick={() => setView('list')}
            className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Register New Student</h1>
            <p className="text-slate-400">Add a new student to the academic system.</p>
          </div>
        </header>

        <form onSubmit={handleAddStudent} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl space-y-12">
           {/* Section 1: Academic */}
           <div className="space-y-8">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
               <h3 className="text-xl font-bold text-white">Academic Placement</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Registration No</label>
                 <input 
                   required
                   type="text" 
                   className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-600/50 outline-none"
                   value={newStudent.regNo}
                   onChange={e => setNewStudent({...newStudent, regNo: e.target.value})}
                   placeholder="e.g. PG-2601"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Admission Date</label>
                 <input 
                   required
                   type="date" 
                   className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-600/50 outline-none"
                   value={newStudent.admissionDate}
                   onChange={e => setNewStudent({...newStudent, admissionDate: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Class</label>
                 <select 
                   required
                   className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-600/50 outline-none appearance-none"
                   value={newStudent.class}
                   onChange={e => {
                     const classId = e.target.value;
                     const selectedClass = classes.find(c => c._id === classId);
                     setNewStudent({...newStudent, class: classId, section: ''});
                     setSections(selectedClass ? selectedClass.sections : []);
                   }}
                 >
                   <option value="">Select Class</option>
                   {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Section</label>
                 <select 
                   required
                   disabled={!newStudent.class}
                   className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-600/50 outline-none appearance-none disabled:opacity-50"
                   value={newStudent.section}
                   onChange={e => setNewStudent({...newStudent, section: e.target.value})}
                 >
                   <option value="">Select Section</option>
                   {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                 </select>
               </div>
             </div>
           </div>

           {/* Section 2: Personal */}
           <div className="space-y-8">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
               <h3 className="text-xl font-bold text-white">Personal Information</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Student Name</label>
                 <input 
                   required
                   className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl"
                   value={newStudent.name}
                   onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Father's Name</label>
                 <input 
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl"
                    value={newStudent.fatherName}
                    onChange={e => setNewStudent({...newStudent, fatherName: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Date of Birth</label>
                 <input 
                    required
                    type="date"
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl"
                    value={newStudent.dob}
                    onChange={e => setNewStudent({...newStudent, dob: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Gender</label>
                 <select 
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl"
                    value={newStudent.gender}
                    onChange={e => setNewStudent({...newStudent, gender: e.target.value})}
                 >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Phone Number</label>
                 <input 
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl"
                    value={newStudent.phone}
                    onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
                    placeholder="+92 XXX XXXXXXX"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">B-Form (Optional)</label>
                 <input 
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl"
                    value={newStudent.bForm}
                    onChange={e => setNewStudent({...newStudent, bForm: e.target.value})}
                    placeholder="XXXXX-XXXXXXX-X"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Father's CNIC (Optional)</label>
                 <input 
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl"
                    value={newStudent.fatherCnic}
                    onChange={e => setNewStudent({...newStudent, fatherCnic: e.target.value})}
                    placeholder="XXXXX-XXXXXXX-X"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Cast (Optional)</label>
                 <input 
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl"
                    value={newStudent.cast}
                    onChange={e => setNewStudent({...newStudent, cast: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Religion (Optional)</label>
                 <input 
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl"
                    value={newStudent.religion}
                    onChange={e => setNewStudent({...newStudent, religion: e.target.value})}
                 />
               </div>
               <div className="space-y-2 lg:col-span-3">
                 <label className="text-sm font-semibold text-slate-400 ml-1">Home Address</label>
                 <textarea 
                    rows="2"
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50"
                    value={newStudent.address}
                    onChange={e => setNewStudent({...newStudent, address: e.target.value})}
                    placeholder="Enter full residential address..."
                 />
               </div>
             </div>
           </div>

           {/* Section 3: Fees */}
           <div className="space-y-8 pt-8 border-t border-slate-800">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
               <h3 className="text-xl font-bold text-white">Fee Configuration</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-emerald-400/80 ml-1">Monthly Discount</label>
                 <input 
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-emerald-500/30"
                    value={newStudent.discount}
                    onChange={e => setNewStudent({...newStudent, discount: parseInt(e.target.value) || 0})}
                 />
               </div>
               <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                 <input 
                    type="checkbox" 
                    id="admPaid"
                    className="w-6 h-6 rounded-lg bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    checked={newStudent.admissionFeePaid}
                    onChange={e => setNewStudent({...newStudent, admissionFeePaid: e.target.checked})}
                 />
                 <label htmlFor="admPaid" className="text-sm font-bold text-slate-300">Admission Fee Paid?</label>
               </div>
               <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-900/30 transition-all active:scale-95 flex items-center justify-center gap-2"
               >
                 <CheckCircle2 size={22} /> Save Student Profile
               </button>
             </div>
           </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Student <span className="text-blue-500">Directory</span>
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em]">
              {user?.role === 'teacher' 
                ? `Assigned: ${selectedSection?.className} - ${selectedSection?.sectionName}`
                : 'Management of academic records and profiles'}
            </p>
          </div>
        </div>
        
        {user?.role === 'teacher' ? (
          <button 
            onClick={() => {
              setView('classes');
              setFilters({ ...filters, classId: '', sectionId: '' });
            }}
            className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95"
          >
            Back to Classes
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <button 
                onClick={() => navigate('/students/promotion')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
              >
                <GraduationCap size={18} /> Promote Classes
              </button>
            )}
            <button 
              onClick={() => setView('add')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-[0_20px_50px_-15px_rgba(59,130,246,0.5)] transition-all active:scale-95"
            >
              <UserPlus size={18} /> Register Student
            </button>
          </div>
        )}
      </header>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl">
        <div className="col-span-full lg:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, reg no..."
            className="w-full bg-slate-950 border border-slate-800 text-white pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-bold"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <select 
             className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-bold"
             value={filters.classId}
             onChange={(e) => handleClassChange(e.target.value)}
          >
             <option value="">All Classes</option>
             {(classes || []).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1 md:col-span-1">
          <select 
             className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-bold"
             value={filters.sectionId}
             onChange={(e) => setFilters({...filters, sectionId: e.target.value})}
             disabled={!filters.classId}
          >
             <option value="">All Sections</option>
             {(sections || []).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1 md:col-span-1">
          <select 
             className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-blue-500/50 transition-all font-bold"
             value={filters.status}
             onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
             <option value="">All Statuses</option>
             <option value="Active">Active</option>
             <option value="Inactive">Inactive</option>
             <option value="Expelled">Expelled</option>
             <option value="Passed Out">Passed Out</option>
          </select>
        </div>
        <button 
           onClick={() => setFilters({classId: '', sectionId: '', status: '', search: ''})}
           className="h-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-black uppercase text-[10px] tracking-widest px-4 py-3 rounded-2xl transition-all md:col-span-1"
        >
          Reset
        </button>
      </div>

      {/* Student List */}
      <div className="bg-slate-900 md:rounded-[2.5rem] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase text-xs tracking-wider uppercase tracking-[0.2em] text-[9px]">Student Profile</th>
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase text-xs tracking-wider uppercase tracking-[0.2em] text-[9px]">Class & Unit</th>
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase text-xs tracking-wider uppercase tracking-[0.2em] text-[9px]">Guardian Info</th>
                  <th className="px-8 py-5 font-bold text-slate-400 uppercase text-xs tracking-wider uppercase tracking-[0.2em] text-[9px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-20 text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">authorising records...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-20 text-slate-700 font-black uppercase text-xs tracking-[0.1em]">no match found in directory</td></tr>
                ) : filteredStudents.map(student => (
                  <tr 
                    key={student._id} 
                    onClick={() => navigate(`/students/${student._id}`)}
                    className="group hover:bg-slate-950/50 transition-all cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                         <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold transition-all ${student.gender?.toLowerCase() === 'female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-600/10 text-blue-500'}`}>
                           {student.gender?.toLowerCase() === 'female' ? <User2 size={22} /> : <User size={22} />}
                         </div>
                         <div>
                           <div className="font-bold text-white group-hover:text-blue-500 transition-colors uppercase text-sm tracking-tight">{student.name}</div>
                           <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter opacity-60">{student.regNo}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-black text-slate-200 uppercase">{student.class?.name || 'N/A'}</div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section {student.section?.name || 'N/A'}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col min-w-0">
                        <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate leading-tight">{student.fatherName || 'No Data'}</div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 leading-none uppercase">{student.phone || 'No Contact'}</div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                        student.status === 'Active' ? 'text-emerald-500' :
                        student.status === 'Expelled' ? 'text-rose-500' :
                        'text-slate-500'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-800">
             {loading ? (
                <div className="py-20 text-center text-slate-500 font-black uppercase text-[10px] animate-pulse">accessing files...</div>
             ) : filteredStudents.length === 0 ? (
                <div className="py-20 text-center text-slate-700 font-black uppercase text-xs">directory empty</div>
             ) : filteredStudents.map(student => (
                <div 
                  key={student._id} 
                  onClick={() => navigate(`/students/${student._id}`)}
                  className="p-5 active:bg-slate-950/80 transition-all space-y-4"
                >
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${student.gender?.toLowerCase() === 'female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-600/10 text-blue-500'}`}>
                            {student.gender?.toLowerCase() === 'female' ? <User2 size={18} /> : <User size={18} />}
                         </div>
                         <div>
                            <div className="text-sm font-black text-white uppercase tracking-tight">{student.name}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">{student.regNo}</div>
                         </div>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${
                         student.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                         {student.status}
                      </span>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-950 border border-slate-800/50 p-3 rounded-xl">
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Class</p>
                         <p className="text-xs font-bold text-slate-200">{student.class?.name} - {student.section?.name}</p>
                      </div>
                      <div className="bg-slate-950 border border-slate-800/50 p-3 rounded-xl">
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Parent</p>
                         <p className="text-xs font-bold text-slate-200 truncate">{student.fatherName}</p>
                      </div>
                   </div>
                </div>
             ))}
          </div>
      </div>
    </div>
  );
};

export default Students;
