import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import BRANDING from '../branding';
import { AuthContext } from '../context/AuthContext';
import { 
  Wallet, 
  Receipt, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X,
  ShieldCheck,
  Download,
  Info,
  Users,
  GraduationCap
} from 'lucide-react';
import { toast } from 'react-toastify';

const MyFees = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');

  useEffect(() => {
    fetchFeeData();
  }, []);

  const fetchFeeData = async (childId = selectedChildId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/students/portal/me${childId ? `?studentId=${childId}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPortalData(res.data);
      if (res.data.allChildren && res.data.allChildren.length > 0 && !selectedChildId) {
        setSelectedChildId(res.data.allChildren[0]._id);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load fee records');
      setLoading(false);
    }
  };

  const student = portalData?.student;
  const feeRecords = portalData?.feeRecords || [];
  const activeYear = portalData?.activeYear;
  const allAcademicYears = portalData?.allAcademicYears || [];

  const [selectedYearFilter, setSelectedYearFilter] = useState('active');

  const formatYearMonth = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Filter records based on selected academic year
  const filteredRecords = feeRecords.filter(fee => {
    if (selectedYearFilter === 'all') return true;
    if (selectedYearFilter === 'active' && activeYear?.startDate && activeYear?.endDate) {
      const startM = formatYearMonth(activeYear.startDate);
      const endM = formatYearMonth(activeYear.endDate);
      return fee.month && fee.month >= startM && fee.month <= endM;
    }
    const targetYear = allAcademicYears.find(y => y._id === selectedYearFilter);
    if (targetYear?.startDate && targetYear?.endDate) {
      const startM = formatYearMonth(targetYear.startDate);
      const endM = formatYearMonth(targetYear.endDate);
      return fee.month && fee.month >= startM && fee.month <= endM;
    }
    return true;
  });

  const sessionInvoiced = portalData?.sessionInvoiced ?? filteredRecords.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
  const sessionPaid = portalData?.sessionPaid ?? filteredRecords.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
  const totalBalance = portalData?.totalDues || 0; // True cumulative / lifetime pending balance

  const handlePrintReferenceReceipt = (fee) => {
    const style = `
      <style>
        @page { size: A5 portrait; margin: 10mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; padding: 15px; }
        .receipt-card { border: 2px dashed #94a3b8; border-radius: 12px; padding: 20px; position: relative; background: #fff; }
        .watermark { position: absolute; top: 40%; left: 10%; transform: rotate(-30deg); font-size: 26px; font-weight: 900; color: rgba(239, 68, 68, 0.12); text-transform: uppercase; border: 3px solid rgba(239, 68, 68, 0.2); padding: 10px 20px; border-radius: 8px; pointer-events: none; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px; }
        .school-name { font-size: 18px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; }
        .school-tagline { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .slip-badge { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 11px; }
        .info-row { display: flex; justify-content: space-between; }
        .info-label { font-weight: 700; color: #64748b; }
        .info-val { font-weight: 900; color: #0f172a; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
        th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        .total-row { font-weight: 900; font-size: 12px; background: #fafafa; }
        .disclaimer { margin-top: 15px; padding: 10px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; font-size: 9px; color: #9f1239; line-height: 1.4; }
        .footer { margin-top: 15px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8; font-weight: 700; }
      </style>
    `;

    const isWaived = fee.status === 'Waived';
    const content = `
      <div class="receipt-card">
        <div class="watermark">${isWaived ? 'FEE WAIVED' : 'ONLINE COPY · FOR INFO ONLY'}</div>
        
        <div class="header">
          <div>
            <div class="school-name">${BRANDING.schoolName}</div>
            <div class="school-tagline">${BRANDING.productName} · Student Fee Record</div>
          </div>
          <div class="slip-badge">${isWaived ? 'Official Fee Waiver' : 'Online Statement Copy'}</div>
        </div>

        <div class="info-grid">
          <div class="info-row"><span class="info-label">Student Name:</span> <span class="info-val">${student?.name}</span></div>
          <div class="info-row"><span class="info-label">Registration No:</span> <span class="info-val">${student?.regNo}</span></div>
          <div class="info-row"><span class="info-label">Grade / Class:</span> <span class="info-val">${student?.class?.name} - ${student?.section?.name || 'A'}</span></div>
          <div class="info-row"><span class="info-label">Father Name:</span> <span class="info-val">${student?.fatherName}</span></div>
          <div class="info-row"><span class="info-label">Billing Month:</span> <span class="info-val">${fee.month || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Issued Date:</span> <span class="info-val">${new Date().toLocaleDateString('en-GB')}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description / Fee Type</th>
              <th style="text-align: right;">Base Amount</th>
              <th style="text-align: right;">Concession / Waiver</th>
              <th style="text-align: right;">Net Payable</th>
              <th style="text-align: right;">Paid Amount</th>
              <th style="text-align: right;">Remaining Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: 700;">${fee.type} ${fee.description ? `(${fee.description})` : ''}</td>
              <td style="text-align: right;">Rs. ${(fee.amount || fee.totalAmount)?.toLocaleString()}</td>
              <td style="text-align: right; color: #8b5cf6; font-weight: 700;">Rs. ${((fee.concession || 0) + (fee.discount || 0))?.toLocaleString()}</td>
              <td style="text-align: right; font-weight: 900;">Rs. ${fee.totalAmount?.toLocaleString()}</td>
              <td style="text-align: right; color: #059669; font-weight: 700;">Rs. ${fee.paidAmount?.toLocaleString()}</td>
              <td style="text-align: right; color: ${fee.balance > 0 ? '#e11d48' : '#059669'}; font-weight: 900;">Rs. ${fee.balance?.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td colspan="5" style="text-align: right;">Status:</td>
              <td style="text-align: right; text-transform: uppercase; color: ${fee.status === 'Paid' || fee.status === 'Waived' ? '#059669' : '#e11d48'};">${fee.status}</td>
            </tr>
            ${fee.waiverReason ? `
            <tr>
              <td colspan="6" style="font-size: 10px; color: #64748b; font-style: italic;">
                <strong>Note / Waiver Remarks:</strong> ${fee.waiverReason}
              </td>
            </tr>` : ''}
          </tbody>
        </table>

        <div class="disclaimer">
          <strong>IMPORTANT NOTICE:</strong> This is a digital reference statement generated for personal record-keeping only. Official monthly fee bank challans are issued strictly by the school administration office.
        </div>

        <div class="footer">
          <div>Generated by ${user?.name || 'User'} (${user?.role?.toUpperCase()})</div>
          <div>${BRANDING.fullProductLabel}</div>
        </div>
      </div>
    `;

    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>FeeReceipt_${student?.name}_${fee.month}</title>${style}</head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Fee History...</div>;
  }

  // If student tries to access while fees are hidden
  if (user?.role === 'student' && portalData?.showFeesOnStudentPortal === false) {
    return (
      <div className="max-w-2xl mx-auto my-16 bg-slate-900 border border-slate-800 p-10 rounded-3xl text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <Wallet size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Fee Ledger Restricted</h2>
          <p className="text-slate-400 text-xs mt-2 max-w-md mx-auto leading-relaxed">
            Fee status and voucher access for student accounts has been disabled by the school administration. Parents can view and manage fee records via the Parent Portal.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
                {user?.role === 'parent' ? 'Child Fee ' : 'Fee '}
                <span className="text-rose-500">{user?.role === 'parent' ? 'Invoices & Ledger' : 'History & Vouchers'}</span>
              </h1>
              <p className="text-slate-500 mt-1 font-bold uppercase text-[10px] tracking-[0.3em]">
                {student?.name} (#{student?.regNo}) • Grade {student?.class?.name} - {student?.section?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {activeYear && (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-2xl shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">{activeYear.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl shadow-sm">
            <Info size={16} className="text-blue-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Online Reference View</span>
          </div>
        </div>
      </header>

      {/* Multi-Child Selector for Parent */}
      {user?.role === 'parent' && portalData?.allChildren?.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-rose-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Select Child:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {portalData.allChildren.map(child => (
              <button
                key={child._id}
                onClick={() => {
                  setSelectedChildId(child._id);
                  fetchFeeData(child._id);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  student?._id === child._id
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
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

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Invoiced</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Receipt size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-white">Rs. {sessionInvoiced.toLocaleString()}</div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            {activeYear ? `${activeYear.name} Billing` : 'Current Year Billing'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Paid</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-400">Rs. {sessionPaid.toLocaleString()}</div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            {activeYear ? `${activeYear.name} Verified Cash` : 'Verified Received Cash'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Outstanding Dues</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
          <div className={`text-2xl md:text-3xl font-black ${totalBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            Rs. {totalBalance.toLocaleString()}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest mt-1 text-slate-500">
            {totalBalance > 0 ? 'Total Cumulative Pending' : 'All Lifetime Dues Cleared'}
          </div>
        </div>
      </div>

      {/* Info Alert Box */}
      <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl flex items-start gap-4">
        <ShieldCheck size={24} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider">Official Bank Challan Notice</h4>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            The printable receipts below are digital reference statements for student and parent tracking. Official 3-copy bank challans for monthly bank deposits are issued strictly by the school administration office.
          </p>
        </div>
      </div>

      {/* Fee Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">Billing & Ledger Breakdown</h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Monthly tuition, exams & concession records</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Session Filter */}
            {allAcademicYears.length > 0 && (
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase outline-none focus:border-blue-500/50 cursor-pointer"
              >
                <option value="active">Active Session ({activeYear?.name || 'Current'})</option>
                <option value="all">All Academic Sessions</option>
                {allAcademicYears.map(y => (
                  <option key={y._id} value={y._id}>{y.name} {y.isActive ? '(Active)' : ''}</option>
                ))}
              </select>
            )}
            <span className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
              {filteredRecords.length} Records
            </span>
          </div>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800/60 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="pb-3 px-4">Billing Month</th>
                  <th className="pb-3 px-4">Fee Category</th>
                  <th className="pb-3 px-4">Net Amount</th>
                  <th className="pb-3 px-4">Paid Amount</th>
                  <th className="pb-3 px-4">Remaining Balance</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4 text-right">Reference Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredRecords.map((fee) => (
                  <tr key={fee._id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-white uppercase text-xs">
                      {fee.month ? new Date(fee.month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-200 font-bold text-xs">{fee.type}</div>
                      {((fee.concession || 0) > 0 || (fee.discount || 0) > 0 || fee.waiverReason) && (
                        <div className="text-[9px] font-bold text-purple-400 mt-0.5 truncate max-w-[200px]" title={fee.waiverReason || 'Concession / Discount'}>
                          {fee.waiverReason ? fee.waiverReason : `Concession: Rs. ${((fee.concession || 0) + (fee.discount || 0)).toLocaleString()}`}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 font-black text-white text-xs">Rs. {fee.totalAmount?.toLocaleString()}</td>
                    <td className="py-4 px-4 font-bold text-emerald-400 text-xs">Rs. {fee.paidAmount?.toLocaleString()}</td>
                    <td className="py-4 px-4 font-black text-rose-400 text-xs">Rs. {fee.balance?.toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        fee.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        fee.status === 'Waived' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        fee.status === 'Partial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {fee.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedFee(fee);
                            setShowReceiptModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                        >
                          <Receipt size={14} />
                          <span className="text-[9px] uppercase">View</span>
                        </button>
                        <button
                          onClick={() => handlePrintReferenceReceipt(fee)}
                          className="p-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded-xl transition-all"
                          title="Print Reference Receipt"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            <Receipt size={36} className="mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No fee invoices recorded for the selected session</p>
          </div>
        )}
      </div>

      {/* Digital Receipt Modal */}
      {showReceiptModal && selectedFee && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Digital Statement Receipt</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Student Reference Copy</p>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Watermark Banner */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  ⚠️ Informational Copy Only · Official Bank Challans are Issued by School Office
                </span>
              </div>

              {/* Student Details Grid */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Student:</span> <span className="font-bold text-white uppercase">{student?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Registration No:</span> <span className="font-bold text-blue-400">#{student?.regNo}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Class & Section:</span> <span className="font-bold text-white uppercase">{student?.class?.name} - {student?.section?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Billing Period:</span> <span className="font-bold text-white uppercase">{selectedFee.month || 'N/A'}</span></div>
              </div>

              {/* Financials Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[9px] font-black text-slate-500 uppercase">Charges</div>
                  <div className="text-sm font-black text-white mt-1">Rs. {selectedFee.totalAmount?.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[9px] font-black text-emerald-500 uppercase">Paid</div>
                  <div className="text-sm font-black text-emerald-400 mt-1">Rs. {selectedFee.paidAmount?.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[9px] font-black text-rose-500 uppercase">Balance</div>
                  <div className="text-sm font-black text-rose-400 mt-1">Rs. {selectedFee.balance?.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  selectedFee.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  selectedFee.status === 'Partial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {selectedFee.status}
                </span>
              </div>

              <button
                onClick={() => handlePrintReferenceReceipt(selectedFee)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Print Reference Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyFees;
