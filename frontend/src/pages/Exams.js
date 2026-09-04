import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { AuthContext } from '../context/AuthContext';
import BRANDING from '../branding';
import { 
  Award, 
  Plus, 
  Users, 
  GraduationCap, 
  X, 
  Loader2, 
  Calendar, 
  Eye, 
  Printer, 
  FileCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send,
  RefreshCw,
  TrendingUp,
  Sliders,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';

const DEFAULT_SUBJECTS = [
  { name: 'English', maxMarks: 100, passingMarks: 40 },
  { name: 'Mathematics', maxMarks: 100, passingMarks: 40 },
  { name: 'Urdu', maxMarks: 100, passingMarks: 40 },
  { name: 'Science', maxMarks: 100, passingMarks: 40 },
  { name: 'Islamiat', maxMarks: 100, passingMarks: 40 },
  { name: 'Social Studies', maxMarks: 100, passingMarks: 40 }
];

const Exams = () => {
  const { user } = useContext(AuthContext);
  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  const [loading, setLoading] = useState(true);

  // Multi-Child State for Parent
  const [allChildren, setAllChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [portalStudent, setPortalStudent] = useState(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);

  // Admin / Teacher Selectors
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Data
  const [examTerms, setExamTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [termResults, setTermResults] = useState([]);

  // Modal 1: Create Exam Term (Admin)
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [newTerm, setNewTerm] = useState({ 
    name: '', 
    termType: 'Mid Term', 
    startDate: '', 
    endDate: '' 
  });
  const [isSubmittingTerm, setIsSubmittingTerm] = useState(false);

  // Modal 2: Batch Enter Subject Marks (Gradebook Spreadsheet)
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [marksSubjects, setMarksSubjects] = useState(DEFAULT_SUBJECTS);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [newSubjectMax, setNewSubjectMax] = useState(100);
  const [newSubjectPass, setNewSubjectPass] = useState(40);
  const [batchMarksData, setBatchMarksData] = useState({});
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  // Publish Status State
  const [isPublishing, setIsPublishing] = useState(false);

  // Modal 3: Printable Official Report Card
  const [printingResult, setPrintingResult] = useState(null);

  useEffect(() => {
    fetchActiveAcademicYear();
    if (isAdmin || isTeacher) {
      fetchClasses();
      fetchExamTerms();
    } else {
      fetchPortalData();
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (isAdmin || isTeacher) {
      if (selectedClassId && selectedSectionId) {
        fetchTermResults();
      }
    }
  }, [selectedClassId, selectedSectionId, selectedTermId]);

  const fetchActiveAcademicYear = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/academic-years/active`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActiveAcademicYear(res.data);
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

  const fetchExamTerms = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/exams/terms`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setExamTerms(res.data);
      if (res.data.length > 0 && !selectedTermId) {
        setSelectedTermId(res.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTermResults = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/exams/results?classId=${selectedClassId}&sectionId=${selectedSectionId}`;
      if (selectedTermId) url += `&examTermId=${selectedTermId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTermResults(res.data);
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
      setTermResults(res.data.termResults || []);
      if (!selectedChildId && res.data.allChildren?.length > 0) {
        setSelectedChildId(res.data.allChildren[0]._id);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Open Marks Entry Modal
  const openMarksEntryModal = async () => {
    if (!selectedClassId || !selectedSectionId) {
      return toast.error('Please select Class and Section first');
    }
    if (!selectedTermId) {
      return toast.error('Please select or create an Exam Term first');
    }

    try {
      // Fetch strictly students enrolled in this selected section
      const sRes = await axios.get(`${API_BASE_URL}/api/students?classId=${selectedClassId}&sectionId=${selectedSectionId}&status=Active`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const students = sRes.data;
      setEnrolledStudents(students);

      // Pre-populate existing marks if available
      const initialMarks = {};
      termResults.forEach(r => {
        if (r.student?._id) {
          const subMap = {};
          r.subjects?.forEach(s => {
            subMap[s.subjectName] = { 
              total: s.totalMarks || 100, 
              pass: s.passingMarks || 40,
              obtained: s.obtainedMarks || 0,
              remarks: s.remarks || ''
            };
          });
          initialMarks[r.student._id] = { subjects: subMap, remarks: r.generalRemarks || '' };
        }
      });

      students.forEach(s => {
        if (!initialMarks[s._id]) {
          const subMap = {};
          marksSubjects.forEach(sub => {
            subMap[sub.name] = { total: sub.maxMarks, pass: sub.passingMarks, obtained: 0, remarks: '' };
          });
          initialMarks[s._id] = { subjects: subMap, remarks: '' };
        }
      });

      setBatchMarksData(initialMarks);
      setIsMarksModalOpen(true);
    } catch (err) {
      toast.error('Failed to load students for marks entry');
    }
  };

  // Save Batch Subject Marks
  const handleSaveBatchMarks = async () => {
    try {
      setIsSavingMarks(true);
      const studentResults = Object.keys(batchMarksData).map(studentId => {
        const studentObj = batchMarksData[studentId];
        const subjectsArray = Object.keys(studentObj.subjects).map(subName => ({
          subjectName: subName,
          totalMarks: Number(studentObj.subjects[subName].total) || 100,
          passingMarks: Number(studentObj.subjects[subName].pass) || 40,
          obtainedMarks: Number(studentObj.subjects[subName].obtained) || 0,
          remarks: studentObj.subjects[subName].remarks || ''
        }));

        return {
          studentId,
          subjects: subjectsArray,
          generalRemarks: studentObj.remarks || ''
        };
      });

      const res = await axios.post(`${API_BASE_URL}/api/exams/results/batch`, {
        examTermId: selectedTermId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        studentResults
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(res.data.msg);
      setIsMarksModalOpen(false);
      fetchTermResults();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to save marks');
    } finally {
      setIsSavingMarks(false);
    }
  };

  // Toggle Results Publication (Live on Parent & Student Portal)
  const handleTogglePublish = async (publishTarget) => {
    if (!selectedTermId || !selectedClassId || !selectedSectionId) {
      return toast.error('Please select Exam Term, Class, and Section');
    }
    if (termResults.length === 0) {
      return toast.error('Please enter and save subject marks before publishing');
    }

    try {
      setIsPublishing(true);
      const res = await axios.post(`${API_BASE_URL}/api/exams/results/publish`, {
        examTermId: selectedTermId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        isPublished: publishTarget
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(res.data.msg);
      fetchTermResults();
    } catch (err) {
      toast.error('Failed to update publication status');
    } finally {
      setIsPublishing(false);
    }
  };

  // Create Exam Term (Admin)
  const handleCreateTerm = async (e) => {
    e.preventDefault();
    if (!newTerm.name.trim()) return toast.error('Term name is required');
    try {
      setIsSubmittingTerm(true);
      const res = await axios.post(`${API_BASE_URL}/api/exams/terms`, newTerm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(res.data.msg);
      setIsTermModalOpen(false);
      setNewTerm({ name: '', termType: 'Mid Term', startDate: '', endDate: '' });
      await fetchExamTerms();
      if (res.data.term?._id) {
        setSelectedTermId(res.data.term._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to create exam term');
    } finally {
      setIsSubmittingTerm(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedClass = classes.find(c => c._id === selectedClassId);
  const selectedSection = selectedClass?.sections?.find(s => s._id === selectedSectionId);

  // Check if section results are published
  const isSectionPublished = termResults.length > 0 && termResults.some(r => r.isPublished);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16 max-w-7xl mx-auto">
      {/* Printable Style Sheet Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-card, #printable-report-card * {
            visibility: visible;
          }
          #printable-report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg">
            <Award size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              {isParent ? 'Child Term Examinations & ' : 'Term Examinations & '}<span className="text-amber-400">{isParent ? 'Report Cards' : 'Official Marksheets'}</span>
            </h1>
            <p className="text-slate-500 mt-1 font-bold uppercase text-[10px] tracking-[0.3em]">
              {isParent ? 'Annual Exam Cycles • Child Grade Summary & Printable Report Cards' : 'Annual Exam Cycles • Subject Grading • Printable Report Cards & Positions'}
            </p>
          </div>
        </div>

        {/* Action Buttons for Admin & Teacher */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {activeAcademicYear && (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Calendar size={13} />
              <span>{activeAcademicYear.name}</span>
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsTermModalOpen(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl uppercase text-xs tracking-wider border border-slate-800 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> New Exam Term
            </button>
          )}

          {(isAdmin || isTeacher) && (
            <button
              onClick={openMarksEntryModal}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl uppercase text-xs tracking-wider shadow-lg shadow-amber-900/30 transition-all flex items-center gap-2"
            >
              <FileCheck size={15} /> Enter / Edit Subject Marks
            </button>
          )}
        </div>
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

      {/* Class, Section, and Exam Term Selector Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {(isAdmin || isTeacher) ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Exam Term:</span>
                <select
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-amber-400 font-black rounded-xl px-4 py-2 text-xs uppercase outline-none focus:border-amber-500 cursor-pointer"
                >
                  {examTerms.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Class:</span>
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
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Section:</span>
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
            </div>

            {/* Publication Status & Action Button */}
            {termResults.length > 0 && (
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 ${
                  isSectionPublished 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  {isSectionPublished ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>{isSectionPublished ? 'Published & Live on Portals' : 'Draft Mode (Hidden from Parents)'}</span>
                </span>

                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => handleTogglePublish(!isSectionPublished)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg ${
                    isSectionPublished
                      ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                  }`}
                >
                  {isPublishing ? <Loader2 size={14} className="animate-spin" /> : isSectionPublished ? <RefreshCw size={14} /> : <Send size={14} />}
                  <span>{isSectionPublished ? 'Revert to Draft' : 'Publish & Announce to Parents'}</span>
                </button>
              </div>
            )}
          </>
        ) : (
          portalStudent && (
            <div className="text-xs font-bold text-slate-400">
              Student: <strong className="text-white uppercase">{portalStudent.name}</strong> • Class {portalStudent.class?.name}-{portalStudent.section?.name}
            </div>
          )
        )}
      </div>

      {/* Marksheets Cards List */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-16 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">
            Loading term exam results...
          </div>
        ) : termResults.length > 0 ? (
          <div className="space-y-6">
            {termResults.map((resItem) => {
              const s = resItem.student || portalStudent;
              return (
                <div 
                  key={resItem._id}
                  className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group hover:border-slate-700/80 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-base">
                        {resItem.position || '1st'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">
                            {s?.name || 'Student'}
                          </h3>
                          <span className="text-[10px] font-bold text-slate-500">#{s?.regNo}</span>
                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            resItem.status === 'Pass' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {resItem.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-bold mt-1">
                          {resItem.examTerm?.name} • Class {resItem.class?.name}-{resItem.section?.name} • Father: {s?.fatherName}
                        </p>
                      </div>
                    </div>

                    {/* Summary Metrics & Print Button */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-black text-white tracking-tight">
                          {resItem.totalObtained} <span className="text-xs text-slate-500">/ {resItem.grandTotal}</span>
                        </div>
                        <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                          {resItem.percentage}% • Grade {resItem.overallGrade}
                        </div>
                      </div>

                      <button
                        onClick={() => setPrintingResult(resItem)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2"
                      >
                        <Printer size={14} /> Print Report Card
                      </button>
                    </div>
                  </div>

                  {/* Subject-Wise Results Table */}
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          <th className="py-2.5 px-4 w-12 text-center">#</th>
                          <th className="py-2.5 px-4">Subject</th>
                          <th className="py-2.5 px-4 text-center">Max Marks</th>
                          <th className="py-2.5 px-4 text-center">Pass Marks</th>
                          <th className="py-2.5 px-4 text-center">Obtained Marks</th>
                          <th className="py-2.5 px-4 text-center">Percentage</th>
                          <th className="py-2.5 px-4 text-center">Grade</th>
                          <th className="py-2.5 px-4">Subject Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {resItem.subjects?.map((sub, idx) => {
                          const subPct = sub.totalMarks > 0 ? Math.round((sub.obtainedMarks / sub.totalMarks) * 100) : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-950/40">
                              <td className="py-3 px-4 text-center font-bold text-slate-600">{idx + 1}</td>
                              <td className="py-3 px-4 font-black text-white">{sub.subjectName}</td>
                              <td className="py-3 px-4 text-center text-slate-400 font-bold">{sub.totalMarks}</td>
                              <td className="py-3 px-4 text-center text-slate-500 font-bold">{sub.passingMarks || 40}</td>
                              <td className="py-3 px-4 text-center font-black text-emerald-400">{sub.obtainedMarks}</td>
                              <td className="py-3 px-4 text-center text-slate-300 font-bold">{subPct}%</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  sub.grade === 'A+' || sub.grade === 'A' ? 'bg-emerald-500/10 text-emerald-400' :
                                  sub.grade === 'B' || sub.grade === 'C' ? 'bg-blue-500/10 text-blue-400' :
                                  'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {sub.grade}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-400 text-[11px] font-medium">{sub.remarks || 'Satisfactory'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {resItem.generalRemarks && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                      <strong className="text-amber-400 font-black uppercase text-[10px] tracking-wider block mb-1">Principal / Class Teacher Remarks:</strong>
                      {resItem.generalRemarks}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-[2.5rem] space-y-3">
            <Award size={40} className="mx-auto text-slate-600" />
            <h4 className="text-sm font-black text-white uppercase tracking-tight">No Exam Results Published Yet</h4>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {isAdmin || isTeacher 
                ? 'Click "Enter / Edit Subject Marks" above to grade and publish marks for this class section.' 
                : 'Term exam results for this session have not been published by administration yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal 1: Create Exam Term */}
      {isTermModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-7 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Create Exam Term</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
                  Academic Year: {activeAcademicYear?.name || 'Current Year'}
                </p>
              </div>
              <button onClick={() => setIsTermModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTerm} className="p-7 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Term Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. First Term Examination 2026-27"
                  value={newTerm.name}
                  onChange={(e) => setNewTerm({...newTerm, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Term Category</label>
                <select
                  value={newTerm.termType}
                  onChange={(e) => setNewTerm({...newTerm, termType: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl outline-none font-bold text-xs focus:border-amber-500 cursor-pointer"
                >
                  <option value="First Term">First Term</option>
                  <option value="Mid Term">Mid Term</option>
                  <option value="Final Term">Final Term</option>
                  <option value="Monthly Assessment">Monthly Assessment</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                  <input
                    type="date"
                    value={newTerm.startDate}
                    onChange={(e) => setNewTerm({...newTerm, startDate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl outline-none font-bold text-xs focus:border-amber-500 [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                  <input
                    type="date"
                    value={newTerm.endDate}
                    onChange={(e) => setNewTerm({...newTerm, endDate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl outline-none font-bold text-xs focus:border-amber-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingTerm}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-900/30 transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingTerm ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Register Exam Term
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Batch Marks Gradebook Spreadsheet */}
      {isMarksModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  Subject Marks Gradebook
                </h2>
                <p className="text-slate-400 text-xs font-bold mt-0.5">
                  Class {selectedClass?.name} - Section {selectedSection?.name} • Enrolled: {enrolledStudents.length} Students
                </p>
              </div>
              <button onClick={() => setIsMarksModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* Dynamic Subjects Management Bar */}
            <div className="p-4 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Configured Subjects:</span>
                {marksSubjects.map((sub, idx) => (
                  <span key={idx} className="px-3 py-1 bg-slate-900 border border-slate-800 text-amber-400 rounded-lg text-xs font-black uppercase flex items-center gap-1.5">
                    {sub.name} (Max: {sub.maxMarks}, Pass: {sub.passingMarks})
                    {marksSubjects.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setMarksSubjects(marksSubjects.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-red-400"
                        title="Remove Subject"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Add Custom Subject */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Subject Name..."
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-amber-500"
                />
                <input
                  type="number"
                  placeholder="Total"
                  value={newSubjectMax}
                  onChange={(e) => setNewSubjectMax(Number(e.target.value) || 100)}
                  className="bg-slate-900 border border-slate-800 text-white px-2 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-amber-500 w-16 text-center"
                  title="Total / Max Marks"
                />
                <input
                  type="number"
                  placeholder="Pass"
                  value={newSubjectPass}
                  onChange={(e) => setNewSubjectPass(Number(e.target.value) || 40)}
                  className="bg-slate-900 border border-slate-800 text-white px-2 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-amber-500 w-16 text-center"
                  title="Passing Marks"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSubjectInput.trim() && !marksSubjects.some(s => s.name.toLowerCase() === newSubjectInput.trim().toLowerCase())) {
                      const newSub = { 
                        name: newSubjectInput.trim(), 
                        maxMarks: Number(newSubjectMax) || 100,
                        passingMarks: Number(newSubjectPass) || 40
                      };
                      setMarksSubjects([...marksSubjects, newSub]);
                      setNewSubjectInput('');
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-black uppercase"
                >
                  + Add Subject
                </button>
              </div>
            </div>

            {/* Students Grid Spreadsheet */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/40">
              {enrolledStudents.length > 0 ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-950">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3 min-w-[170px]">Student Name & Roll No</th>
                      {marksSubjects.map(sub => (
                        <th key={sub.name} className="p-3 text-center min-w-[120px]">
                          <div>{sub.name}</div>
                          <div className="text-[8px] text-slate-600 font-bold">(Max: {sub.maxMarks} • Pass: {sub.passingMarks})</div>
                        </th>
                      ))}
                      <th className="p-3 min-w-[200px]">Remarks / Evaluation Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {enrolledStudents.map((s, idx) => {
                      const studentData = batchMarksData[s._id] || { subjects: {}, remarks: '' };
                      return (
                        <tr key={s._id} className="hover:bg-slate-900/40">
                          <td className="p-3 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-black text-white uppercase">{s.name}</div>
                            <div className="text-[10px] text-slate-500 font-bold">#{s.regNo} • Father: {s.fatherName}</div>
                          </td>
                          {marksSubjects.map(sub => {
                            const currentVal = studentData.subjects?.[sub.name]?.obtained ?? 0;
                            const isFail = currentVal < sub.passingMarks;
                            return (
                              <td key={sub.name} className="p-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={sub.maxMarks}
                                  value={currentVal}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setBatchMarksData(prev => ({
                                      ...prev,
                                      [s._id]: {
                                        ...prev[s._id],
                                        subjects: {
                                          ...prev[s._id]?.subjects,
                                          [sub.name]: { 
                                            total: sub.maxMarks, 
                                            pass: sub.passingMarks, 
                                            obtained: val 
                                          }
                                        }
                                      }
                                    }));
                                  }}
                                  className={`w-20 bg-slate-950 border ${isFail ? 'border-red-500/40 text-red-400' : 'border-slate-800 text-emerald-400'} text-center font-black p-2 rounded-xl outline-none focus:border-amber-500`}
                                />
                              </td>
                            );
                          })}
                          <td className="p-3">
                            <input
                              type="text"
                              placeholder="e.g. Excellent progress, keep working on math..."
                              value={studentData.remarks || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchMarksData(prev => ({
                                  ...prev,
                                  [s._id]: {
                                    ...prev[s._id],
                                    remarks: val
                                  }
                                }));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 text-white p-2 rounded-xl outline-none text-xs font-medium focus:border-amber-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-wider">
                  No active students enrolled in this section.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800 flex items-center justify-between bg-slate-900">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Totals, Percentages & Positions are automatically computed upon saving
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMarksModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingMarks}
                  onClick={handleSaveBatchMarks}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-900/30 transition-all flex items-center gap-2"
                >
                  {isSavingMarks ? <Loader2 size={15} className="animate-spin" /> : <FileCheck size={15} />}
                  Save All Marks & Positions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: PURE WHITE A4 OFFICIAL REPORT CARD (Print-Ready) */}
      {/* ========================================================= */}
      {printingResult && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Top Modal Controls */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Official Progress Report Card Preview
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2"
                >
                  <Printer size={15} /> Print / Save PDF
                </button>
                <button 
                  onClick={() => setPrintingResult(null)} 
                  className="p-1.5 text-slate-500 hover:text-white rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Pure White A4 Canvas (No Dark Bleed) */}
            <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/60 flex justify-center">
              <div 
                id="printable-report-card"
                className="bg-white text-slate-900 w-full max-w-3xl p-8 md:p-10 rounded-2xl shadow-xl space-y-6 font-sans border border-slate-300"
              >
                {/* School Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900">
                    {BRANDING.schoolName || 'THE CITIZENS ACADEMY'}
                  </h1>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                    {BRANDING.tagline || 'Excellence in Modern Education & Character Building'}
                  </p>
                  <div className="mt-3 inline-block bg-slate-900 text-white text-xs font-black uppercase px-6 py-1 rounded-full tracking-widest">
                    OFFICIAL PROGRESS REPORT CARD • {printingResult.examTerm?.name || 'ANNUAL EXAMINATION'}
                  </div>
                </div>

                {/* Student Credentials Grid */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs border border-slate-300">
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[9px] block">Student Full Name</span>
                    <span className="font-black text-slate-900 text-sm uppercase">{printingResult.student?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[9px] block">Registration / Roll No</span>
                    <span className="font-black text-slate-900 text-sm uppercase">#{printingResult.student?.regNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[9px] block">Class & Section</span>
                    <span className="font-bold text-slate-900">Class {printingResult.class?.name} - Section {printingResult.section?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[9px] block">Father's Name</span>
                    <span className="font-bold text-slate-900">{printingResult.student?.fatherName}</span>
                  </div>
                </div>

                {/* Subject Marksheet Table */}
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[10px]">
                      <th className="p-2.5 border border-slate-700 text-center w-10">#</th>
                      <th className="p-2.5 border border-slate-700">Subject Name</th>
                      <th className="p-2.5 border border-slate-700 text-center">Max Marks</th>
                      <th className="p-2.5 border border-slate-700 text-center">Passing</th>
                      <th className="p-2.5 border border-slate-700 text-center">Obtained</th>
                      <th className="p-2.5 border border-slate-700 text-center">Grade</th>
                      <th className="p-2.5 border border-slate-700">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-medium">
                    {printingResult.subjects?.map((sub, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2.5 border border-slate-300 text-center font-bold">{idx + 1}</td>
                        <td className="p-2.5 border border-slate-300 font-bold text-slate-900">{sub.subjectName}</td>
                        <td className="p-2.5 border border-slate-300 text-center">{sub.totalMarks}</td>
                        <td className="p-2.5 border border-slate-300 text-center text-slate-500">{sub.passingMarks || 40}</td>
                        <td className="p-2.5 border border-slate-300 text-center font-black text-slate-900">{sub.obtainedMarks}</td>
                        <td className="p-2.5 border border-slate-300 text-center font-black">{sub.grade}</td>
                        <td className="p-2.5 border border-slate-300 text-slate-600 text-[11px]">{sub.remarks || 'Satisfactory'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 font-black text-slate-900 border-t-2 border-slate-900">
                      <td colSpan={2} className="p-3 text-right uppercase">Grand Total:</td>
                      <td className="p-3 text-center">{printingResult.grandTotal}</td>
                      <td className="p-3 text-center text-slate-500">-</td>
                      <td className="p-3 text-center text-sm">{printingResult.totalObtained}</td>
                      <td colSpan={2} className="p-3 text-center uppercase text-xs">
                        Percentage: <strong>{printingResult.percentage}%</strong> ({printingResult.overallGrade})
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Summary Badges */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <p className="text-[9px] font-bold uppercase text-slate-500">Overall Result</p>
                    <p className={`font-black text-sm uppercase ${printingResult.status === 'Pass' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {printingResult.status}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <p className="text-[9px] font-bold uppercase text-slate-500">Class Position</p>
                    <p className="font-black text-sm uppercase text-slate-900">{printingResult.position || '1st'}</p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <p className="text-[9px] font-bold uppercase text-slate-500">Overall Grade</p>
                    <p className="font-black text-sm uppercase text-slate-900">{printingResult.overallGrade}</p>
                  </div>
                </div>

                {/* Remarks if any */}
                {printingResult.generalRemarks && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs">
                    <strong className="text-slate-800 font-black uppercase text-[9px] block mb-0.5">Faculty Evaluation Remarks:</strong>
                    <p className="text-slate-700 italic">"{printingResult.generalRemarks}"</p>
                  </div>
                )}

                {/* Signatures Footer */}
                <div className="pt-10 grid grid-cols-3 gap-6 text-center text-[10px] font-bold uppercase text-slate-600">
                  <div className="border-t border-slate-400 pt-2">Class Teacher Signature</div>
                  <div className="border-t border-slate-400 pt-2">Examination Controller</div>
                  <div className="border-t border-slate-400 pt-2 font-black text-slate-900">Principal Signature & Stamp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
