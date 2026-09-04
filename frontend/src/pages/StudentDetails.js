import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import BRANDING from '../branding';
import {
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  Phone, 
  MapPin, 
  CheckCircle2,
  Download,
  Printer,
  User,
  User2,
  Edit2,
  X,
  ShieldCheck,
  Wallet,
  Receipt,
  History,
  Trash2,
  Filter,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Sliders,
  Plus,
  Percent,
  Gift,
  RefreshCw
} from 'lucide-react';
import { generateFeeVoucher } from '../utils/feeVoucherGenerator';
import { AuthContext } from '../context/AuthContext';
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

const EditInput = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">{label}</label>
    <input 
      type={type}
      className={`w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-600/50 outline-none transition-all placeholder:text-slate-700 font-bold`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const DetailItem = ({ label, value, color = 'text-white' }) => (
  <div className="group">
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] mb-1">{label}</div>
    <div className={`text-sm font-black ${color} uppercase tracking-tight group-hover:text-blue-400 transition-colors`}>{value || 'N/A'}</div>
  </div>
);

const SidebarValueItem = ({ icon, label, value, color }) => (
  <div className="flex items-center gap-4 p-3 hover:bg-slate-800/30 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-slate-800">
    <div className={`w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-slate-500 group-hover:${color} group-hover:bg-slate-900 transition-all border border-slate-800 shadow-inner shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">{label}</div>
      <div className={`text-[13px] font-bold ${color || 'text-slate-200'} truncate`}>{value}</div>
    </div>
  </div>
);

const formatYearMonth = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'details');
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const getKarachiDate = () => {
    const now = new Date();
    const karachiOffset = 5 * 60; // Karachi is UTC+5
    const localTime = now.getTime() + (now.getTimezoneOffset() + karachiOffset) * 60000;
    return new Date(localTime);
  };

  const [attMonthFilter, setAttMonthFilter] = useState(getKarachiDate().toISOString().slice(0, 7)); // YYYY-MM
  const [payYearFilter, setPayYearFilter] = useState(getKarachiDate().getFullYear().toString());
  const [perfRange, setPerfRange] = useState({
    start: (() => {
      const d = getKarachiDate();
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 7);
    })(),
    end: getKarachiDate().toISOString().slice(0, 7)
  });
  const [perfData, setPerfData] = useState([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Finance Enhancement States
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementFilters, setStatementFilters] = useState({
    startMonth: getKarachiDate().toISOString().slice(0, 7),
    endMonth: getKarachiDate().toISOString().slice(0, 7),
    showOnlyDues: false
  });
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);
  const [isReversing, setIsReversing] = useState(false);
  const [voucherSettings, setVoucherSettings] = useState({ showFullFee: true, showPreviousDues: false });

  // Fee Adjustment & Waiver Modal States
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingRecord, setAdjustingRecord] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    amount: 0,
    discount: 0,
    concession: 0,
    adjustment: 0,
    waiverReason: '',
    description: ''
  });
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Single Charge / Manual Ledger Entry Modal
  const [showSingleChargeModal, setShowSingleChargeModal] = useState(false);
  const [singleChargeForm, setSingleChargeForm] = useState({
    type: 'Monthly Fees',
    month: getKarachiDate().toISOString().slice(0, 7),
    amount: '',
    discount: 0,
    concession: 0,
    adjustment: 0,
    description: '',
    waiverReason: ''
  });
  const [isSubmittingSingleCharge, setIsSubmittingSingleCharge] = useState(false);

  // Portal Access States
  const [portalAccounts, setPortalAccounts] = useState({ studentAccount: null, parentAccount: null });
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAiInsights, setLoadingAiInsights] = useState(false);
  const [studentPortalUser, setStudentPortalUser] = useState('');
  const [studentPortalPass, setStudentPortalPass] = useState('');
  const [isStudentPassRevealed, setIsStudentPassRevealed] = useState(false);
  const [isSavingStudentPortal, setIsSavingStudentPortal] = useState(false);
  const [parentPortalUser, setParentPortalUser] = useState('');
  const [parentPortalPass, setParentPortalPass] = useState('');
  const [isParentPassRevealed, setIsParentPassRevealed] = useState(false);
  const [isSavingParentPortal, setIsSavingParentPortal] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const [activeAcademicYear, setActiveAcademicYear] = useState(null);

  useEffect(() => {
    fetchStudentData();
    fetchActiveAcademicYear();
    fetchAiInsights();
  }, [id]);

  const fetchAiInsights = async () => {
    try {
      setLoadingAiInsights(true);
      const res = await axios.get(`${API_BASE_URL}/api/ai/student/insights/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAiInsights(res.data);
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setLoadingAiInsights(false);
    }
  };

  const fetchActiveAcademicYear = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/academic-years/active`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data) {
        setActiveAcademicYear(res.data);
        const startM = formatYearMonth(res.data.startDate);
        const endM = formatYearMonth(res.data.endDate);
        setPerfRange({ start: startM, end: endM });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isEditModalOpen) {
      fetchClasses();
      if (editForm?.class?._id || editForm?.class) {
        fetchSections(editForm.class._id || editForm.class);
      }
    }
  }, [isEditModalOpen]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (Array.isArray(res.data)) {
        setClasses(res.data);
      } else {
        setClasses([]);
      }
    } catch (err) {
      console.error('Failed to fetch classes');
      setClasses([]);
    }
  };

  const fetchSections = async (classId) => {
    try {
      if (!classId) return;
      const res = await axios.get(`${API_BASE_URL}/api/classes/${classId}/sections`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (Array.isArray(res.data)) {
        setSections(res.data);
      } else {
        console.error('Sections data is not an array:', res.data);
        setSections([]);
      }
    } catch (err) {
      console.error('Failed to fetch sections');
      setSections([]);
    }
  };

  useEffect(() => {
    fetchStudentData();
    fetchClasses();
    // Fetch voucher settings
    const fetchVoucherSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setVoucherSettings({ showFullFee: res.data.showFullFeeOnVoucher !== false, showPreviousDues: res.data.showPreviousDuesOnVoucher === true });
      } catch (err) { console.error(err); }
    };
    fetchVoucherSettings();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (editForm?.class) {
      fetchSections(editForm.class);
    }
    // eslint-disable-next-line
  }, [editForm?.class]);

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line
  }, [id, attMonthFilter]);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line
  }, [id, payYearFilter]);

  useEffect(() => {
    if (activeTab === 'performance') {
       fetchPerformanceData();
    }
    if (activeTab === 'portal') {
       fetchPortalCredentials();
    }
    // eslint-disable-next-line
  }, [id, activeTab, perfRange]);

  const fetchPortalCredentials = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/students/${id}/credentials`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPortalAccounts(res.data);
      if (res.data.studentAccount) {
        setStudentPortalUser(res.data.studentAccount.email);
        setStudentPortalPass(res.data.studentAccount.plainPassword || '');
      } else if (student?.regNo) {
        setStudentPortalUser(`${student.regNo.toLowerCase()}@school.com`);
      }

      if (res.data.parentAccount) {
        setParentPortalUser(res.data.parentAccount.email);
        setParentPortalPass(res.data.parentAccount.plainPassword || '');
      } else if (student?.regNo) {
        setParentPortalUser(`p.${student.regNo.toLowerCase()}@school.com`);
      }
    } catch (err) {
      console.error('Failed to fetch portal credentials', err);
    }
  };

  const handleGenerateRandomPass = (type) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (type === 'student') {
      setStudentPortalPass(pass);
      setIsStudentPassRevealed(true);
    } else {
      setParentPortalPass(pass);
      setIsParentPassRevealed(true);
    }
  };

  const handleSaveCredential = async (type) => {
    const isStudent = type === 'student';
    const email = isStudent ? studentPortalUser : parentPortalUser;
    const password = isStudent ? studentPortalPass : parentPortalPass;
    if (!email || !password) {
      return toast.error('Please provide both username/email and password');
    }
    try {
      if (isStudent) setIsSavingStudentPortal(true);
      else setIsSavingParentPortal(true);

      const res = await axios.post(`${API_BASE_URL}/api/students/${id}/credentials`, {
        type,
        email: email.trim(),
        password
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(res.data.msg);
      fetchPortalCredentials();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to save credentials');
    } finally {
      if (isStudent) setIsSavingStudentPortal(false);
      else setIsSavingParentPortal(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.info(`Copied ${fieldName} to clipboard`);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const fetchStudentData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/students/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudent(res.data);
      setEditForm({
        ...res.data,
        class: res.data.class?._id || '',
        section: res.data.section?._id || ''
      });
    } catch (err) {
      toast.error('Failed to fetch student details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/attendance/summary`, {
        params: { 
          studentId: id,
          startMonth: perfRange.start,
          endMonth: perfRange.end
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPerfData(res.data || []);
    } catch (err) {
      console.error(err);
      setPerfData([]);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/api/students/${id}`, editForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Profile updated successfully');
      setIsEditModalOpen(false);
      fetchStudentData();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const fetchAttendance = async () => {
    try {
      const [year, month] = attMonthFilter.split('-');
      const res = await axios.get(`${API_BASE_URL}/api/attendance/student/${id}`, {
        params: { month: Number(month), year: Number(year) },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAttendance(res.data || []);
    } catch (err) {
      console.error(err);
      setAttendance([]);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/finance/student/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPayments(res.data || []);
    } catch (err) {
      console.error(err);
      setPayments([]);
    }
  };

  const handlePayFee = (record) => {
    setSelectedRecord(record);
    setPayAmount(record.balance || record.totalAmount);
    setShowPayModal(true);
  };

  const submitPayment = async () => {
    try {
      if (!payAmount || payAmount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      
      const res = await axios.patch(`${API_BASE_URL}/api/finance/pay/${selectedRecord._id}`, {
        amount: Number(payAmount)
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      toast.success('Cash received and ledger updated');
      setShowPayModal(false);
      
      // Auto-trigger receipt print for this transaction
      const lastHistory = res.data.paymentHistory[res.data.paymentHistory.length - 1];
      printInvoice(res.data, lastHistory);
      
      fetchPayments();
      fetchStudentData(); // Refresh dues in sidebar
    } catch (err) {
      toast.error('Payment failed. Try again.');
    }
  };

  const handlePrintFullStatement = () => {
    setShowStatementModal(true);
  };

  const executeStatementPrint = () => {
    // Generate filtered list
    let filtered = payments.filter(p => {
      const pDate = p.month; // YYYY-MM
      const isInRange = pDate >= statementFilters.startMonth && pDate <= statementFilters.endMonth;
      if (!isInRange) return false;
      if (statementFilters.showOnlyDues && p.balance <= 0) return false;
      return true;
    });

    printStatement(filtered, statementFilters);
    setShowStatementModal(false);
  };

  const handleOpenAdjustModal = (record) => {
    setAdjustingRecord(record);
    setAdjustForm({
      amount: record.amount !== undefined ? record.amount : (record.totalAmount || 0),
      discount: record.discount || 0,
      concession: record.concession || 0,
      adjustment: record.adjustment || 0,
      waiverReason: record.waiverReason || '',
      description: record.description || ''
    });
    setShowAdjustModal(true);
  };

  const handleQuickWaive = async (recordId, reason) => {
    try {
      setIsSubmittingAdjust(true);
      await axios.patch(`${API_BASE_URL}/api/finance/waive/${recordId}`, {
        waiverReason: reason || 'Principal Full Fee Waiver'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Fee balance waived successfully');
      setShowAdjustModal(false);
      if (selectedPaymentDetail && selectedPaymentDetail._id === recordId) {
        setSelectedPaymentDetail(null);
      }
      fetchPayments();
      fetchStudentData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to waive fee');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (!adjustingRecord) return;
    try {
      setIsSubmittingAdjust(true);
      const res = await axios.patch(`${API_BASE_URL}/api/finance/adjust/${adjustingRecord._id}`, adjustForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(res.data.msg || 'Fee record updated successfully');
      setShowAdjustModal(false);
      if (selectedPaymentDetail && selectedPaymentDetail._id === adjustingRecord._id) {
        setSelectedPaymentDetail(res.data.record);
      }
      fetchPayments();
      fetchStudentData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to adjust fee');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleSubmitSingleCharge = async (e) => {
    e.preventDefault();
    if (!singleChargeForm.amount || Number(singleChargeForm.amount) < 0) {
      return toast.error('Please enter a valid base amount');
    }
    try {
      setIsSubmittingSingleCharge(true);
      const res = await axios.post(`${API_BASE_URL}/api/finance/single-charge`, {
        studentId: id,
        ...singleChargeForm
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Fee charge added to ledger');
      setShowSingleChargeModal(false);
      setSingleChargeForm({
        type: 'Monthly Fees',
        month: getKarachiDate().toISOString().slice(0, 7),
        amount: '',
        discount: 0,
        concession: 0,
        adjustment: 0,
        description: '',
        waiverReason: ''
      });
      fetchPayments();
      fetchStudentData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to add charge');
    } finally {
      setIsSubmittingSingleCharge(false);
    }
  };

  const handleRemoveTransaction = async (recordId, paymentId) => {
    if (!window.confirm('Are you sure you want to reverse this payment? The amount will be added back to the student dues.')) return;
    
    setIsReversing(true);
    try {
      await axios.patch(`${API_BASE_URL}/api/finance/payment/remove/${recordId}/${paymentId}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Payment reversed successfully');
      fetchPayments();
      fetchStudentData();
      // Update local state if detail modal is open
      if (selectedPaymentDetail) {
        const updated = payments.find(p => p._id === recordId);
        // This might be tricky since find returns current state. Better to close or re-fetch.
        setSelectedPaymentDetail(null);
      }
    } catch (err) {
      toast.error('Reversal failed');
    } finally {
      setIsReversing(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('CRITICAL: Delete this entire fee entry? This cannot be undone and only completely UNPAID records can be deleted.')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/api/finance/${recordId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Record deleted');
      fetchPayments();
      fetchStudentData();
      setSelectedPaymentDetail(null);
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const printInvoice = (invoiceData, payment = null) => {
    // For single invoice print, we show it like a statement but focused on this one record
    printStatement([invoiceData], { startMonth: invoiceData.month, endMonth: invoiceData.month });
  };

  const printStatement = (records, filters) => {
    const style = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 30px; color: #000; background: #fff; line-height: 1.4; }
        .statement-card { max-width: 900px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.02); }
        
        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #000; padding-bottom: 25px; margin-bottom: 30px; }
        .logo-container { display: flex; align-items: center; gap: 20px; }
        .logo-mark { width: 80px; height: 80px; border-radius: 50%; background: #fff; border: 2px solid #2563eb; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: #2563eb; flex-shrink: 0; }
        .school-name { font-size: 22px; font-weight: 900; text-transform: uppercase; color: #000; line-height: 1.1; }
        .school-motto { font-size: 11px; font-weight: 700; color: #000; text-transform: uppercase; margin-top: 5px; letter-spacing: 1px; }
        .school-details { font-size: 10px; font-weight: 600; color: #000; margin-top: 4px; }
        
        .report-label { text-align: right; }
        .report-title { font-size: 10px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
        .report-date { font-size: 14px; font-weight: 800; color: #000; }

        .student-info { margin-bottom: 35px; background: #fcfcfc; padding: 25px; border-radius: 15px; border: 1px solid #f0f0f0; display: grid; grid-template-cols: 1fr 1fr; gap: 15px 40px; }
        .info-row { display: flex; align-items: baseline; gap: 10px; }
        .info-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #000; min-width: 120px; }
        .info-value { font-size: 12px; font-weight: 700; color: #000; border-bottom: 1px dotted #ccc; flex: 1; padding-bottom: 2px; }
        
        .ledger-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .ledger-table th { text-align: left; padding: 14px 12px; font-size: 10px; text-transform: uppercase; background: #000; color: #fff; font-weight: 900; letter-spacing: 1px; }
        .ledger-table td { padding: 14px 12px; font-size: 11px; border-bottom: 1px solid #f0f0f0; font-weight: 700; color: #000; }
        .ledger-table tr:hover { background: #f9f9f9; }
        
        .footer-grid { display: grid; grid-template-cols: 1.5fr 1fr; gap: 40px; align-items: end; }
        .dues-card { background: #000; color: #fff; padding: 25px; border-radius: 15px; text-align: center; }
        .dues-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; color: #eee; }
        .dues-amount { font-size: 32px; font-weight: 900; }

        .note-section { padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
        .note-title { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #000; margin-bottom: 8px; display: flex; align-items: center; gap: 5px; }
        .note-text { font-size: 10px; color: #000; line-height: 1.6; font-weight: 500; }
        
        .bottom-tag { margin-top: 50px; text-align: center; font-size: 9px; font-weight: 800; color: #000; text-transform: uppercase; letter-spacing: 4px; border-top: 1px solid #eee; padding-top: 20px; }
        
        @media print { 
          body { padding: 0; } 
          .statement-card { border: none; padding: 0; box-shadow: none; } 
          .ledger-table th { background: #000 !important; color: #fff !important; print-color-adjust: exact; }
          .dues-card { background: #000 !important; color: #fff !important; print-color-adjust: exact; }
          .info-value, .ledger-table td, .note-text, .school-details { color: #000 !important; }
        }
      </style>
    `;

    // Process Records
    const finalRows = records.map(r => {
        const lastPaymentDate = r.paymentHistory && r.paymentHistory.length > 0 
            ? new Date(r.paymentHistory[r.paymentHistory.length - 1].date)
            : new Date(r.createdAt || (r.month + '-01'));
            
        return {
            date: lastPaymentDate,
            month: r.month,
            description: r.type === 'Other' ? (r.description || 'Custom Fee') : 'Monthly Tuition Fee',
            charges: r.totalAmount || 0,
            paid: r.paidAmount || 0,
            balance: r.balance || 0,
            status: r.status
        };
    });

    const totalBalance = finalRows.reduce((sum, row) => sum + row.balance, 0);

    const content = `
      <div class="statement-card">
        <div class="header">
           <div class="logo-container">
              <div class="logo-mark">${BRANDING.logoText}</div>
              <div>
                 <div class="school-name">${BRANDING.schoolDisplayName}</div>
                 <div class="school-motto">${BRANDING.motto}</div>
                 <div class="school-details">${BRANDING.schoolAddress}</div>
                 <div class="school-details">Tel: ${BRANDING.schoolPhone} | ${BRANDING.schoolEmail}</div>
              </div>
           </div>
           <div class="report-label">
              <div class="report-title">Account Statement</div>
              <div class="report-date">${new Date().toLocaleDateString('en-GB')}</div>
              <div style="font-size: 8px; font-weight: 800; color: #666; margin-top: 5px; font-style: italic;">
                Period: ${new Date(filters.startMonth + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} - 
                        ${new Date(filters.endMonth + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </div>
           </div>
        </div>

        <div class="student-info">
           <div class="info-row"><span class="info-label">Student Name:</span> <span class="info-value">${student.name}</span></div>
           <div class="info-row"><span class="info-label">Father Name:</span> <span class="info-value">${student.fatherName}</span></div>
           <div class="info-row"><span class="info-label">Registration No:</span> <span class="info-value">${student.regNo}</span></div>
           <div class="info-row"><span class="info-label">Current Class:</span> <span class="info-value">${student.class?.name}</span></div>
           <div class="info-row"><span class="info-label">Section Name:</span> <span class="info-value">${student.section?.name || 'A'}</span></div>
        </div>

        <table class="ledger-table">
           <thead>
              <tr>
                 <th>Last Payment Date</th>
                 <th>Month</th>
                 <th>Description</th>
                 <th>Total Charges</th>
                 <th>Paid Amount</th>
                 <th>Status</th>
                 <th style="text-align: right">Remaining Balance</th>
              </tr>
           </thead>
           <tbody>
              ${finalRows.map(r => `
                <tr>
                   <td>${r.date.toLocaleDateString('en-GB')}</td>
                   <td style="text-transform: uppercase;">${new Date(r.month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</td>
                   <td style="font-weight: 700;">${r.description}</td>
                   <td>Rs. ${r.charges.toLocaleString()}</td>
                   <td>Rs. ${r.paid.toLocaleString()}</td>
                   <td style="text-transform: uppercase; font-size: 9px; font-weight: 900; color: ${r.status === 'Paid' ? '#059669' : '#e11d48'}">${r.status}</td>
                   <td style="text-align: right; font-weight: 900;">Rs. ${r.balance.toLocaleString()}</td>
                </tr>
              `).join('')}
           </tbody>
        </table>

        <div class="footer-grid">
           <div class="note-section">
              <div class="note-title">Important Note:</div>
              <div class="note-text">
                Please ensure all monthly payments are made by the 10th of each month. Late dues may incur a penalty fee. This is a computer-generated account statement and does not require a physical signature. For any discrepancies, please visit the school office.
              </div>
           </div>
           <div class="dues-card">
              <div class="dues-label">Remaining Dues / Balance</div>
              <div class="dues-amount">Rs. ${totalBalance.toLocaleString()}</div>
           </div>
        </div>

        <div class="bottom-tag">
           ${BRANDING.fullProductLabel} · ${BRANDING.poweredBy}
        </div>
      </div>
    `;

    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Statement_${student.name}</title>${style}</head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Loading Profile...</div>;
  if (!student) return <div className="p-10 text-center text-red-500 font-bold">Student not found.</div>;
  const monthlyFee = (student.class?.fees?.monthlyTuition || 0) - (student.discount || 0);

  const isAdmin = user?.role === 'admin';

  const tabs = [
    { id: 'details', label: 'Details', icon: <User2 size={18} /> },
    { id: 'attendance', label: 'Attendance', icon: <Calendar size={18} /> },
    isAdmin && { id: 'payments', label: 'Fee History', icon: <CreditCard size={18} /> },
    { id: 'performance', label: 'Performance', icon: <TrendingUp size={18} /> },
    isAdmin && { id: 'portal', label: 'Portal Access', icon: <KeyRound size={18} /> },
    { id: 'ai-insights', label: 'AI Learning Insights', icon: <Sparkles size={18} /> }
  ].filter(Boolean);

  const handleStatusChange = async (newStatus) => {
    try {
      setIsUpdatingStatus(true);
      await axios.put(`${API_BASE_URL}/api/students/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudent({ ...student, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteStudent = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(`${API_BASE_URL}/api/students/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Student marked as deleted/inactive');
      setShowDeleteModal(false);
      navigate('/students'); // Redirect back to list after successful deletion
    } catch (err) {
      toast.error('Failed to delete student');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20 px-1 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              Student <span className="text-blue-500">Profile</span>
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
              <span className="text-white">#{student.regNo}</span>
              <span className="text-slate-800">•</span>
              <span>{student.name}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            disabled={isUpdatingStatus}
            value={student.status || 'Active'}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-lg outline-none cursor-pointer transition-all ${
              student.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              student.status === 'Inactive' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
              student.status === 'Expelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
              student.status === 'Passed Out' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
              'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}
          >
            <option value="Active" className="bg-slate-900 text-white">Active</option>
            <option value="Inactive" className="bg-slate-900 text-white">Inactive</option>
            <option value="Expelled" className="bg-slate-900 text-white">Expelled</option>
            <option value="Passed Out" className="bg-slate-900 text-white">Passed Out</option>
          </select>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Edit2 size={14} className="inline mr-2" /> Edit Profile
            </button>
          )}
          {user?.role === 'admin' && (
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 hover:text-red-500 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Trash2 size={14} className="inline mr-2" /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Profile Card & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Summary Card (Only on Details Tab) */}
        {activeTab === 'details' && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
              {/* Background Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] -mr-16 -mt-16 transition-colors ${student.gender === 'Female' ? 'bg-pink-500/20' : 'bg-blue-500/20'}`}></div>

              <div className="relative z-10 text-center">
                <div className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center border-4 border-slate-950 shadow-2xl transition-transform duration-500 group-hover:scale-105 ${
                  student.gender?.toLowerCase() === 'female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-600/10 text-blue-500'
                }`}>
                  {student.gender?.toLowerCase() === 'female' ? <User2 size={64} /> : <User size={64} />}
                </div>
                
                <h2 className="mt-6 text-2xl font-black text-white">{student.name}</h2>
                <div className="flex items-center justify-center gap-2 text-slate-500 mt-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-sm font-bold uppercase tracking-wider">{student.fatherName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                <div className="bg-slate-950/80 p-5 rounded-3xl border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase mb-1">
                     <Calendar size={10} className="text-emerald-500" /> Attendance
                  </div>
                  <div className="text-2xl font-black text-emerald-400">{student.attendanceRate}%</div>
                </div>
                {user?.role === 'admin' && (
                  <div className="bg-slate-950/80 p-5 rounded-3xl border border-slate-800/80 hover:border-red-500/30 transition-colors">
                    <div className="flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase mb-1">
                       <Wallet size={10} className="text-red-500" /> Total Dues
                    </div>
                    <div className="text-2xl font-black text-red-500">
                       {student.totalDues}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-3">
                {user?.role === 'admin' && (
                  <>
                    <SidebarValueItem 
                      icon={<Receipt size={16} />} 
                      label="Fee Structure (Monthly)" 
                      value={
                        <div className="flex items-center gap-1 font-bold">
                          <span className="text-slate-400 font-medium">{(student.class?.fees?.monthlyTuition || 0)}</span>
                          <span className="text-slate-600 font-medium">-</span>
                          <span className="text-slate-500 font-medium">{student.discount || 0}</span>
                          <span className="text-slate-600 mx-1">=</span>
                          <span className="text-emerald-500 font-black">{monthlyFee}</span>
                        </div>
                      } 
                      color="text-emerald-500" 
                    />
                    <div className="h-px bg-slate-800/50 my-4"></div>
                  </>
                )}
                <SidebarValueItem icon={<MapPin size={16} />} label="Address" value={student.address || 'No Address'} color="text-slate-300" />
                <SidebarValueItem icon={<Phone size={16} />} label="Primary Phone" value={student.phone} color="text-blue-400" />
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Tabbed Content (Conditional Width) */}
        <div className={`${activeTab === 'details' ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
          {/* Custom Tabs */}
          <div className="bg-slate-950/50 p-1.5 rounded-[1.5rem] border border-slate-800 flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold transition-all ${
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
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden min-h-[500px]">
            {activeTab === 'details' && (
              <div className="p-10 space-y-12 animate-in fade-in slide-in-from-bottom-2">
                {/* Personal Information */}
                <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/60 space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-800/50 pb-5">
                    <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                      <User size={16} /> Personal Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                    <DetailItem label="Full Name" value={student.name} />
                    <DetailItem label="Father Name" value={student.fatherName} />
                    <DetailItem label="Phone Number" value={student.phone} color="text-blue-400" />
                    {user?.role === 'admin' && (
                      <>
                        <DetailItem label="Date of Birth" value={new Date(student.dob).toLocaleDateString()} />
                        <DetailItem label="Age" value={`${calculateAge(student.dob)} Years`} />
                        <DetailItem label="Gender" value={student.gender} />
                        <div className="md:col-span-2 lg:col-span-3">
                            <DetailItem label="Residential Address" value={student.address} />
                        </div>
                        <DetailItem label="Religion" value={student.religion} />
                        <DetailItem label="Cast" value={student.cast} />
                        <DetailItem label="B-Form / CNIC" value={student.bForm} />
                        <DetailItem label="Father CNIC" value={student.fatherCnic} />
                      </>
                    )}
                  </div>
                </div>

                {/* Academic Information */}
                <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/60 space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-800/50 pb-5">
                    <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={16} /> Academic Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                    <DetailItem label="Registration #" value={student.regNo} />
                    <DetailItem label="Current Class" value={student.class?.name} />
                    <DetailItem label="Section" value={student.section?.name} />
                  </div>
                </div>

                {/* Financial Status */}
                {user?.role === 'admin' && (
                  <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/60 space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-800/50 pb-5">
                      <h3 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                        <Wallet size={16} /> Financial Status
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                        <DetailItem label="Admission Date" value={new Date(student.admissionDate).toLocaleDateString()} />
                        <DetailItem label="Monthly Discount" value={student.discount} />
                        <DetailItem label="Admission Fee" value={student.admissionFeePaid ? "Fully Paid" : "Pending"} color={student.admissionFeePaid ? "text-emerald-400" : "text-amber-400"} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                   <div className="px-2">
                      <h4 className="text-sm font-black text-blue-500 uppercase tracking-widest">Monthly Attendance</h4>
                      <p className="text-[10px] text-slate-600 font-bold uppercase mt-1 tracking-tighter">View and verify monthly presence logs</p>
                   </div>
                   <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 pr-4 rounded-2xl w-full md:w-auto">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 whitespace-nowrap">Select Month</label>
                      <input 
                        type="month"
                        className="bg-slate-950 border border-slate-800 text-white px-5 py-2 rounded-xl outline-none text-xs font-bold focus:border-blue-500/50 transition-all font-bold w-full md:w-auto min-w-[140px]"
                        value={attMonthFilter}
                        onChange={e => setAttMonthFilter(e.target.value)}
                      />
                   </div>
                </div>
                
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="border-b border-slate-800">
                         <th className="py-4 font-bold text-slate-500 text-xs uppercase">Date</th>
                         <th className="py-4 font-bold text-slate-500 text-xs uppercase">Marked By</th>
                         <th className="py-4 font-bold text-slate-500 text-xs uppercase">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800">
                       {attendance.length > 0 ? attendance.map((at, idx) => (
                         <tr key={idx} className="hover:bg-slate-800/20 transition-all">
                           <td className="py-4 text-sm text-slate-300 font-bold">{new Date(at.date).toDateString()}</td>
                           <td className="py-4 text-sm text-slate-500 font-medium">
                              {at.isPadding ? (
                                <span className="text-slate-700 italic">No Entry</span>
                              ) : (
                                at.markedBy?.name || (typeof at.markedBy === 'string' ? at.markedBy : 'System')
                              )}
                           </td>
                           <td className="py-4">
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                                at.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' :
                                at.status === 'Absent' ? 'bg-red-500/10 text-red-500' :
                                at.status === 'Leave' || at.status === 'Half Leave' ? 'bg-amber-500/10 text-amber-500' :
                                (at.status === 'Holiday' || at.status === 'Sunday') ? 'bg-indigo-500/10 text-indigo-500' :
                                at.status === 'Late' ? 'bg-sky-500/10 text-sky-500' :
                                at.status === 'Not Marked' ? 'bg-slate-500/10 text-slate-500' :
                                'bg-fuchsia-500/10 text-fuchsia-500'
                              }`}>
                                {at.status}
                              </span>
                           </td>
                         </tr>
                       )) : (
                         <tr><td colSpan="3" className="py-10 text-center text-slate-500">No attendance records found.</td></tr>
                       )}
                     </tbody>
                   </table>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (() => {
              const lifetimeTotalDues = payments.reduce((sum, p) => sum + (p.balance || 0), 0);
              let sessionPayments = payments;
              if (activeAcademicYear?.startDate && activeAcademicYear?.endDate) {
                const startM = formatYearMonth(activeAcademicYear.startDate);
                const endM = formatYearMonth(activeAcademicYear.endDate);
                sessionPayments = payments.filter(p => p.month && p.month >= startM && p.month <= endM);
              }
              const sessionTotalInvoiced = sessionPayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
              const sessionTotalPaid = sessionPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

              return (
                <div className="p-0">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-8 border-b border-slate-800 bg-slate-950/20">
                    <div className="px-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">Financial Ledger</h3>
                        {activeAcademicYear && (
                          <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[9px] font-black uppercase tracking-wider">
                            {activeAcademicYear.name} Session
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 tracking-tighter">Complete billing history, concessions, and payment records</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowSingleChargeModal(true)}
                        className="text-emerald-400 hover:text-emerald-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-500/30 px-4 py-2.5 rounded-2xl bg-emerald-950/40 shadow-xl transition-all hover:bg-emerald-900/50"
                      >
                        <Plus size={14} /> Add Charge / Fee
                      </button>
                      <button 
                        type="button"
                        onClick={handlePrintFullStatement}
                        className="text-blue-500 hover:text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-blue-500/20 px-5 py-2.5 rounded-2xl bg-slate-900 shadow-xl"
                      >
                        <Download size={14} /> Statement
                      </button>
                    </div>
                  </div>

                  {/* 3 Metric Cards for Principal Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-slate-950/40 border-b border-slate-800/60">
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Session Invoiced ({activeAcademicYear?.name || 'Current'})</div>
                      <div className="text-xl font-black text-white mt-1">Rs. {sessionTotalInvoiced.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Session Paid ({activeAcademicYear?.name || 'Current'})</div>
                      <div className="text-xl font-black text-emerald-400 mt-1">Rs. {sessionTotalPaid.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Outstanding Dues (All Sessions)</div>
                      <div className={`text-xl font-black mt-1 ${lifetimeTotalDues > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        Rs. {lifetimeTotalDues.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-950/30 border-b border-slate-800">
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Fee Details</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Billing Month</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Net Payable</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Paid Amount</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Balance</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Actions</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800/40">
                         {payments.length > 0 ? payments.map((p, idx) => (
                           <tr 
                             key={idx} 
                             onClick={() => setSelectedPaymentDetail(p)}
                             className="group hover:bg-slate-800/20 transition-all border-b border-slate-800/30 cursor-pointer"
                           >
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                     p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                     p.status === 'Waived' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                     p.status === 'Partial' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                     'bg-red-500/10 text-red-500 border-red-500/20'
                                   }`}>
                                      <CreditCard size={18} />
                                   </div>
                                   <div>
                                     <div className="text-xs font-black text-white uppercase tracking-tight">
                                       {p.type === 'Other' ? (p.description || 'Custom') : 'Monthly Fee'}
                                     </div>
                                     {((p.concession || 0) > 0 || (p.discount || 0) > 0 || p.waiverReason) ? (
                                       <div className="text-[9px] font-bold text-purple-400 mt-0.5 truncate max-w-[200px]" title={p.waiverReason || 'Fee Concession'}>
                                         {p.waiverReason ? p.waiverReason : `Concession: Rs. ${((p.concession || 0) + (p.discount || 0)).toLocaleString()}`}
                                       </div>
                                     ) : (
                                       <div className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 tracking-widest">
                                         {p.status === 'Paid' ? 'Fully Collected' : p.status === 'Waived' ? 'Fee Waived' : p.status === 'Partial' ? 'Partially Paid' : 'Unpaid Record'}
                                       </div>
                                     )}
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <div className="text-xs font-black text-slate-300">
                                   {new Date(p.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <div className="text-sm font-black text-white">{(p.totalAmount || 0).toLocaleString()}</div>
                             </td>
                             <td className="px-8 py-6">
                                <div className="text-sm font-black text-emerald-400">{(p.paidAmount || 0).toLocaleString()}</div>
                             </td>
                             <td className="px-8 py-6">
                                <div className={`text-sm font-black ${p.balance > 0 ? 'text-red-500 shadow-red-900/10' : 'text-slate-600 italic opacity-50'}`}>
                                   {(p.balance || 0).toLocaleString()}
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  p.status === 'Waived' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                  p.status === 'Partial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {p.status}
                                </span>
                             </td>
                             <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                  {p.balance > 0 && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAdjustModal(p)}
                                        className="p-2 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1"
                                        title="Adjust Fee / Grant Waiver (Maafi)"
                                      >
                                        <Sliders size={13} />
                                        <span className="text-[9px] uppercase hidden sm:inline">Adjust</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handlePayFee(p)}
                                        className="p-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1"
                                        title="Collect Cash"
                                      >
                                        <Receipt size={13} />
                                        <span className="text-[9px] uppercase hidden sm:inline">Pay</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                             </td>
                           </tr>
                         )) : (
                           <tr><td colSpan="7" className="text-center py-24 text-slate-600 font-black uppercase text-[10px] tracking-[0.3em] italic">No financial records found</td></tr>
                         )}
                       </tbody>
                     </table>
                  </div>
                </div>
              );
            })()}

            {activeTab === 'performance' && (
              <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div className="bg-slate-950 p-6 rounded-[2.5rem] border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="px-2">
                       <div className="flex items-center gap-2">
                         <h4 className="text-sm font-black text-blue-500 uppercase tracking-widest">Growth Performance</h4>
                         {activeAcademicYear && (
                           <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[9px] font-black uppercase tracking-wider">
                             {activeAcademicYear.name}
                           </span>
                         )}
                       </div>
                       <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">
                         Scoped to Active Academic Session ({activeAcademicYear ? `${new Date(activeAcademicYear.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} - ${new Date(activeAcademicYear.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : 'Current Year'})
                       </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                       {/* Presets */}
                       {activeAcademicYear && (
                         <button
                           type="button"
                           onClick={() => {
                             const startM = formatYearMonth(activeAcademicYear.startDate);
                             const endM = formatYearMonth(activeAcademicYear.endDate);
                             setPerfRange({ start: startM, end: endM });
                           }}
                           className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap"
                         >
                           Reset to Academic Year
                         </button>
                       )}

                       <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 whitespace-nowrap">From</label>
                             <input 
                               type="month" 
                               className="bg-slate-950 border border-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]" 
                               value={perfRange?.start || ''}
                               onChange={e => setPerfRange({...perfRange, start: e.target.value})}
                             />
                          </div>
                          <div className="flex items-center gap-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">To</label>
                             <input 
                               type="month" 
                               className="bg-slate-950 border border-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]" 
                               value={perfRange?.end || ''}
                               onChange={e => setPerfRange({...perfRange, end: e.target.value})}
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="h-[350px] w-full">
                       <Line 
                         key={`perf-chart-${perfData.length}-${perfRange.start}-${perfRange.end}`}
                         data={{
                            labels: perfData.map(d => d.month),
                            datasets: [{
                              label: 'Attendance Rate',
                              data: perfData.map(d => d.percentage),
                              borderColor: 'rgb(59, 130, 246)',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              tension: 0.4,
                              fill: true,
                              pointRadius: perfData.length > 31 ? 0 : 4,
                            }]
                         }} 
                         options={{ 
                           responsive: true, 
                           maintainAspectRatio: false,
                           plugins: { legend: { display: false } },
                           scales: { 
                             y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => v + '%' } },
                             x: { grid: { display: false }, border: { display: false }, ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } } }
                           }
                         }} 
                       />
                    </div>
                 </div>

                 <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-3xl flex items-center gap-6">
                    <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-500">
                       <TrendingUp size={32} />
                    </div>
                    <div>
                       <h4 className="font-bold text-blue-400">Monthly Performance Summary</h4>
                       <p className="text-slate-400 text-sm mt-1">Showing historical attendance trends for the current academic session.</p>
                    </div>
                 </div>
              </div>
            )}

            {/* Portal Access Tab */}
            {activeTab === 'portal' && isAdmin && (
              <div className="p-8 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-2">
                {/* Header Banner */}
                <div className="p-8 bg-gradient-to-r from-blue-900/20 via-indigo-900/10 to-slate-900 border border-blue-500/20 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner">
                      <KeyRound size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">Portal Access Management</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        Create & manage login credentials for <span className="text-blue-400">{student.name}</span> and their parents.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 self-start md:self-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Principal Controls</span>
                  </div>
                </div>

                {/* 2 Cards Grid: Student Account & Parent Account */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Student Portal Card */}
                  <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 space-y-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                            <User size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Student Portal</h4>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Student Login Credentials</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          portalAccounts.studentAccount 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {portalAccounts.studentAccount ? 'Active Account' : 'Not Created'}
                        </span>
                      </div>

                      {/* Username Field */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username / Email</label>
                          {studentPortalUser && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(studentPortalUser, 'Student Username')}
                              className="text-[9px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              {copiedField === 'Student Username' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              <span>{copiedField === 'Student Username' ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={studentPortalUser}
                          onChange={(e) => setStudentPortalUser(e.target.value)}
                          placeholder={`${student.regNo.toLowerCase()}@school.com`}
                          className="w-full bg-slate-900 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-emerald-500/40 outline-none font-bold text-sm"
                        />
                      </div>

                      {/* Password Field */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleGenerateRandomPass('student')}
                              className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 uppercase tracking-wider"
                            >
                              <Sparkles size={12} /> Generate
                            </button>
                            {studentPortalPass && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(studentPortalPass, 'Student Password')}
                                className="text-[9px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                              >
                                {copiedField === 'Student Password' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                <span>{copiedField === 'Student Password' ? 'Copied' : 'Copy'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type={isStudentPassRevealed ? 'text' : 'password'}
                            value={studentPortalPass}
                            onChange={(e) => setStudentPortalPass(e.target.value)}
                            placeholder="Enter password"
                            className="w-full bg-slate-900 border border-slate-800 text-white px-5 py-4 pr-12 rounded-2xl focus:ring-2 focus:ring-emerald-500/40 outline-none font-bold text-sm tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={() => setIsStudentPassRevealed(!isStudentPassRevealed)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors p-1"
                          >
                            {isStudentPassRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSavingStudentPortal}
                      onClick={() => handleSaveCredential('student')}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/30 uppercase text-xs tracking-widest disabled:opacity-50 mt-4"
                    >
                      {isSavingStudentPortal ? 'Saving...' : portalAccounts.studentAccount ? 'Update Student Login' : 'Create Student Login'}
                    </button>
                  </div>

                  {/* Parent Portal Card */}
                  <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 space-y-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Parent Portal</h4>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Parent / Guardian Credentials</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          portalAccounts.parentAccount 
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {portalAccounts.parentAccount ? 'Active Account' : 'Not Created'}
                        </span>
                      </div>

                      {/* Username Field */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Parent Email / ID</label>
                          {parentPortalUser && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(parentPortalUser, 'Parent Username')}
                              className="text-[9px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              {copiedField === 'Parent Username' ? <Check size={12} className="text-indigo-400" /> : <Copy size={12} />}
                              <span>{copiedField === 'Parent Username' ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={parentPortalUser}
                          onChange={(e) => setParentPortalUser(e.target.value)}
                          placeholder={`p.${student.regNo.toLowerCase()}@school.com`}
                          className="w-full bg-slate-900 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500/40 outline-none font-bold text-sm"
                        />
                      </div>

                      {/* Password Field */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Parent Password</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleGenerateRandomPass('parent')}
                              className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 uppercase tracking-wider"
                            >
                              <Sparkles size={12} /> Generate
                            </button>
                            {parentPortalPass && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(parentPortalPass, 'Parent Password')}
                                className="text-[9px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                              >
                                {copiedField === 'Parent Password' ? <Check size={12} className="text-indigo-400" /> : <Copy size={12} />}
                                <span>{copiedField === 'Parent Password' ? 'Copied' : 'Copy'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type={isParentPassRevealed ? 'text' : 'password'}
                            value={parentPortalPass}
                            onChange={(e) => setParentPortalPass(e.target.value)}
                            placeholder="Enter password"
                            className="w-full bg-slate-900 border border-slate-800 text-white px-5 py-4 pr-12 rounded-2xl focus:ring-2 focus:ring-indigo-500/40 outline-none font-bold text-sm tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={() => setIsParentPassRevealed(!isParentPassRevealed)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors p-1"
                          >
                            {isParentPassRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSavingParentPortal}
                      onClick={() => handleSaveCredential('parent')}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/30 uppercase text-xs tracking-widest disabled:opacity-50 mt-4"
                    >
                      {isSavingParentPortal ? 'Saving...' : portalAccounts.parentAccount ? 'Update Parent Login' : 'Create Parent Login'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Learning Insights Tab */}
            {activeTab === 'ai-insights' && (
              <div className="p-8 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                {/* Header Banner */}
                <div className="p-8 bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-slate-900 border border-blue-500/30 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-xl shadow-blue-500/20">
                      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
                        <Sparkles size={30} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">AI Learning Profile & Inquisitive Insights</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                          Gemini 2.0
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        Track <span className="text-blue-400">{student.name}</span>'s AI tutoring queries, conceptual curiosity, and visual learning trends.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={fetchAiInsights}
                    disabled={loadingAiInsights}
                    className="px-4 py-2 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-2xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2 self-start md:self-auto"
                  >
                    <RefreshCw size={14} className={loadingAiInsights ? 'animate-spin' : ''} />
                    <span>Refresh Insights</span>
                  </button>
                </div>

                {loadingAiInsights ? (
                  <div className="p-16 text-center text-slate-400 font-bold animate-pulse">
                    Synthesizing AI Learning Analytics...
                  </div>
                ) : (
                  <>
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Sparkles size={24} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Questions Asked</div>
                          <div className="text-2xl font-black text-white mt-0.5">{aiInsights?.totalQuestions || 0}</div>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <Sliders size={24} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tutoring Sessions</div>
                          <div className="text-2xl font-black text-indigo-400 mt-0.5">{aiInsights?.totalSessions || 0}</div>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                          <Eye size={24} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagrams Rendered</div>
                          <div className="text-2xl font-black text-cyan-400 mt-0.5">{aiInsights?.diagramViews || 0}</div>
                        </div>
                      </div>
                    </div>

                    {/* Learning Interests & Concept Focus */}
                    <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                        <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Sparkles size={16} className="text-blue-400" /> Inquisitive Focus & Explored Topics
                        </h4>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extracted by AI</span>
                      </div>

                      {aiInsights?.topInterests && aiInsights.topInterests.length > 0 ? (
                        <div className="flex flex-wrap gap-2.5">
                          {aiInsights.topInterests.map((interest, idx) => (
                            <span
                              key={idx}
                              className="px-3.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-300 uppercase tracking-wider transition-all"
                            >
                              #{interest}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">
                          Student hasn't started tutoring sessions with the AI Companion yet. Topics explored will automatically appear here.
                        </p>
                      )}
                    </div>

                    {/* Recent AI Tutoring Inquiries Log */}
                    <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                        <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <History size={16} className="text-indigo-400" /> Recent AI Inquiry Log
                        </h4>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Academic Curiosity</span>
                      </div>

                      {aiInsights?.recentQueries && aiInsights.recentQueries.length > 0 ? (
                        <div className="space-y-3">
                          {aiInsights.recentQueries.map((q, idx) => (
                            <div key={idx} className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition-all">
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  <span>{q.topic}</span>
                                </div>
                                <p className="text-xs text-slate-400 italic">"{q.query}"</p>
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 shrink-0">
                                {new Date(q.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-600 text-xs font-bold uppercase tracking-wider">
                          No recent inquiries logged
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Collect Payment Modal */}
      {showPayModal && selectedRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                 <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Collect Payment</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Receive cash for {selectedRecord.type}</p>
                 </div>
                 <button onClick={() => setShowPayModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-8 space-y-8">
                 <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-600 uppercase">Current Balance</span>
                       <span className="text-lg font-black text-red-500">{(selectedRecord.balance || 0).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-slate-800/50"></div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="text-slate-500">Original Total</span>
                       <span className="text-slate-300">{(selectedRecord.totalAmount || 0).toLocaleString()}</span>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Collection Amount</label>
                    <input 
                       type="number"
                       className="w-full bg-slate-950 border border-slate-800 text-white px-6 py-5 rounded-2xl outline-none focus:border-blue-500 transition-all font-black text-xl"
                       placeholder="0.00"
                       value={payAmount}
                       onChange={e => setPayAmount(e.target.value)}
                    />
                    <p className="text-[9px] text-slate-600 font-bold italic ml-2">Note: You can collect partial or full balance amount.</p>
                 </div>

                 <div className="flex gap-3">
                    <button 
                       onClick={() => setShowPayModal(false)}
                       className="flex-1 px-4 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={submitPayment}
                       className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl shadow-blue-900/40 border border-blue-400/20"
                    >
                       Complete Collection
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Payment Detail & History Modal */}
      {selectedPaymentDetail && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                 <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                      {selectedPaymentDetail.type === 'Other' ? (selectedPaymentDetail.description || 'Custom Charge') : 'Monthly Fee Detail'}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                       <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                         {selectedPaymentDetail.type === 'Other' ? 'Custom Record' : 'Monthly Billing'} — {new Date(selectedPaymentDetail.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                       </p>
                       <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                       <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
                         Generated: {new Date(selectedPaymentDetail.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                       </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleDeleteRecord(selectedPaymentDetail._id)}
                      className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Delete Entire Record"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button onClick={() => setSelectedPaymentDetail(null)} className="p-3 text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                 </div>
              </div>

              <div className="p-8 grid grid-cols-2 gap-6 bg-slate-950/30">
                 <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Payable</div>
                    <div className="text-2xl font-black text-white">{selectedPaymentDetail.totalAmount?.toLocaleString()}</div>
                 </div>
                 <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Balance Due</div>
                    <div className="text-2xl font-black text-red-500">{selectedPaymentDetail.balance?.toLocaleString()}</div>
                 </div>
              </div>

              <div className="px-8 pb-8 space-y-6">
                 <div>
                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Transaction History</h3>
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="bg-slate-900/50 border-b border-slate-800">
                                <th className="p-4 text-[9px] font-black text-slate-600 uppercase">Date</th>
                                <th className="p-4 text-[9px] font-black text-slate-600 uppercase">Amount</th>
                                <th className="p-4 text-[9px] font-black text-slate-600 uppercase text-right">Action</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                             {selectedPaymentDetail.paymentHistory?.length > 0 ? selectedPaymentDetail.paymentHistory.map((h, i) => (
                                <tr key={i} className="hover:bg-slate-900/40 transition-all">
                                   <td className="p-4">
                                      <div className="text-xs font-bold text-slate-200">{new Date(h.date).toLocaleDateString()}</div>
                                      <div className="text-[9px] font-black text-slate-500 uppercase">{new Date(h.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' })}</div>
                                   </td>
                                   <td className="p-4 text-xs font-black text-emerald-400">{h.amount?.toLocaleString()}</td>
                                   <td className="p-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                         <button 
                                            onClick={() => handleRemoveTransaction(selectedPaymentDetail._id, h._id)}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                         >
                                            <X size={14} />
                                         </button>
                                      </div>
                                   </td>
                                </tr>
                             )) : (
                                <tr><td colSpan="3" className="p-8 text-center text-[10px] text-slate-600 font-black uppercase italic tracking-widest">No payments received yet</td></tr>
                             )}
                          </tbody>
                        </table>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        handleOpenAdjustModal(selectedPaymentDetail);
                      }}
                      className="w-full bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white p-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <Sliders size={16} /> Adjust / Waive Fee
                    </button>

                    {selectedPaymentDetail.balance > 0 ? (
                      <button 
                        type="button"
                        onClick={() => {
                           handlePayFee(selectedPaymentDetail);
                           setSelectedPaymentDetail(null);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Receipt size={16} /> Collect Cash
                      </button>
                    ) : (
                      <div className="flex items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-black text-xs uppercase tracking-wider">
                        <CheckCircle2 size={16} className="mr-2" /> Balance Cleared
                      </div>
                    )}
                  </div>

                  {/* Challan/Voucher Button - Only for Monthly Fees */}
                  {(selectedPaymentDetail.type === 'Monthly Fees' || selectedPaymentDetail.type === 'Tuition') && (
                    <button 
                      type="button"
                      onClick={() => {
                         const overallDues = payments.reduce((sum, p) => sum + (p.balance || 0), 0);
                         generateFeeVoucher({ 
                           student: { ...student, overallDues }, 
                           feeRecord: selectedPaymentDetail 
                         }, { showFullFee: voucherSettings.showFullFee, showPreviousDues: voucherSettings.showPreviousDues });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Printer size={16} className="text-blue-500 group-hover:scale-110 transition-transform" /> 
                      Generate Monthly Challan
                    </button>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* Fee Adjustment & Waiver Modal */}
      {showAdjustModal && adjustingRecord && (() => {
        const base = Number(adjustForm.amount) || 0;
        const conc = Number(adjustForm.concession) || 0;
        const adj = Number(adjustForm.adjustment) || 0;
        const calculatedNet = Math.max(0, base + adj - conc);
        const calculatedBalance = Math.max(0, calculatedNet - (adjustingRecord.paidAmount || 0));

        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 custom-scrollbar">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <Sliders size={18} className="text-purple-400" />
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">Adjust Fee or Waive (Maaf)</h2>
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
                    {adjustingRecord.type} • {adjustingRecord.month} • {student?.name}
                  </p>
                </div>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Current Status Overview */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Base Fee</div>
                    <div className="text-sm font-black text-white mt-0.5">Rs. {(adjustingRecord.amount || adjustingRecord.totalAmount || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Paid Cash</div>
                    <div className="text-sm font-black text-emerald-400 mt-0.5">Rs. {(adjustingRecord.paidAmount || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Current Balance</div>
                    <div className="text-sm font-black text-rose-400 mt-0.5">Rs. {(adjustingRecord.balance || 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Option 1: 1-Click 100% Fee Waiver (Maaf) */}
                <div className="p-5 bg-purple-950/30 border border-purple-500/30 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-400" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">100% Full Balance Waiver</span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[9px] font-black uppercase">
                      Fees Maaf
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Automatically clears all remaining pending balance (Rs. {(adjustingRecord.balance || 0).toLocaleString()}) for this month.
                  </p>
                  <button
                    type="button"
                    disabled={isSubmittingAdjust || adjustingRecord.balance === 0}
                    onClick={() => {
                      const reason = window.prompt('Enter reason for fee waiver (e.g. Need-based relief / Principal concession):', 'Principal Full Fee Waiver');
                      if (reason !== null) {
                        handleQuickWaive(adjustingRecord._id, reason);
                      }
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded-2xl transition-all shadow-lg shadow-purple-900/40 uppercase text-xs tracking-wider disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={15} /> Waive Full Remaining Balance (Maaf)
                  </button>
                </div>

                {/* Option 2: Custom Concession / Adjustment */}
                <form onSubmit={handleSubmitAdjust} className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Sliders size={14} className="text-slate-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">Custom Adjustment / Partial Concession</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-1">
                        Fee Concession / Discount Amount (-) (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 500"
                        value={adjustForm.concession}
                        onChange={e => setAdjustForm({ ...adjustForm, concession: e.target.value })}
                        className="w-full bg-slate-950 border border-purple-500/40 text-purple-300 px-4 py-3 rounded-xl outline-none focus:border-purple-400 font-bold text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                          Base Monthly Fee (Rs.)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adjustForm.amount}
                          onChange={e => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                          Fine / Late Surcharge (+) (Rs.)
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={adjustForm.adjustment}
                          onChange={e => setAdjustForm({ ...adjustForm, adjustment: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                        Reason / Principal Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sibling discount / Financial hardship relief"
                        value={adjustForm.waiverReason}
                        onChange={e => setAdjustForm({ ...adjustForm, waiverReason: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 font-bold text-sm"
                      />
                    </div>
                  </div>

                  {/* Calculation Preview */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs font-bold">
                    <div className="flex justify-between text-slate-400">
                      <span>Calculated Net Payable:</span>
                      <span className="text-white font-black">Rs. {calculatedNet.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Verified Paid Cash:</span>
                      <span className="text-emerald-400 font-black">Rs. {(adjustingRecord.paidAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-slate-800 my-1"></div>
                    <div className="flex justify-between text-sm font-black">
                      <span className="text-slate-300">New Due Balance:</span>
                      <span className={calculatedBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        Rs. {calculatedBalance.toLocaleString()} {calculatedBalance === 0 ? '(Cleared)' : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAdjust}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl transition-all shadow-xl shadow-blue-900/30 uppercase text-xs tracking-wider disabled:opacity-50"
                  >
                    {isSubmittingAdjust ? 'Updating...' : 'Save Custom Adjustment'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Single Charge / Manual Entry Modal */}
      {showSingleChargeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 custom-scrollbar">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Add Custom Fee / Charge</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                  Add billing entry to {student?.name}'s ledger
                </p>
              </div>
              <button type="button" onClick={() => setShowSingleChargeModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitSingleCharge} className="p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fee Category</label>
                  <select
                    value={singleChargeForm.type}
                    onChange={e => setSingleChargeForm({ ...singleChargeForm, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm cursor-pointer"
                  >
                    <option value="Monthly Fees">Monthly Fees</option>
                    <option value="Admission">Admission</option>
                    <option value="Exam">Exam</option>
                    <option value="Misc">Misc</option>
                    <option value="Other">Other / Custom</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Billing Month</label>
                  <input
                    type="month"
                    required
                    value={singleChargeForm.month}
                    onChange={e => setSingleChargeForm({ ...singleChargeForm, month: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base Amount (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 2500"
                    value={singleChargeForm.amount}
                    onChange={e => setSingleChargeForm({ ...singleChargeForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Concession / Waiver (-) (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={singleChargeForm.concession}
                    onChange={e => setSingleChargeForm({ ...singleChargeForm, concession: e.target.value })}
                    className="w-full bg-slate-950 border border-purple-500/40 text-purple-300 px-4 py-3 rounded-2xl outline-none focus:border-purple-500 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Paper Fund / Sports Charges / Monthly Fee"
                  value={singleChargeForm.description}
                  onChange={e => setSingleChargeForm({ ...singleChargeForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remarks / Waiver Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Special concession granted"
                  value={singleChargeForm.waiverReason}
                  onChange={e => setSingleChargeForm({ ...singleChargeForm, waiverReason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingSingleCharge}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/30 uppercase text-xs tracking-widest disabled:opacity-50 mt-4"
              >
                {isSubmittingSingleCharge ? 'Adding...' : 'Add Fee Entry to Ledger'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Statement Filter Modal */}
      {showStatementModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                 <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Export Statement</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Filter financial ledger records</p>
                 </div>
                 <button onClick={() => setShowStatementModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Start Month</label>
                       <input 
                         type="month"
                         className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none focus:border-blue-500"
                         value={statementFilters.startMonth}
                         onChange={e => setStatementFilters({...statementFilters, startMonth: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase ml-2">End Month</label>
                       <input 
                         type="month"
                         className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none focus:border-blue-500"
                         value={statementFilters.endMonth}
                         onChange={e => setStatementFilters({...statementFilters, endMonth: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="flex items-center gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <input 
                       type="checkbox"
                       id="onlyDues"
                       className="w-5 h-5 accent-blue-600 rounded"
                       checked={statementFilters.showOnlyDues}
                       onChange={e => setStatementFilters({...statementFilters, showOnlyDues: e.target.checked})}
                    />
                    <label htmlFor="onlyDues" className="text-xs font-black text-slate-300 uppercase tracking-widest cursor-pointer">Show Only Due Records</label>
                 </div>

                 <button 
                   onClick={executeStatementPrint}
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-3"
                 >
                   <Printer size={18} /> Generate & Print
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0">
               <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Edit Student Profile</h2>
                  <p className="text-slate-500 text-xs font-bold mt-1">Update personal and academic records for {student.name}</p>
               </div>
               <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors">
                  <X size={24} />
               </button>
            </div>

            <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
               <div>
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <EditInput label="Registration / Roll No" value={editForm.regNo} onChange={v => setEditForm({...editForm, regNo: v})} />
                     <EditInput label="Student Name" value={editForm.name} onChange={v => setEditForm({...editForm, name: v})} />
                     <EditInput label="Father's Name" value={editForm.fatherName} onChange={v => setEditForm({...editForm, fatherName: v})} />
                     <EditInput label="Date of Birth" type="date" value={editForm.dob ? new Date(editForm.dob).toISOString().split('T')[0] : ''} onChange={v => setEditForm({...editForm, dob: v})} />
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Gender</label>
                        <select className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                           <option value="Male">Male</option>
                           <option value="Female">Female</option>
                           <option value="Other">Other</option>
                        </select>
                     </div>
                     <EditInput label="Phone" value={editForm.phone} onChange={v => setEditForm({...editForm, phone: v})} />
                     <EditInput label="Student B-Form" value={editForm.bForm} onChange={v => setEditForm({...editForm, bForm: v})} />
                     <EditInput label="Father CNIC" value={editForm.fatherCnic} onChange={v => setEditForm({...editForm, fatherCnic: v})} />
                     <EditInput label="Cast" value={editForm.cast} onChange={v => setEditForm({...editForm, cast: v})} />
                     <EditInput label="Religion" value={editForm.religion} onChange={v => setEditForm({...editForm, religion: v})} />
                  </div>
               </div>

               <div className="pt-10 border-t border-slate-800">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Communication</h3>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Home Address</label>
                     <textarea rows="2" className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} placeholder="Full address..." />
                  </div>
               </div>

               <div className="pt-10 border-t border-slate-800">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Academic & Financial</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <EditInput label="Admission Date" type="date" value={editForm.admissionDate ? new Date(editForm.admissionDate).toISOString().split('T')[0] : ''} onChange={v => setEditForm({...editForm, admissionDate: v})} />
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Assigned Class</label>
                        <select 
                           className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50" 
                           value={editForm.class} 
                           onChange={e => {
                              const cid = e.target.value;
                              setEditForm({...editForm, class: cid, section: ''});
                              fetchSections(cid);
                           }}
                        >
                           <option value="">Select Class</option>
                           {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Assigned Section</label>
                        <select 
                           className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50" 
                           value={editForm.section} 
                           onChange={e => setEditForm({...editForm, section: e.target.value})}
                        >
                           <option value="">Select Section</option>
                           {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                     </div>
                     <EditInput label="Monthly Discount" type="number" value={editForm.discount} onChange={v => setEditForm({...editForm, discount: Number(v)})} />
                     <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={editForm.admissionFeePaid} onChange={e => setEditForm({...editForm, admissionFeePaid: e.target.checked})} />
                        <span className="text-sm font-bold text-slate-300">Admission Fee Paid</span>
                     </div>
                  </div>
               </div>
            </form>

            <div className="p-8 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md flex justify-end gap-3 sticky bottom-0">
               <button onClick={() => setIsEditModalOpen(false)} className="px-8 py-3.5 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all">Cancel</button>
               <button onClick={handleUpdate} className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/30 uppercase tracking-widest text-xs">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Delete Confirmation Modal */}
    {showDeleteModal && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ArrowLeft size={40} className="rotate-45" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 italic">Confirm Removal</h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Are you sure you want to mark <span className="text-white font-bold">{student.name}</span> as deleted? 
              Their financial history and attendance will be preserved, but they will no longer appear in active lists.
            </p>
            
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteStudent}
                disabled={isDeleting}
                className="flex-[1.5] px-6 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-500 transition-all shadow-xl shadow-red-900/30 uppercase tracking-widest text-[10px]"
              >
                {isDeleting ? 'Processing...' : 'Yes, Remove Student'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default StudentDetails;

