import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { AuthContext } from '../context/AuthContext';
import { 
  BookOpen, 
  Plus, 
  Users, 
  GraduationCap, 
  X, 
  Loader2,
  Calendar,
  Eye,
  Trash2,
  CheckCircle2,
  Search,
  Sparkles,
  TrendingUp,
  Award
} from 'lucide-react';
import { toast } from 'react-toastify';

const ClassTests = () => {
  const { user } = useContext(AuthContext);
  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  const [loading, setLoading] = useState(true);
  const [classTests, setClassTests] = useState([]);
  const [selectedTestDetail, setSelectedTestDetail] = useState(null);

  // Multi-child parent state
  const [allChildren, setAllChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [portalStudent, setPortalStudent] = useState(null);

  // Teacher / Admin Selectors
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Modal: Conduct Test
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [newTest, setNewTest] = useState({
    title: '',
    subject: '',
    totalMarks: 20,
    date: new Date().toISOString().slice(0, 10)
  });
  const [testStudentScores, setTestStudentScores] = useState({});
  const [isSavingTest, setIsSavingTest] = useState(false);

  useEffect(() => {
    if (isAdmin || isTeacher) {
      fetchClasses();
    } else {
      fetchPortalData();
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (isAdmin || isTeacher) {
      if (selectedClassId && selectedSectionId) {
        fetchClassTests();
      }
    }
  }, [selectedClassId, selectedSectionId]);

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

  const fetchClassTests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/exams/tests?classId=${selectedClassId}&sectionId=${selectedSectionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClassTests(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/exams/portal/me${selectedChildId ? `?studentId=${selectedChildId}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPortalStudent(res.data.student);
      setAllChildren(res.data.allChildren || []);
      setClassTests(res.data.classTests || []);
      if (!selectedChildId && res.data.allChildren?.length > 0) {
        setSelectedChildId(res.data.allChildren[0]._id);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const openConductModal = async () => {
    if (!selectedClassId || !selectedSectionId) {
      return toast.error('Please select Class and Section first');
    }

    try {
      const sRes = await axios.get(`${API_BASE_URL}/api/students?classId=${selectedClassId}&sectionId=${selectedSectionId}&status=Active`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const students = sRes.data;
      setEnrolledStudents(students);

      const initialScores = {};
      students.forEach(s => {
        initialScores[s._id] = { obtainedMarks: 0, remarks: '' };
      });
      setTestStudentScores(initialScores);
      setIsTestModalOpen(true);
    } catch (err) {
      toast.error('Failed to load students for class test');
    }
  };

  const handleSaveClassTest = async (e) => {
    e.preventDefault();
    if (!newTest.title.trim() || !newTest.subject.trim()) {
      return toast.error('Subject and Test Title/Topic are required');
    }

    try {
      setIsSavingTest(true);
      const studentScores = Object.keys(testStudentScores).map(studentId => ({
        studentId,
        obtainedMarks: Number(testStudentScores[studentId].obtainedMarks) || 0,
        remarks: testStudentScores[studentId].remarks || ''
      }));

      const res = await axios.post(`${API_BASE_URL}/api/exams/tests`, {
        title: newTest.title.trim(),
        subject: newTest.subject.trim(),
        classId: selectedClassId,
        sectionId: selectedSectionId,
        totalMarks: Number(newTest.totalMarks) || 20,
        date: newTest.date || new Date(),
        studentScores
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(res.data.msg);
      setIsTestModalOpen(false);
      setNewTest({ title: '', subject: '', totalMarks: 20, date: new Date().toISOString().slice(0, 10) });
      fetchClassTests();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to record class test');
    } finally {
      setIsSavingTest(false);
    }
  };

  const handleDeleteTest = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this class test record?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/exams/tests/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Test record deleted');
      if (selectedTestDetail?._id === id) setSelectedTestDetail(null);
      fetchClassTests();
    } catch (err) {
      toast.error('Failed to delete test record');
    }
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
              {isParent ? 'Child ' : 'Daily & Weekly '}<span className="text-amber-400">Class Tests</span>
            </h1>
            <p className="text-slate-500 mt-1 font-bold uppercase text-[10px] tracking-[0.3em]">
              {isParent ? 'Continuous Assessments & Weekly Test Results For Your Child' : 'Continuous Assessments • Topic Evaluations & Teacher Feedback'}
            </p>
          </div>
        </div>

        {(isTeacher || isAdmin) && (
          <button
            onClick={openConductModal}
            className="px-6 py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-xl shadow-amber-900/30 transition-all flex items-center gap-2 self-start md:self-auto"
          >
            <Plus size={16} /> Conduct New Class Test
          </button>
        )}
      </header>

      {/* Multi-Child Selector for Parent */}
      {isParent && allChildren.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-amber-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Select Child:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allChildren.map(child => (
              <button
                key={child._id}
                onClick={() => setSelectedChildId(child._id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  selectedChildId === child._id
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
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

      {/* Class and Section Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {(isAdmin || isTeacher) ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Target Class & Section:</span>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                const cls = classes.find(c => c._id === e.target.value);
                if (cls?.sections?.length > 0) setSelectedSectionId(cls.sections[0]._id);
              }}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs font-bold uppercase outline-none focus:border-amber-500 cursor-pointer"
            >
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs font-bold uppercase outline-none focus:border-amber-500 cursor-pointer"
            >
              {selectedClass?.sections?.map(s => (
                <option key={s._id} value={s._id}>Section {s.name}</option>
              ))}
            </select>
          </div>
        ) : (
          portalStudent && (
            <div className="text-xs font-bold text-slate-400">
              Student: <strong className="text-white uppercase">{portalStudent.name}</strong> • Class {portalStudent.class?.name}-{portalStudent.section?.name}
            </div>
          )
        )}
      </div>

      {/* Class Tests List View */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Classroom Assessments Directory
              </h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {classTests.length} Recorded Tests • Click Any Row for Score Details
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">
            Loading class tests...
          </div>
        ) : classTests.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Test Topic</th>
                  {(isStudent || isParent) ? (
                    <>
                      <th className="py-3.5 px-4 text-center">Score</th>
                      <th className="py-3.5 px-4 text-center">Percentage</th>
                      <th className="py-3.5 px-4">Teacher Review / Remarks</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4 text-center">Max Marks</th>
                      <th className="py-3.5 px-4 text-center">Students Assessed</th>
                      <th className="py-3.5 px-4">Conducted By</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {classTests.map((t, idx) => (
                  <tr 
                    key={t._id} 
                    onClick={() => (isAdmin || isTeacher) && setSelectedTestDetail(t)}
                    className="hover:bg-slate-950/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 text-center font-bold text-slate-600">{idx + 1}</td>
                    <td className="py-4 px-4 whitespace-nowrap text-slate-300 font-bold">
                      {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-black uppercase text-[10px]">
                        {t.subject}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-white group-hover:text-amber-400 transition-colors">
                      {t.title}
                    </td>
                    {(isStudent || isParent) ? (
                      <>
                        <td className="py-4 px-4 text-center font-black text-emerald-400 whitespace-nowrap">
                          {t.obtainedMarks} / {t.totalMarks}
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-300 whitespace-nowrap">
                          {t.percentage}%
                        </td>
                        <td className="py-4 px-4 text-slate-300 italic font-medium">
                          {t.remarks || 'Good Effort! Keep practicing.'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-4 text-center font-black text-slate-300 whitespace-nowrap">{t.totalMarks}</td>
                        <td className="py-4 px-4 text-center font-bold text-emerald-400 whitespace-nowrap">{t.results?.length || 0} Enrolled</td>
                        <td className="py-4 px-4 text-slate-400 font-bold whitespace-nowrap">{t.postedByName || t.teacher?.fullName || 'Faculty Staff'}</td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedTestDetail(t)}
                              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                            >
                              <Eye size={13} />
                              <span>View Scores</span>
                            </button>
                            <button
                              onClick={(e) => handleDeleteTest(t._id, e)}
                              className="p-1.5 bg-slate-950 text-slate-500 hover:text-red-400 rounded-xl border border-slate-800 transition-all opacity-0 group-hover:opacity-100"
                              title="Delete Test Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
            <BookOpen size={36} className="mx-auto text-slate-600" />
            <h4 className="text-sm font-black text-white uppercase tracking-tight">No Class Tests Recorded</h4>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {isAdmin || isTeacher 
                ? 'Click "Conduct New Class Test" above to grade and record test results for this section.' 
                : 'No tests recorded yet for this academic session.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal: Conduct New Class Test */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Conduct Class Test</h2>
                <p className="text-slate-400 text-xs font-bold mt-0.5">
                  Class {selectedClass?.name} • Section {selectedClass?.sections?.find(s => s._id === selectedSectionId)?.name} • {enrolledStudents.length} Students
                </p>
              </div>
              <button onClick={() => setIsTestModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveClassTest} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-6 space-y-4 border-b border-slate-800 bg-slate-950/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mathematics, Urdu, Science..."
                      value={newTest.subject}
                      onChange={(e) => setNewTest({...newTest, subject: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl outline-none font-bold text-xs focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Test Title / Chapter Topic</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chapter 3: Algebra & Linear Equations"
                      value={newTest.title}
                      onChange={(e) => setNewTest({...newTest, title: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl outline-none font-bold text-xs focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Marks</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newTest.totalMarks}
                      onChange={(e) => setNewTest({...newTest, totalMarks: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl outline-none font-bold text-xs focus:border-amber-500 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Student Scores Input Table */}
              <div className="p-6 space-y-3 flex-1 bg-slate-950/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Student Scores & Teacher Reviews ({enrolledStudents.length} Students)
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Max Score: {newTest.totalMarks}</span>
                </div>
                
                <div className="space-y-2">
                  {enrolledStudents.map((s, idx) => (
                    <div key={s._id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="min-w-[180px]">
                        <div className="text-xs font-black text-white uppercase">{idx + 1}. {s.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold">#{s.regNo} • Father: {s.fatherName}</div>
                      </div>

                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Obtained:</label>
                          <input
                            type="number"
                            min="0"
                            max={newTest.totalMarks}
                            value={testStudentScores[s._id]?.obtainedMarks || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTestStudentScores(prev => ({
                                ...prev,
                                [s._id]: { ...prev[s._id], obtainedMarks: val }
                              }));
                            }}
                            className="w-20 bg-slate-900 border border-slate-800 text-emerald-400 text-center font-black p-2.5 rounded-xl text-xs outline-none focus:border-amber-500"
                          />
                        </div>

                        <input
                          type="text"
                          placeholder="Personalized feedback (e.g. Excellent work, needs improvement in formula steps)..."
                          value={testStudentScores[s._id]?.remarks || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestStudentScores(prev => ({
                              ...prev,
                              [s._id]: { ...prev[s._id], remarks: val }
                            }));
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 text-white p-2.5 rounded-xl text-xs outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTest}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-900/30 transition-all flex items-center gap-2"
                >
                  {isSavingTest ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Publish Class Test to Parents & Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Full Test Scores Detail (Admin/Teacher) */}
      {selectedTestDetail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-[10px] font-black uppercase">
                    {selectedTestDetail.subject}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Max Score: {selectedTestDetail.totalMarks} Marks
                  </span>
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  {selectedTestDetail.title}
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  Conducted on: {new Date(selectedTestDetail.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} • By: {selectedTestDetail.postedByName || selectedTestDetail.teacher?.fullName || 'Faculty'}
                </p>
              </div>
              <button onClick={() => setSelectedTestDetail(null)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4 text-center">Score</th>
                    <th className="py-2.5 px-4 text-center">Percentage</th>
                    <th className="py-2.5 px-4">Teacher Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {selectedTestDetail.results?.map((r, idx) => {
                    const pct = selectedTestDetail.totalMarks > 0 ? Math.round((r.obtainedMarks / selectedTestDetail.totalMarks) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-950/60">
                        <td className="py-3 px-4 text-center font-bold text-slate-600">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-black text-white uppercase">{r.student?.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold">#{r.student?.regNo}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-black text-emerald-400">
                          {r.obtainedMarks} / {selectedTestDetail.totalMarks}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-300">
                          {pct}%
                        </td>
                        <td className="py-3 px-4 text-slate-300 italic">
                          {r.remarks || 'Satisfactory'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900">
              <button
                onClick={() => setSelectedTestDetail(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassTests;
