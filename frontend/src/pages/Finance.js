import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import { generateFeeVoucher, generateBulkVouchers } from '../utils/feeVoucherGenerator';
import { 
  Wallet, 
  Search, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  X,
  ChevronRight,
  User,
  User2,
  Printer,
  Filter,
  Check,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-toastify';

const Finance = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('Unpaid');
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  
  const [filters, setFilters] = useState({
    month: new Date().toISOString().slice(0, 7),
    search: '',
    classId: '',
    sectionId: '',
    voucherStatus: 'Unpaid'
  });

  const [addData, setAddData] = useState({
    type: 'Monthly Fee',
    month: new Date().toISOString().slice(0, 7),
    targetType: 'all', 
    classId: '',
    studentId: '',
    customAmount: '',
    description: ''
  });

  const [showPayPopup, setShowPayPopup] = useState(false);
  const [payRecord, setPayRecord] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  
  const [showInvoicePopup, setShowInvoicePopup] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  const [showStatements, setShowStatements] = useState(false);
  const [recordToStatements, setRecordToStatements] = useState(null);
  const [statements, setStatements] = useState([]);

  const [selectedVouchers, setSelectedVouchers] = useState([]);
  const getPKTDate = () => {
    const now = new Date();
    const pkt = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    return pkt.toISOString().slice(0, 10);
  };
  const [dailyDate, setDailyDate] = useState(getPKTDate());
  const [dailyCollection, setDailyCollection] = useState({ totalCollected: 0, transactionCount: 0 });
  const [voucherSettings, setVoucherSettings] = useState({ showFullFee: true, showPreviousDues: false });

  const fetchClasses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchSections = useCallback(async (classId) => {
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSections(res.data.sections || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (filters.classId) fetchSections(filters.classId);
    else setSections([]);
    setFilters(prev => ({ ...prev, sectionId: '' }));
  }, [filters.classId, fetchSections]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/finance/stats`, {
        params: { month: filters.month === 'Lifetime' ? '' : filters.month },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(res.data);
    } catch (err) { console.error(err); }
  }, [filters.month]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let statusParam = undefined;
      if (activeTab === 'Paid') statusParam = 'Paid';
      if (activeTab === 'Unpaid') statusParam = ['Unpaid', 'Partial'];

      const res = await axios.get(`${API_BASE_URL}/api/finance/records`, { 
        params: { 
          ...filters, 
          status: statusParam,
          month: filters.month === 'Lifetime' ? '' : filters.month
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecords(res.data);
    } catch (err) { toast.error('Error loading records'); }
    finally { setLoading(false); }
  }, [filters, activeTab]);

  const fetchAllStudents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAllStudents(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchVoucherSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setVoucherSettings({ showFullFee: res.data.showFullFeeOnVoucher !== false, showPreviousDues: res.data.showPreviousDuesOnVoucher === true });
    } catch (err) { console.error(err); }
  }, []);

  const fetchDailyCollection = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/finance/daily-collection`, {
        params: { date: dailyDate },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDailyCollection(res.data);
    } catch (err) { console.error(err); }
  }, [dailyDate]);

  useEffect(() => {
    fetchStats();
    fetchRecords();
    fetchAllStudents();
    fetchVoucherSettings();
  }, [fetchStats, fetchRecords, fetchAllStudents, fetchVoucherSettings]);

  useEffect(() => {
    fetchDailyCollection();
  }, [fetchDailyCollection]);

  const fetchStudentStatements = useCallback(async (studentId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/finance/student/${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStatements(res.data);
    } catch (err) { toast.error('Failed to load history'); }
  }, []);

  useEffect(() => {
    if (recordToStatements?.student?._id) {
       fetchStudentStatements(recordToStatements.student._id);
    }
  }, [recordToStatements, fetchStudentStatements]);

  const handleAddRecords = async () => {
    if (addData.targetType === 'class' && !addData.classId) return toast.error('Select a class');
    if (addData.targetType === 'student' && !addData.studentId) return toast.error('Select a student');
    if (addData.type === 'Other' && !addData.customAmount) return toast.error('Enter amount');

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      let studentIds = [];
      
      if (addData.targetType === 'all') {
         const stdRes = await axios.get(`${API_BASE_URL}/api/students`, { params: { status: 'Active' }, headers });
         studentIds = stdRes.data.map(s => s._id);
      } else if (addData.targetType === 'class') {
         const stdRes = await axios.get(`${API_BASE_URL}/api/students`, { params: { classId: addData.classId, status: 'Active' }, headers });
         studentIds = stdRes.data.map(s => s._id);
      } else {
         studentIds = [addData.studentId];
      }

      await axios.post(`${API_BASE_URL}/api/finance/add`, {
        studentIds,
        type: addData.type,
        month: addData.month,
        amount: addData.type === 'Other' ? addData.customAmount : undefined,
        description: addData.type === 'Other' ? addData.description : 'Monthly School Fee'
      }, { headers });
      
      toast.success('Records added');
      setShowAddModal(false);
      setAddData({
        type: 'Monthly Fee',
        month: new Date().toISOString().slice(0, 7),
        targetType: 'all', 
        classId: '',
        studentId: '',
        customAmount: '',
        description: ''
      });
      fetchStats();
      fetchRecords();
    } catch (err) { toast.error(err.response?.data?.msg || 'Error adding records'); }
  };

  const submitPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return toast.error("Invalid amount");
    if (parseFloat(payAmount) > payRecord.balance) return toast.error("Exceeds dues");

    try {
      await axios.patch(`${API_BASE_URL}/api/finance/pay/${payRecord._id}`, { 
        amount: parseFloat(payAmount) 
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('Payment recorded');
      setShowPayPopup(false);
      fetchRecords();
      fetchStats();
      fetchDailyCollection();
    } catch (err) { toast.error('Payment failed'); }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/finance/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Deleted');
      fetchStats();
      fetchRecords();
      setShowInvoicePopup(false);
    } catch (err) { toast.error('Delete failed'); }
  };

  const handleBulkGenerate = async () => {
    if (selectedVouchers.length === 0) return toast.warning('Select vouchers first');
    const selectedRecords = records.filter(r => selectedVouchers.includes(r._id));
    const voucherData = selectedRecords.map(r => ({ student: r.student, feeRecord: r }));
    toast.info(`Generating ${selectedVouchers.length} vouchers...`);
    await generateBulkVouchers(voucherData, { showFullFee: voucherSettings.showFullFee, showPreviousDues: voucherSettings.showPreviousDues });
  };

  const toggleVoucherSelection = (id) => {
    setSelectedVouchers(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const monthlyStats = stats['Monthly Fees'] || { paid: 0, unpaid: 0 };
  const otherStats = stats['Other'] || { paid: 0, unpaid: 0 };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.student?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                         r.student?.regNo?.toLowerCase().includes(filters.search.toLowerCase());
    const matchesClass = !filters.classId || r.student?.class === filters.classId || r.student?.class?._id === filters.classId;
    const matchesMonth = filters.month === 'Lifetime' || r.month === filters.month;

    if (activeTab === 'Vouchers') {
       const isMonthly = (r.type === 'Monthly Fees' || r.type === 'Tuition' || r.type === 'Monthly Fee');
       if (!isMonthly) return false;
       const statusMatch = filters.voucherStatus === 'All' || (filters.voucherStatus === 'Unpaid' && r.balance > 0);
       return matchesSearch && matchesClass && matchesMonth && statusMatch;
    }
    return matchesSearch && matchesClass && matchesMonth;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Wallet className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Accounts <span className="text-blue-500">& Finance</span>
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em]">
              Revenue tracking and student fee management
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-[0_20px_50px_-15px_rgba(59,130,246,0.5)] transition-all active:scale-95"
        >
          <Plus size={18} /> New Charge
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-slate-900/40 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Monthly Fees</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-950 border border-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 font-bold uppercase text-[8px] mb-1">Paid</p>
                <h3 className="text-lg font-black text-emerald-500">Rs. {(monthlyStats.paid || 0).toLocaleString()}</h3>
             </div>
             <div className="bg-slate-950 border border-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 font-bold uppercase text-[8px] mb-1">Unpaid</p>
                <h3 className="text-lg font-black text-red-500">Rs. {(monthlyStats.unpaid || 0).toLocaleString()}</h3>
             </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Other Charges</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-950 border border-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 font-bold uppercase text-[8px] mb-1">Paid</p>
                <h3 className="text-lg font-black text-emerald-500">Rs. {(otherStats.paid || 0).toLocaleString()}</h3>
             </div>
             <div className="bg-slate-950 border border-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 font-bold uppercase text-[8px] mb-1">Unpaid</p>
                <h3 className="text-lg font-black text-red-500">Rs. {(otherStats.unpaid || 0).toLocaleString()}</h3>
             </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full animate-pulse"></div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Daily Collection</h2>
          </div>
          <div className="space-y-3">
             <input 
                type="date"
                className="w-full bg-slate-950 border border-slate-800/50 text-white px-4 py-2 rounded-xl text-xs font-bold outline-none focus:border-amber-500/50 transition-all"
                value={dailyDate}
                onChange={e => setDailyDate(e.target.value)}
             />
             <div className="bg-slate-950 border border-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 font-bold uppercase text-[8px] mb-1">Collected ({dailyCollection.transactionCount} txns)</p>
                <h3 className="text-lg font-black text-amber-500">Rs. {(dailyCollection.totalCollected || 0).toLocaleString()}</h3>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center gap-3">
          <div className="w-full md:flex-1 md:min-w-[240px] relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
             <input 
                type="text" 
                placeholder="Search student..."
                className="w-full bg-slate-900 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm"
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
             />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
               <span className="text-[9px] font-bold text-slate-500 uppercase">Month</span>
               <input 
                  type="month"
                  className="bg-transparent border-none text-white outline-none font-bold text-xs"
                  value={filters.month === 'Lifetime' ? '' : filters.month}
                  onChange={e => setFilters({...filters, month: e.target.value || 'Lifetime'})}
               />
            </div>
            <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
               <span className="text-[9px] font-bold text-slate-500 uppercase">Class</span>
               <select 
                  className="bg-transparent border-none text-white outline-none font-bold text-xs"
                  value={filters.classId}
                  onChange={e => setFilters({...filters, classId: e.target.value})}
               >
                  <option value="" className="bg-slate-900 text-white">All</option>
                  {classes.map(c => <option key={c._id} value={c._id} className="bg-slate-900 text-white">{c.name}</option>)}
               </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800/60 rounded-xl w-full md:w-fit overflow-x-auto scrollbar-hide">
            {['Unpaid', 'Paid', 'All', 'Vouchers'].map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedVouchers([]); }}
                  className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'
                  }`}
                >
                  {tab}
                </button>
            ))}
          </div>

          {activeTab === 'Vouchers' && filteredRecords.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center gap-3">
               <div className="flex items-center gap-2 w-full sm:w-auto">
                 <span className="flex-1 sm:flex-none text-[10px] font-black text-slate-500 uppercase bg-slate-900 px-4 py-3 rounded-xl border border-slate-800">
                    {selectedVouchers.length} Selected
                 </span>
                 <button 
                   onClick={() => setSelectedVouchers(selectedVouchers.length === filteredRecords.length ? [] : filteredRecords.map(r => r._id))}
                   className="px-4 py-3 rounded-xl text-[10px] font-black uppercase border border-slate-800 text-slate-400"
                 >
                   {selectedVouchers.length === filteredRecords.length ? 'Reset' : 'Pick All'}
                 </button>
               </div>
               <button 
                  onClick={handleBulkGenerate}
                  disabled={selectedVouchers.length === 0}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-3 shadow-lg"
               >
                  <Printer size={16} /> Bulk Print Vouchers
               </button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
           <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800">
                    {activeTab === 'Vouchers' && <th className="px-6 py-5 w-10"><Filter size={14} className="text-slate-500" /></th>}
                    <th className="px-6 py-5 text-[9px] font-bold uppercase text-slate-500 tracking-widest">Student</th>
                    <th className="px-6 py-5 text-[9px] font-bold uppercase text-slate-500 tracking-widest">Month</th>
                    <th className="px-6 py-5 text-[9px] font-bold uppercase text-slate-500 tracking-widest text-right">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-20 text-slate-500 font-bold uppercase text-[10px]">Loading ledger...</td></tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-20 text-slate-700 font-black uppercase text-xs">No entries</td></tr>
                  ) : filteredRecords.map((r) => (
                    <tr 
                      key={r._id} 
                      onClick={() => activeTab === 'Vouchers' ? toggleVoucherSelection(r._id) : (setInvoiceData(r), setShowInvoicePopup(true))}
                      className="group transition-all hover:bg-slate-950/60 cursor-pointer"
                    >
                      {activeTab === 'Vouchers' && (
                        <td className="px-6 py-5">
                           <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedVouchers.includes(r._id) ? 'bg-blue-600 border-blue-600' : 'border-slate-800'}`}>
                             {selectedVouchers.includes(r._id) && <Check size={12} className="text-white" />}
                           </div>
                        </td>
                      )}
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.student?.gender === 'Female' ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-600/10 text-blue-500'}`}>
                               {r.student?.gender === 'Female' ? <User2 size={16} /> : <User size={16} />}
                            </div>
                            <div>
                               <div className="text-sm font-black text-white group-hover:text-blue-500 uppercase">{r.student?.name || 'Walk-in'}</div>
                               <div className="text-[10px] text-slate-500 font-bold uppercase">{r.student?.regNo} • {r.student?.class?.name}</div>
                               {r.student?.fatherName && <div className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">F: {r.student.fatherName}</div>}
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="text-white text-xs font-black uppercase">{r.month}</div>
                         <div className="text-[9px] text-slate-600 font-bold uppercase">{r.description || 'Record'}</div>
                      </td>
                      <td className="px-6 py-5 text-right font-black tabular-nums">
                         <div className="text-white">Rs. {r.totalAmount.toLocaleString()}</div>
                         <div className={`text-[9px] uppercase tracking-widest ${r.status === 'Paid' ? 'text-emerald-500' : 'text-rose-500'}`}>{r.status}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>

           <div className="md:hidden divide-y divide-slate-800">
             {filteredRecords.map((r) => (
                <div 
                  key={r._id} 
                  onClick={() => activeTab === 'Vouchers' ? toggleVoucherSelection(r._id) : (setInvoiceData(r), setShowInvoicePopup(true))}
                  className="p-4 space-y-3 active:bg-slate-950"
                >
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         {activeTab === 'Vouchers' && (
                            <div className={`w-5 h-5 rounded border-2 ${selectedVouchers.includes(r._id) ? 'bg-blue-600 border-blue-600' : 'border-slate-800'}`}>
                               {selectedVouchers.includes(r._id) && <Check size={12} className="text-white" />}
                            </div>
                         )}
                         <div>
                            <div className="text-sm font-black text-white uppercase">{r.student?.name}</div>
                            {r.student?.fatherName && <div className="text-[10px] text-slate-500 font-bold uppercase">F: {r.student.fatherName}</div>}
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-black text-white">Rs. {r.totalAmount.toLocaleString()}</div>
                         <div className={`text-[9px] font-black uppercase ${r.status === 'Paid' ? 'text-emerald-500' : 'text-rose-500'}`}>{r.status}</div>
                      </div>
                   </div>
                   <div className="text-[10px] text-slate-500 font-bold uppercase">{r.month} • {r.type}</div>
                </div>
             ))}
           </div>
        </div>
      </div>

      {/* Overlays */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-800 p-6 md:p-8 animate-in zoom-in-95">
              <div className="flex justify-between items-start mb-6">
                 <h2 className="text-2xl font-black text-white uppercase italic">Add Charge</h2>
                 <button onClick={() => setShowAddModal(false)} className="bg-slate-950 p-2 rounded-xl text-slate-500 hover:text-white transition-all"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <select 
                      className="bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl text-[10px] font-black uppercase"
                      value={addData.type} onChange={e => setAddData({...addData, type: e.target.value})}
                    >
                      <option value="Monthly Fee">Tuition</option>
                      <option value="Other">Custom</option>
                    </select>
                    <input 
                      type="month" className="bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl text-[10px] font-black uppercase"
                      value={addData.month} onChange={e => setAddData({...addData, month: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-3 gap-2">
                    {['all', 'class', 'student'].map(t => (
                       <button 
                         key={t} onClick={() => setAddData({...addData, targetType: t})}
                         className={`py-3 rounded-xl border text-[9px] font-black uppercase ${addData.targetType === t ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-500'}`}
                       >{t}</button>
                    ))}
                 </div>
                 {addData.targetType === 'class' && (
                    <select className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl text-[10px] font-black" value={addData.classId} onChange={e => setAddData({...addData, classId: e.target.value})}>
                       <option value="">Choose Units...</option>
                       {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                 )}
                 {addData.targetType === 'student' && (
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl text-[10px] font-black" 
                      value={addData.studentId} onChange={e => setAddData({...addData, studentId: e.target.value})}
                    >
                       <option value="">Choose Student...</option>
                       {allStudents.map(s => <option key={s._id} value={s._id}>{s.name} ({s.regNo})</option>)}
                    </select>
                 )}
                 {addData.type === 'Other' && (
                    <>
                      <input 
                        type="number" placeholder="Amount (PKR)" className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl text-[10px] font-black"
                        value={addData.customAmount} onChange={e => setAddData({...addData, customAmount: e.target.value})}
                      />
                      <input 
                        type="text" placeholder="Reason / Description" className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl text-[10px] font-black"
                        value={addData.description} onChange={e => setAddData({...addData, description: e.target.value})}
                      />
                    </>
                 )}
                 <button onClick={handleAddRecords} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg">Confirm Deployment</button>
              </div>
           </div>
        </div>
      )}

      {showInvoicePopup && invoiceData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
           <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h2 className="text-2xl font-black text-white italic uppercase">{invoiceData.student?.name}</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{invoiceData.month} Ledger Record</p>
                 </div>
                 <button onClick={() => setShowInvoicePopup(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
              </div>
              <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 space-y-4 mb-8">
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">Charges</span>
                    <span className="text-white font-black">Rs. {invoiceData.totalAmount.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-500/50 font-bold uppercase tracking-widest">Collected</span>
                    <span className="text-emerald-500 font-black">Rs. {invoiceData.paidAmount.toLocaleString()}</span>
                 </div>
                 <div className="h-[1px] bg-slate-800" />
                 <div className="flex justify-between items-center">
                    <span className="text-rose-500/50 font-bold uppercase tracking-widest text-[10px]">Net Dues</span>
                    <span className="text-2xl font-black text-rose-500">Rs. {invoiceData.balance.toLocaleString()}</span>
                 </div>
              </div>
              <div className="flex flex-wrap gap-4">
                 <button onClick={() => {setRecordToStatements(invoiceData); setShowStatements(true); setShowInvoicePopup(false);}} className="flex-1 bg-slate-950 border border-slate-800 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">History <ArrowRight size={14} /></button>
                 {invoiceData.balance > 0 && <button onClick={() => {setPayRecord(invoiceData); setPayAmount(invoiceData.balance); setShowPayPopup(true); setShowInvoicePopup(false);}} className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-emerald-900/40">Record Payment</button>}
                 <button onClick={() => deleteRecord(invoiceData._id)} className="w-14 h-14 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20"><Trash2 size={24} /></button>
              </div>
           </div>
        </div>
      )}

      {showPayPopup && payRecord && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/98 backdrop-blur-2xl">
           <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[2rem] p-8">
              <div className="text-center mb-8">
                 <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Collection</h2>
                 <p className="text-[9px] text-slate-500 font-bold tracking-[0.3em] mt-1">{payRecord.student?.name}</p>
              </div>
              <div className="space-y-6">
                 <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 font-black text-lg">PKR</span>
                    <input 
                      type="number" className="w-full bg-slate-950 border-2 border-slate-800 text-white pl-16 pr-6 py-6 rounded-3xl outline-none focus:border-blue-500 font-black text-3xl text-center tabular-nums shadow-inner"
                      value={payAmount} onChange={e => setPayAmount(e.target.value)} autoFocus
                    />
                 </div>
                 <button onClick={submitPayment} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">Complete Entry</button>
                 <button onClick={() => setShowPayPopup(false)} className="w-full text-slate-500 font-black uppercase text-[9px] tracking-widest">Cancel Process</button>
              </div>
           </div>
        </div>
      )}

      {showStatements && recordToStatements && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/98 animate-in slide-in-from-bottom-5">
           <div className="bg-slate-900 w-full h-full md:max-w-4xl md:h-[85vh] md:rounded-[3rem] flex flex-col border-t border-slate-800 relative">
              <div className="p-8 flex justify-between items-center bg-slate-950/40 rounded-t-[3rem]">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Clock size={28}/></div>
                    <div>
                       <h2 className="text-2xl font-black text-white uppercase italic">{recordToStatements.student?.name}</h2>
                       <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.4em]">Transaction Sequence</p>
                    </div>
                 </div>
                 <button onClick={() => setShowStatements(false)} className="bg-slate-950 p-3 rounded-2xl text-slate-500 hover:text-white border border-slate-800"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6">
                 {statements.map((s, i) => (
                    <div key={i} className={`p-6 rounded-3xl border ${s.balance === 0 ? 'bg-slate-900 border-slate-800' : 'bg-rose-500/5 border-rose-500/10'}`}>
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <p className="text-white font-black uppercase text-[15px]">{s.type === 'Other' ? (s.description || 'Record') : 'Tuition Fee'}</p>
                             <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{s.month} • {new Date(s.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-white font-black text-lg tabular-nums">Rs. {s.totalAmount.toLocaleString()}</p>
                             <p className={`text-[9px] font-black uppercase tracking-widest ${s.status === 'Paid' ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`}>{s.status}</p>
                          </div>
                       </div>
                       {s.paymentHistory && s.paymentHistory.length > 0 && (
                         <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800/50">
                            {s.paymentHistory.map((ph, idx) => (
                               <div key={idx} className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-[9px] font-bold text-slate-400">
                                  {new Date(ph.date).toLocaleDateString()}: <span className="text-emerald-500">+{ph.amount}</span>
                               </div>
                            ))}
                         </div>
                       )}
                    </div>
                 ))}
                 {statements.length === 0 && <div className="text-center py-20 text-slate-700 font-black uppercase tracking-widest">No transaction history</div>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
