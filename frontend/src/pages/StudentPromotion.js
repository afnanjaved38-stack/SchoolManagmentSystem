import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { 
  ArrowRight, 
  GraduationCap, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Save, 
  BookOpen, 
  Calendar,
  Layers,
  ArrowUpRight,
  Loader2,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'react-toastify';

const StudentPromotion = () => {
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  // Selection states
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');

  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (sourceClassId && sourceSectionId) {
      fetchClassStudents();
    } else {
      setStudents([]);
      setSelectedStudentIds([]);
    }
  }, [sourceClassId, sourceSectionId]);

  const fetchInitialData = async () => {
    try {
      const [classRes, sessRes, actSessRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/classes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        axios.get(`${API_BASE_URL}/api/academic-years`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        axios.get(`${API_BASE_URL}/api/academic-years/active`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      setClasses(classRes.data);
      setSessions(sessRes.data);
      if (actSessRes.data) {
        setActiveSession(actSessRes.data);
        setTargetSessionId(actSessRes.data._id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load classes and sessions');
    }
  };

  const fetchClassStudents = async () => {
    try {
      setLoadingStudents(true);
      const res = await axios.get(`${API_BASE_URL}/api/students?classId=${sourceClassId}&sectionId=${sourceSectionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = res.data.students || res.data || [];
      setStudents(data);
      // Select all by default
      setSelectedStudentIds(data.map(s => s._id));
      setLoadingStudents(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch class students');
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s._id));
    }
  };

  const handlePromoteBatch = async (e) => {
    e.preventDefault();
    if (!sourceClassId || !sourceSectionId) {
      return toast.error('Please select source class & section');
    }
    if (!targetClassId || !targetSectionId) {
      return toast.error('Please select target class & section for promotion');
    }
    if (selectedStudentIds.length === 0) {
      return toast.error('Please select at least one student to promote');
    }

    const sourceClassObj = classes.find(c => c._id === sourceClassId);
    const targetClassObj = classes.find(c => c._id === targetClassId);

    const confirmMsg = `Are you sure you want to promote ${selectedStudentIds.length} students from ${sourceClassObj?.name} to ${targetClassObj?.name}?\n\n(${students.length - selectedStudentIds.length} unchecked students will remain in current grade as Retained).`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsPromoting(true);
      // 1. Promote selected students
      const res = await axios.post(`${API_BASE_URL}/api/students/promote`, {
        studentIds: selectedStudentIds,
        targetClassId,
        targetSectionId,
        sessionId: targetSessionId,
        action: 'promote'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // 2. Mark unselected as Retained
      const unselectedIds = students.filter(s => !selectedStudentIds.includes(s._id)).map(s => s._id);
      if (unselectedIds.length > 0) {
        await axios.post(`${API_BASE_URL}/api/students/promote`, {
          studentIds: unselectedIds,
          sessionId: targetSessionId,
          action: 'retain'
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      toast.success(res.data.msg);
      // Refresh students
      fetchClassStudents();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Promotion failed');
    } finally {
      setIsPromoting(false);
    }
  };

  const sourceClass = classes.find(c => c._id === sourceClassId);
  const targetClass = classes.find(c => c._id === targetClassId);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              Student <span className="text-blue-500">Promotion & Shifting</span>
            </h1>
            <p className="text-slate-500 mt-1 font-bold uppercase text-[10px] tracking-[0.3em]">
              Academic Session Transition • Bulk Class Shift Engine
            </p>
          </div>
        </div>

        {activeSession && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl self-start md:self-auto">
            <Calendar size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">
              Active Session: <strong className="text-emerald-400">{activeSession.name}</strong>
            </span>
          </div>
        )}
      </header>

      {/* Promotion Config Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Source Class Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-7 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-rose-400 font-black text-xs">
              1
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Source Grade & Section (Current)</h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select class to promote students from</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Class</label>
              <select
                value={sourceClassId}
                onChange={(e) => {
                  setSourceClassId(e.target.value);
                  setSourceSectionId('');
                }}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs cursor-pointer"
              >
                <option value="">-- Choose Class --</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Section</label>
              <select
                disabled={!sourceClassId}
                value={sourceSectionId}
                onChange={(e) => setSourceSectionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Choose Section --</option>
                {sourceClass?.sections?.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Target Class Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-7 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 font-black text-xs">
              2
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Target Grade & New Session</h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select next grade & academic session</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Promote To Class</label>
              <select
                value={targetClassId}
                onChange={(e) => {
                  setTargetClassId(e.target.value);
                  setTargetSectionId('');
                }}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs cursor-pointer"
              >
                <option value="">-- Target Class --</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Section</label>
              <select
                disabled={!targetClassId}
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Target Section --</option>
                {targetClass?.sections?.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Session</label>
              <select
                value={targetSessionId}
                onChange={(e) => setTargetSessionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s._id} value={s._id}>{s.name} {s.isActive ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Student Checklist Table */}
      {sourceClassId && sourceSectionId && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                {selectedStudentIds.length === students.length ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                <span>{selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All Students'}</span>
              </button>

              <span className="text-xs font-bold text-slate-400">
                <strong className="text-emerald-400">{selectedStudentIds.length}</strong> to Promote · <strong className="text-rose-400">{students.length - selectedStudentIds.length}</strong> to Retain
              </span>
            </div>

            <button
              onClick={handlePromoteBatch}
              disabled={isPromoting || selectedStudentIds.length === 0 || !targetClassId || !targetSectionId}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-xl shadow-blue-900/30 transition-all flex items-center gap-2"
            >
              {isPromoting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Execute Batch Promotion
            </button>
          </div>

          {/* Table */}
          {loadingStudents ? (
            <div className="p-16 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">
              Loading class roster...
            </div>
          ) : students.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="py-3 px-4 w-12 text-center">Promote?</th>
                    <th className="py-3 px-4">Registration No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Father Name</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4 text-center">Action Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs">
                  {students.map((student) => {
                    const isSelected = selectedStudentIds.includes(student._id);
                    return (
                      <tr 
                        key={student._id}
                        onClick={() => toggleStudent(student._id)}
                        className={`hover:bg-slate-950/60 cursor-pointer transition-colors ${isSelected ? 'bg-slate-950/20' : 'opacity-60 bg-rose-950/10'}`}
                      >
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudent(student._id)}
                            className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-400">#{student.regNo}</td>
                        <td className="py-3.5 px-4 font-bold text-white uppercase">{student.name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{student.fatherName}</td>
                        <td className="py-3.5 px-4 text-slate-400">{student.gender}</td>
                        <td className="py-3.5 px-4 text-center">
                          {isSelected ? (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                              <CheckCircle2 size={10} /> Promote to {targetClass?.name || 'Next Grade'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                              <RotateCcw size={10} /> Retain / Repeat
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              <Users size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No active students enrolled in this section</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentPromotion;
