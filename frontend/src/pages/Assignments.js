import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { AuthContext } from '../context/AuthContext';
import { 
  FileText, 
  Plus, 
  Clock, 
  Trash2, 
  User2, 
  Users, 
  GraduationCap, 
  X, 
  Send, 
  Loader2,
  Sparkles,
  BookOpen,
  Search,
  CheckCircle2,
  Calendar,
  Eye,
  Copy,
  Check,
  Printer
} from 'lucide-react';
import { toast } from 'react-toastify';

const Assignments = () => {
  const { user } = useContext(AuthContext);
  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-child parent state
  const [allChildren, setAllChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [portalStudent, setPortalStudent] = useState(null);

  // Teacher / Admin selection state
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Active Read Modal State
  const [readingAssignment, setReadingAssignment] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    subject: '',
    content: '',
    dueDate: ''
  });

  useEffect(() => {
    if (isTeacher || isAdmin) {
      fetchClasses();
    } else {
      fetchStudentPortalInfo();
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [selectedClassId, selectedSectionId, selectedChildId]);

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

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/assignments?`;
      if (isTeacher || isAdmin) {
        if (selectedClassId) url += `&classId=${selectedClassId}`;
        if (selectedSectionId) url += `&sectionId=${selectedSectionId}`;
      } else {
        if (selectedChildId) url += `&studentId=${selectedChildId}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAssignments(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load study resources');
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedClassId || !selectedSectionId) {
      return toast.error('Please select class and section');
    }
    if (!newAssignment.title?.trim() || !newAssignment.subject?.trim() || !newAssignment.content?.trim()) {
      return toast.error('Title, Subject, and Instructions content are required');
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(`${API_BASE_URL}/api/assignments`, {
        classId: selectedClassId,
        sectionId: selectedSectionId,
        title: newAssignment.title.trim(),
        subject: newAssignment.subject.trim(),
        content: newAssignment.content.trim(),
        dueDate: newAssignment.dueDate.trim()
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(res.data.msg);
      setIsModalOpen(false);
      setNewAssignment({
        title: '',
        subject: '',
        content: '',
        dueDate: ''
      });
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to publish assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this assignment / study material?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/assignments/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Assignment deleted');
      if (readingAssignment?._id === id) setReadingAssignment(null);
      fetchAssignments();
    } catch (err) {
      toast.error('Failed to delete assignment');
    }
  };

  const handleCopyNotes = () => {
    if (!readingAssignment) return;
    navigator.clipboard.writeText(`${readingAssignment.title}\nSubject: ${readingAssignment.subject}\n\n${readingAssignment.content}`);
    setIsCopied(true);
    toast.success('Notes copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const selectedClass = classes.find(c => c._id === selectedClassId);

  const filteredAssignments = assignments.filter(a => {
    const q = searchQuery.toLowerCase();
    return a.title?.toLowerCase().includes(q) || a.subject?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              {isParent ? 'Child Homework & ' : 'Assignments & '}<span className="text-indigo-400">{isParent ? 'Study Tasks' : 'Study Resources'}</span>
            </h1>
            <p className="text-slate-500 mt-1 font-bold uppercase text-[10px] tracking-[0.3em]">
              {isParent ? 'Learning Materials & Assigned Study Guides For Your Child' : 'Learning Materials • Click Any Item to Read Full Study Notes & Guides'}
            </p>
          </div>
        </div>

        {(isTeacher || isAdmin) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-xl shadow-indigo-900/30 transition-all flex items-center gap-2 self-start md:self-auto"
          >
            <Plus size={16} /> Publish Study Material
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

      {/* Filter / Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search notes by subject, title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
          />
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
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs font-bold uppercase outline-none focus:border-indigo-500 cursor-pointer"
            >
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs font-bold uppercase outline-none focus:border-indigo-500 cursor-pointer"
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
            Enrolled: <strong className="text-white uppercase">{portalStudent.name}</strong> • Class {portalStudent.class?.name}-{portalStudent.section?.name}
          </div>
        )}
      </div>

      {/* Clean High-Density Table List View */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Study Materials & Homework Directory
              </h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {filteredAssignments.length} Available Notes • Click Any Row to Open Full Reader
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">
            Loading study resources...
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Title & Topic</th>
                  <th className="py-3.5 px-4">Preview Notes</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Published By</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {filteredAssignments.map((item, idx) => (
                  <tr 
                    key={item._id}
                    onClick={() => setReadingAssignment(item)}
                    className="hover:bg-slate-950/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 text-center font-bold text-slate-600 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl font-black uppercase text-[10px]">
                        {item.subject}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-white group-hover:text-indigo-400 transition-colors">
                      {item.title}
                    </td>
                    <td className="py-4 px-4 text-slate-400 max-w-xs truncate font-medium">
                      {item.content}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {item.dueDate ? (
                        <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1">
                          <Clock size={10} className="text-amber-400" />
                          {item.dueDate}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px] uppercase font-bold">Self-Study</span>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-slate-400 font-bold text-xs">
                      {item.postedByName || item.teacher?.fullName || 'Faculty Staff'}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setReadingAssignment(item)}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                        >
                          <Eye size={13} />
                          <span>Read Notes</span>
                        </button>
                        {(isTeacher || isAdmin) && (
                          <button
                            onClick={(e) => handleDelete(item._id, e)}
                            className="p-1.5 bg-slate-950 text-slate-500 hover:text-red-400 rounded-xl border border-slate-800 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Material"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
            <FileText size={36} className="mx-auto text-slate-600" />
            <h4 className="text-sm font-black text-white uppercase tracking-tight">No Study Materials Found</h4>
            <p className="text-xs text-slate-500 uppercase tracking-wider">No assignments or notes matching your query.</p>
          </div>
        )}
      </div>

      {/* Reader Modal (Opens when user clicks any assignment row) */}
      {readingAssignment && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-7 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl font-black uppercase text-[10px]">
                    {readingAssignment.subject}
                  </span>
                  {readingAssignment.dueDate && (
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1">
                      <Clock size={10} className="text-amber-400" />
                      Target Due: {readingAssignment.dueDate}
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                  {readingAssignment.title}
                </h2>
                <p className="text-slate-400 text-xs font-bold mt-1">
                  Author: <strong className="text-indigo-300">{readingAssignment.postedByName || readingAssignment.teacher?.fullName || 'Faculty Staff'}</strong> • Published: {new Date(readingAssignment.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setReadingAssignment(null)} 
                className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body - Notes Reader */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-950/40">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-slate-100 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                {readingAssignment.content}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-800 flex items-center justify-between bg-slate-900">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Class {readingAssignment.class?.name} - {readingAssignment.section?.name} Study Guide
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyNotes}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{isCopied ? 'Copied!' : 'Copy Notes'}</span>
                </button>
                <button
                  onClick={() => setReadingAssignment(null)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-900/30 transition-all"
                >
                  Close Reader
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Publish Assignment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-7 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Publish Study Material</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
                  Class {selectedClass?.name} • Homework & Resources
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-7 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science, Mathematics, English..."
                  value={newAssignment.subject}
                  onChange={(e) => setNewAssignment({...newAssignment, subject: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assignment / Resource Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4 Key Concepts & Practice Questions"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Study Guide / Homework Instructions</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Write clear instructions, questions, reading points, or study guidelines for students..."
                  value={newAssignment.content}
                  onChange={(e) => setNewAssignment({...newAssignment, content: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-medium text-xs leading-relaxed focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date / Target (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 28 Aug 2026 / Next Monday"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-900/30 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Publish Study Resource
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
