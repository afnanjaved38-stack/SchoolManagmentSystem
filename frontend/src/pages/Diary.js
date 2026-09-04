import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { AuthContext } from '../context/AuthContext';
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  User2, 
  Users, 
  GraduationCap, 
  X, 
  Send, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

const Diary = () => {
  const { user } = useContext(AuthContext);
  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  const [loading, setLoading] = useState(true);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Multi-child parent state
  const [allChildren, setAllChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [portalStudent, setPortalStudent] = useState(null);

  // Teacher / Admin selection state
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Post Diary Entry Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEntry, setNewEntry] = useState({
    subject: '',
    homework: '',
    submissionDate: 'Tomorrow',
    notes: ''
  });

  useEffect(() => {
    if (isTeacher || isAdmin) {
      fetchClasses();
    } else {
      fetchStudentPortalInfo();
    }
  }, []);

  useEffect(() => {
    fetchDiary();
  }, [selectedDate, selectedClassId, selectedSectionId, selectedChildId]);

  const fetchStudentPortalInfo = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/students/portal/me${selectedChildId ? `?studentId=${selectedChildId}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPortalStudent(res.data.student);
      if (res.data.allChildren && res.data.allChildren.length > 0) {
        setAllChildren(res.data.allChildren);
        if (!selectedChildId) {
          setSelectedChildId(res.data.allChildren[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(res.data);
      if (res.data.length > 0) {
        setSelectedClassId(res.data[0]._id);
        if (res.data[0].sections?.length > 0) {
          setSelectedSectionId(res.data[0].sections[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDiary = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/diary?date=${selectedDate}`;
      if (isTeacher || isAdmin) {
        if (selectedClassId) url += `&classId=${selectedClassId}`;
        if (selectedSectionId) url += `&sectionId=${selectedSectionId}`;
      } else {
        if (selectedChildId) url += `&studentId=${selectedChildId}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDiaryEntries(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load diary entries');
      setLoading(false);
    }
  };

  const handlePostDiary = async (e) => {
    e.preventDefault();
    if (!selectedClassId || !selectedSectionId) {
      return toast.error('Please select class and section');
    }
    if (!newEntry.subject || !newEntry.homework.trim()) {
      return toast.error('Subject and homework description are required');
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(`${API_BASE_URL}/api/diary`, {
        classId: selectedClassId,
        sectionId: selectedSectionId,
        date: selectedDate,
        subject: newEntry.subject.trim(),
        homework: newEntry.homework.trim(),
        submissionDate: newEntry.submissionDate.trim(),
        notes: newEntry.notes.trim()
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(res.data.msg);
      setIsModalOpen(false);
      setNewEntry({
        subject: '',
        homework: '',
        submissionDate: 'Tomorrow',
        notes: ''
      });
      fetchDiary();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to post diary entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Delete this homework diary entry?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/diary/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Diary entry deleted');
      fetchDiary();
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  const shiftDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const selectedClass = classes.find(c => c._id === selectedClassId);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              {isParent ? 'Child Daily ' : 'Daily Homework '}<span className="text-amber-400">Diary</span>
            </h1>
            <p className="text-slate-500 mt-1 font-bold uppercase text-[10px] tracking-[0.3em]">
              {isParent ? 'Daily Subject Homework & Assigned Tasks For Your Child' : 'Daily Subject Homework • Class Diary & Submission Deadlines'}
            </p>
          </div>
        </div>

        {(isTeacher || isAdmin) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-xl shadow-amber-900/30 transition-all flex items-center gap-2 self-start md:self-auto"
          >
            <Plus size={16} /> Post Homework Entry
          </button>
        )}
      </header>

      {/* Multi-Child Switcher for Parent */}
      {isParent && allChildren.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-indigo-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Select Child:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allChildren.map(child => (
              <button
                key={child._id}
                onClick={() => setSelectedChildId(child._id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  selectedChildId === child._id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <GraduationCap size={14} />
                <span>{child.name} ({child.class?.name}-{child.section?.name})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls & Date Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              selectedDate === new Date().toISOString().split('T')[0]
                ? 'bg-blue-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Today
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-500 [color-scheme:dark] cursor-pointer"
          />

          <button
            onClick={() => shiftDate(1)}
            className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Teacher / Admin Class & Section Dropdowns */}
        {(isTeacher || isAdmin) && (
          <div className="flex items-center gap-3">
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                const cls = classes.find(c => c._id === e.target.value);
                if (cls?.sections?.length > 0) setSelectedSectionId(cls.sections[0]._id);
              }}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs font-bold uppercase outline-none focus:border-blue-500 cursor-pointer"
            >
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs font-bold uppercase outline-none focus:border-blue-500 cursor-pointer"
            >
              {selectedClass?.sections?.map(s => (
                <option key={s._id} value={s._id}>Section {s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Student / Parent Grade Badge */}
        {(isStudent || isParent) && portalStudent && (
          <div className="text-xs font-bold text-slate-400">
            Diary for: <strong className="text-white uppercase">{portalStudent.name}</strong> • Class {portalStudent.class?.name}-{portalStudent.section?.name}
          </div>
        )}
      </div>

      {/* Diary Table Notebook View */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {diaryEntries.length} Assigned Homework Tasks
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">
            Loading daily homework diary...
          </div>
        ) : diaryEntries.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Homework Task & Instructions</th>
                  <th className="py-3.5 px-4">Submission Due</th>
                  <th className="py-3.5 px-4">Assigned By</th>
                  {(isTeacher || isAdmin) && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {diaryEntries.map((entry, idx) => (
                  <tr key={entry._id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-4 px-4 text-center font-bold text-slate-600 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-black uppercase text-xs">
                        {entry.subject}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                        {entry.homework}
                      </div>
                      {entry.notes && (
                        <div className="mt-1.5 text-[10px] text-slate-400 italic">
                          <strong>Note:</strong> {entry.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1">
                        <Clock size={10} className="text-blue-400" />
                        {entry.submissionDate || 'Tomorrow'}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-slate-300 font-bold text-xs">
                      <div className="flex items-center gap-1.5">
                        {entry.postedByRole === 'admin' && (
                          <span className="px-2 py-0.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-md text-[9px] font-black uppercase">
                            Principal
                          </span>
                        )}
                        <span>{entry.postedByName || entry.teacher?.fullName || 'Faculty Staff'}</span>
                      </div>
                    </td>
                    {(isTeacher || isAdmin) && (
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteEntry(entry._id)}
                          className="p-2 bg-slate-950 text-slate-500 hover:text-red-400 rounded-xl border border-slate-800 transition-all"
                          title="Delete Homework Entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
            <BookOpen size={36} className="mx-auto text-slate-600" />
            <h4 className="text-sm font-black text-white uppercase tracking-tight">No Homework Diary for this Date</h4>
            <p className="text-xs text-slate-500 uppercase tracking-wider">No homework tasks recorded on {selectedDate}.</p>
          </div>
        )}
      </div>

      {/* Modal: Post Homework Diary Entry */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-7 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Post Homework Diary</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
                  {isAdmin ? 'Principal Direct Dispatch' : 'Class Teacher Dispatch'} • Date: {selectedDate}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePostDiary} className="p-7 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Class</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      const cls = classes.find(c => c._id === e.target.value);
                      if (cls?.sections?.length > 0) setSelectedSectionId(cls.sections[0]._id);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs focus:border-amber-500 cursor-pointer"
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Section</label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs focus:border-amber-500 cursor-pointer"
                  >
                    {selectedClass?.sections?.map(s => (
                      <option key={s._id} value={s._id}>Section {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. English, Maths, Urdu, Science, Islamiyat..."
                  value={newEntry.subject}
                  onChange={(e) => setNewEntry({...newEntry, subject: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Homework Task & Instructions</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Read Chapter 3, Complete Exercise Question 1-5 on page 42..."
                  value={newEntry.homework}
                  onChange={(e) => setNewEntry({...newEntry, homework: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-medium text-xs leading-relaxed focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Submission Due</label>
                  <input
                    type="text"
                    placeholder="e.g. Tomorrow, Monday, 25 Aug"
                    value={newEntry.submissionDate}
                    onChange={(e) => setNewEntry({...newEntry, submissionDate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teacher Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Bring notebook"
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-medium text-xs focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-900/30 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Publish Daily Diary Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diary;
