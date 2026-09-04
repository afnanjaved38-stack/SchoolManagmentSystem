import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { AuthContext } from '../context/AuthContext';
import { 
  MessageSquareWarning, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  ShieldAlert, 
  Users, 
  GraduationCap, 
  MessageCircle, 
  UserSquare2, 
  Search, 
  Bell, 
  Megaphone,
  CheckCircle,
  Eye,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';

const STUDENT_CATEGORIES = [
  'Academic & Teaching Quality',
  'Bullying & Student Behavior',
  'Discipline & Classroom Issues',
  'Facilities, Washrooms & Cleanliness',
  'Timetable & Schedule Queries',
  'Other'
];

const PARENT_CATEGORIES = [
  'Teacher Communication & Feedback',
  'Transport, Van & Pick/Drop',
  'Fee, Dues & Billing Queries',
  'Child Safety, Health & Discipline',
  'School Infrastructure & Campus Environment',
  'Other'
];

const TEACHER_CATEGORIES = [
  'Workload, Timetable & Substitution Queries',
  'Classroom Discipline & Student Behavior',
  'Salary, Increments & Benefits',
  'Campus Facilities & Teaching Resources',
  'Administrative / Departmental Support',
  'Other'
];

const Complaints = () => {
  const { user } = useContext(AuthContext);
  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Default active tab based on user role
  const [activeTab, setActiveTab] = useState(
    isAdmin ? 'all' : isParent ? 'my-complaints' : isTeacher ? 'to-principal' : 'my-complaints'
  );
  const [filterStatus, setFilterStatus] = useState('all');

  // Viewing Detail Modal State (Click row to open)
  const [viewingComplaint, setViewingComplaint] = useState(null);

  // Submit Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitMode, setSubmitMode] = useState('grievance'); // 'grievance' to principal | 'notice-to-parent'
  const [category, setCategory] = useState(
    isStudent ? STUDENT_CATEGORIES[0] : isParent ? PARENT_CATEGORIES[0] : TEACHER_CATEGORIES[0]
  );
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student directory for Teacher / Admin to select target student
  const [studentsList, setStudentsList] = useState([]);
  const [portalStudent, setPortalStudent] = useState(null);

  // Admin Resolve Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('Resolved');
  const [adminResponse, setAdminResponse] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchComplaints();
    if (isAdmin || isTeacher) {
      fetchStudentsList();
    }
    if (isStudent || isParent) {
      fetchPortalProfile();
    }
  }, [activeTab, filterStatus]);

  const fetchPortalProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/students/portal/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPortalStudent(res.data.student);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudentsList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudentsList(res.data.students || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        let url = `${API_BASE_URL}/api/complaints?`;
        if (activeTab === 'student') url += `role=student&`;
        else if (activeTab === 'parent') url += `role=parent&target=admin&`;
        else if (activeTab === 'teacher') url += `role=teacher&target=admin&`;
        else if (activeTab === 'to-parent') url += `target=parent&`;

        if (filterStatus !== 'all') url += `status=${filterStatus}&`;

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setComplaints(res.data);
      } else {
        const res = await axios.get(`${API_BASE_URL}/api/complaints/my`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setComplaints(res.data);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load complaints');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      return toast.error('Please provide details for the submission.');
    }

    const isSendingToParent = submitMode === 'notice-to-parent';

    if (isSendingToParent && !selectedStudentId) {
      return toast.error('Please select a student to send this notice to their parent.');
    }

    if (!isSendingToParent && category === 'Other' && !customCategory.trim()) {
      return toast.error('Please specify the custom category name.');
    }

    try {
      setIsSubmitting(true);
      const payload = {
        description: description.trim(),
        targetRole: isSendingToParent ? 'parent' : 'admin',
        studentId: isSendingToParent ? selectedStudentId : undefined,
        category: isSendingToParent ? 'Parent Notice / Behavioral Concern' : category,
        customCategory: isSendingToParent ? '' : customCategory
      };

      const res = await axios.post(`${API_BASE_URL}/api/complaints`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(res.data.msg);
      setShowSubmitModal(false);
      setDescription('');
      setCustomCategory('');
      setSelectedStudentId('');
      setStudentSearchQuery('');
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to submit grievance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminUpdate = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      setIsUpdating(true);
      const res = await axios.put(`${API_BASE_URL}/api/complaints/${selectedComplaint._id}/status`, {
        status: updateStatus,
        adminResponse: adminResponse.trim()
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(res.data.msg);
      if (viewingComplaint?._id === selectedComplaint._id) {
        setViewingComplaint({ ...viewingComplaint, status: updateStatus, adminResponse });
      }
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to update grievance status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcknowledgeNotice = async (complaintId) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/api/complaints/${complaintId}/status`, {
        status: 'Acknowledged'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Notice marked as read / acknowledged');
      if (viewingComplaint?._id === complaintId) {
        setViewingComplaint({ ...viewingComplaint, status: 'Acknowledged' });
      }
      fetchComplaints();
    } catch (err) {
      toast.error('Failed to acknowledge notice');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
            <CheckCircle2 size={10} /> Resolved
          </span>
        );
      case 'Acknowledged':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
            <Check size={10} /> Read
          </span>
        );
      case 'Under Review':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
            <Clock size={10} /> Review
          </span>
        );
      case 'Dismissed':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            Dismissed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
            <AlertCircle size={10} /> Pending
          </span>
        );
    }
  };

  // Filter complaints based on active tab
  const filteredComplaints = complaints.filter(item => {
    // 1. Role-specific Tab Filtering
    if (isParent) {
      if (activeTab === 'my-complaints') {
        if (item.targetRole === 'parent') return false; // Hide incoming notices
      } else if (activeTab === 'school-notices') {
        if (item.targetRole !== 'parent') return false; // Only show incoming notices
      }
    } else if (isTeacher) {
      if (activeTab === 'to-principal') {
        if (item.targetRole === 'parent') return false; // Only show to principal
      } else if (activeTab === 'to-parent') {
        if (item.targetRole !== 'parent') return false; // Only show sent to parent
      }
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = item.category?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchUser = item.user?.name?.toLowerCase().includes(q);
      const matchStudent = item.student?.name?.toLowerCase().includes(q) || item.student?.regNo?.toLowerCase().includes(q);
      if (!matchCat && !matchDesc && !matchUser && !matchStudent) return false;
    }

    return true;
  });

  const categoriesList = isStudent ? STUDENT_CATEGORIES : isParent ? PARENT_CATEGORIES : TEACHER_CATEGORIES;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg">
            <MessageSquareWarning size={22} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              {isParent ? 'Parent Inquiries & ' : 'Complaints & '}<span className="text-rose-500">{isParent ? 'Feedback Hub' : 'Grievances Hub'}</span>
            </h1>
            <p className="text-slate-500 mt-1 font-bold uppercase text-[10px] tracking-[0.3em]">
              {isAdmin && 'Principal Redressal System • Centralized Grievances & Parent Notices'}
              {isTeacher && 'Faculty Redressal & Direct Parent Notices'}
              {isStudent && 'Student Voice • Direct Redressal with Administration'}
              {isParent && 'Parent Grievances & Official School Notices'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {(isTeacher || isAdmin) && (
            <button
              onClick={() => {
                setSubmitMode('notice-to-parent');
                setShowSubmitModal(true);
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl uppercase text-[11px] tracking-wider shadow-lg shadow-amber-900/30 transition-all flex items-center gap-1.5"
            >
              <Megaphone size={14} /> Send Notice to Parent
            </button>
          )}

          {!isAdmin && (
            <button
              onClick={() => {
                setSubmitMode('grievance');
                setShowSubmitModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-[11px] tracking-wider shadow-lg shadow-blue-900/30 transition-all flex items-center gap-1.5"
            >
              <Send size={14} /> File Grievance to Principal
            </button>
          )}
        </div>
      </header>

      {/* Filter / Submitter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto custom-scrollbar">
          {isAdmin && [
            { id: 'all', label: 'All Submissions', icon: MessageCircle },
            { id: 'student', label: 'Students', icon: GraduationCap },
            { id: 'parent', label: 'Parents', icon: Users },
            { id: 'teacher', label: 'Teachers', icon: UserSquare2 },
            { id: 'to-parent', label: 'Notices to Parents', icon: Megaphone }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          ))}

          {isParent && [
            { id: 'my-complaints', label: 'My Complaints to School', icon: Send },
            { id: 'school-notices', label: '🔔 Official Notices & Concerns', icon: Bell }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}

          {isTeacher && [
            { id: 'to-principal', label: 'My Grievances to Principal', icon: ShieldAlert },
            { id: 'to-parent', label: 'Notices Sent to Parents', icon: Megaphone }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}

          {isStudent && (
            <div className="px-4 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <GraduationCap size={15} /> Your Grievance Log
            </div>
          )}
        </div>

        {/* Right Search and Status Filter */}
        <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
          <div className="relative flex-grow sm:w-56">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, student, name..."
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:border-blue-500"
            />
          </div>

          {isAdmin && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold uppercase outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          )}
        </div>
      </div>

      {/* Clean High-Density Table List View (Clickable Rows) */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              <th className="py-3.5 px-4 w-28">Date</th>
              <th className="py-3.5 px-4 w-44">
                {isParent && activeTab === 'school-notices' ? 'From Faculty / School' : 'Author / Sender'}
              </th>
              {!isStudent && <th className="py-3.5 px-4 w-48">Student Info</th>}
              <th className="py-3.5 px-4">Subject & Preview</th>
              <th className="py-3.5 px-4 w-32 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-xs font-medium">
            {loading ? (
              <tr>
                <td colSpan={isStudent ? 5 : 6} className="py-16 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                  Loading records...
                </td>
              </tr>
            ) : filteredComplaints.length > 0 ? (
              filteredComplaints.map((item, index) => {
                const isToParent = item.targetRole === 'parent';
                return (
                  <tr 
                    key={item._id}
                    onClick={() => setViewingComplaint(item)}
                    className="hover:bg-slate-950/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 text-center text-slate-600 font-bold text-xs">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-bold text-xs">
                      {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 truncate">
                      {/* Sender Info Badge */}
                      {isParent && activeTab === 'school-notices' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {item.submittedByRole === 'admin' ? 'Principal' : 'Teacher'}
                          </span>
                          <span className="text-white font-bold truncate">
                            {item.teacher?.fullName || (item.submittedByRole === 'admin' ? 'Principal Office' : 'Faculty')}
                          </span>
                        </div>
                      ) : isParent ? (
                        <span className="text-slate-300 font-bold">My Submission</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            item.submittedByRole === 'student' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            item.submittedByRole === 'parent' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            item.submittedByRole === 'teacher' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {isToParent ? 'Notice' : item.submittedByRole}
                          </span>
                          <span className="text-white font-bold truncate">
                            {item.teacher?.fullName || item.user?.name || 'User'}
                          </span>
                        </div>
                      )}
                    </td>
                    {!isStudent && (
                      <td className="py-3.5 px-4 truncate">
                        {item.student ? (
                          <div className="truncate">
                            <span className="text-white font-bold">{item.student.name}</span>
                            <span className="text-slate-500 text-[10px] ml-1">({item.student.class?.name}-{item.student.section?.name})</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px] italic">Faculty Internal</span>
                        )}
                      </td>
                    )}
                    <td className="py-3.5 px-4 truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 font-bold group-hover:text-rose-300 transition-colors whitespace-nowrap">
                          {item.category}:
                        </span>
                        <span className="text-slate-400 truncate">
                          {item.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isStudent ? 5 : 6} className="py-16 text-center text-slate-500 font-bold uppercase tracking-wider">
                  No records found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: VIEW FULL DETAILS POPUP (Opened on row click)    */}
      {/* ========================================================= */}
      {viewingComplaint && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-7 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {viewingComplaint.category}
                  </span>
                  {getStatusBadge(viewingComplaint.status)}
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  {viewingComplaint.targetRole === 'parent' ? 'Official Parent Notice' : 'Grievance Submission'}
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  Date: {new Date(viewingComplaint.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setViewingComplaint(null)} 
                className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-7 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Target & Submitter Info */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Author / Submitter:</span>
                    <span className="font-bold text-white text-xs">
                      {viewingComplaint.teacher?.fullName || (viewingComplaint.submittedByRole === 'admin' ? 'Principal / Administration' : viewingComplaint.user?.name || 'User')} ({viewingComplaint.submittedByRole?.toUpperCase()})
                    </span>
                  </div>
                  {viewingComplaint.student && (
                    <div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Student & Grade:</span>
                      <span className="font-bold text-white text-xs">
                        {viewingComplaint.student.name} (#{viewingComplaint.student.regNo}) • Class {viewingComplaint.student.class?.name}-{viewingComplaint.student.section?.name}
                      </span>
                    </div>
                  )}
                </div>
                {viewingComplaint.student?.fatherName && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Father / Guardian:</span>
                    <span className="font-bold text-slate-300">
                      {viewingComplaint.student.fatherName} • {viewingComplaint.student.phone || 'No phone recorded'}
                    </span>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {viewingComplaint.targetRole === 'parent' ? 'Official Notice Message' : 'Grievance Description'}
                </span>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {viewingComplaint.description}
                </div>
              </div>

              {/* Administration Resolution Note if any */}
              {viewingComplaint.adminResponse && (
                <div className="p-4 bg-blue-950/30 border border-blue-500/20 rounded-2xl space-y-1">
                  <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Administration Official Resolution:
                  </div>
                  <p className="text-slate-300 text-xs italic leading-relaxed">
                    "{viewingComplaint.adminResponse}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                ID: {viewingComplaint._id}
              </span>
              <div className="flex items-center gap-3">
                {/* Parent Mark As Read */}
                {isParent && viewingComplaint.targetRole === 'parent' && viewingComplaint.status !== 'Acknowledged' && (
                  <button
                    onClick={() => handleAcknowledgeNotice(viewingComplaint._id)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5"
                  >
                    <Check size={14} /> Mark as Read / Acknowledged
                  </button>
                )}

                {/* Admin Take Action (Only on Grievances sent to admin) */}
                {isAdmin && viewingComplaint.targetRole === 'admin' && (
                  <button
                    onClick={() => {
                      setSelectedComplaint(viewingComplaint);
                      setUpdateStatus(viewingComplaint.status === 'Pending' ? 'Resolved' : viewingComplaint.status);
                      setAdminResponse(viewingComplaint.adminResponse || '');
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-900/30 transition-all flex items-center gap-1.5"
                  >
                    Take Action / Resolve
                  </button>
                )}

                <button
                  onClick={() => setViewingComplaint(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: SUBMIT GRIEVANCE / SEND NOTICE TO PARENT         */}
      {/* ========================================================= */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-7 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  {submitMode === 'notice-to-parent' ? 'Send Notice / Concern to Parent' : 'File Grievance to Principal'}
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
                  {submitMode === 'notice-to-parent' ? 'Direct communication to student guardian' : 'Direct confidential submission to administration'}
                </p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-7 space-y-5">
              {submitMode === 'notice-to-parent' ? (
                /* Live Search Student for Parent Notice */
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Search & Select Target Student / Child
                  </label>
                  
                  {selectedStudentId ? (
                    (() => {
                      const selectedStudent = studentsList.find(s => s._id === selectedStudentId);
                      return (
                        <div className="bg-slate-950 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                              <GraduationCap size={20} />
                            </div>
                            <div>
                              <div className="font-black text-white text-xs uppercase flex items-center gap-2">
                                <span>{selectedStudent?.name}</span>
                                <span className="text-[10px] text-slate-500 font-bold">#{selectedStudent?.regNo}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                                Class {selectedStudent?.class?.name} - {selectedStudent?.section?.name} • Father: <span className="text-slate-200">{selectedStudent?.fatherName}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentId('');
                              setStudentSearchQuery('');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Change
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search student by name, roll no, father name..."
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-3 rounded-2xl outline-none font-bold text-xs focus:border-amber-500"
                        />
                      </div>
                      
                      {/* Search Results list */}
                      <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
                        {studentsList
                          .filter(s => {
                            if (!studentSearchQuery.trim()) return true;
                            const q = studentSearchQuery.toLowerCase();
                            return s.name?.toLowerCase().includes(q) ||
                                   s.regNo?.toLowerCase().includes(q) ||
                                   s.fatherName?.toLowerCase().includes(q) ||
                                   s.class?.name?.toLowerCase().includes(q);
                          })
                          .slice(0, 8)
                          .map(s => (
                            <div
                              key={s._id}
                              onClick={() => setSelectedStudentId(s._id)}
                              className="p-2.5 px-3 hover:bg-slate-800/80 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <div className="font-black text-white uppercase text-xs">
                                  {s.name} <span className="text-[10px] text-slate-500">#{s.regNo}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold">
                                  Class {s.class?.name} - {s.section?.name} • Father: {s.fatherName}
                                </div>
                              </div>
                              <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                Select
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Category for Grievance to Principal */
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Issue Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-2xl outline-none font-bold text-xs cursor-pointer"
                    >
                      {categoriesList.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {category === 'Other' && (
                    <div className="space-y-2 animate-in fade-in">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Category Name</label>
                      <input
                        type="text"
                        required
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="e.g. Canteen Food, Sports, Facility..."
                        className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-2xl outline-none font-bold text-xs"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {submitMode === 'notice-to-parent' ? 'Notice / Concern Details for Parent' : 'Grievance Description'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    submitMode === 'notice-to-parent'
                      ? 'Write concern, academic feedback, or behavioral notice to the parent (e.g. Incomplete homework, classroom misbehavior, uniform issue)...'
                      : 'Please describe the incident, query, or problem in detail...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-2xl outline-none font-medium text-xs leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full ${
                  submitMode === 'notice-to-parent' 
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30' 
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                } text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2`}
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitMode === 'notice-to-parent' ? 'Send Notice to Parent Portal' : 'Submit Grievance to Principal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADMIN RESOLVE / ACTION MODAL                     */}
      {/* ========================================================= */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-7 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Principal Resolution</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">Update status & official response</p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdminUpdate} className="p-7 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resolution Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-2xl outline-none font-bold text-xs cursor-pointer"
                >
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Acknowledged">Acknowledged</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Response Note (Sent to Submitter)</label>
                <textarea
                  rows={4}
                  required
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Explain actions taken by the administration or resolution verdict..."
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3.5 rounded-2xl outline-none font-medium text-xs leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm & Save Resolution
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
