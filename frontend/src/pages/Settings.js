import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { toast } from 'react-toastify';
import { Settings as SettingsIcon, Clock, Shield, Save, Loader2, Receipt, Phone } from 'lucide-react';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    teacherStartTime: '07:00',
    teacherEndTime: '10:00',
    adminStartTime: '00:00',
    adminEndTime: '23:59',
    showFullFeeOnVoucher: true,
    showPreviousDuesOnVoucher: false,
    showTeacherPhoneToStudents: true,
    showTeacherPhoneToParents: true,
    showFeesOnStudentPortal: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/settings`);
      if (res.data) {
        setSettings({
          teacherStartTime: res.data.teacherStartTime || '07:00',
          teacherEndTime: res.data.teacherEndTime || '10:00',
          adminStartTime: res.data.adminStartTime || '00:00',
          adminEndTime: res.data.adminEndTime || '23:59',
          showFullFeeOnVoucher: res.data.showFullFeeOnVoucher !== false,
          showPreviousDuesOnVoucher: res.data.showPreviousDuesOnVoucher === true,
          showTeacherPhoneToStudents: res.data.showTeacherPhoneToStudents !== false,
          showTeacherPhoneToParents: res.data.showTeacherPhoneToParents !== false,
          showFeesOnStudentPortal: res.data.showFeesOnStudentPortal !== false
        });
      }
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load settings');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/settings`, settings);
      if (res.data) {
        setSettings({
          teacherStartTime: res.data.teacherStartTime || '07:00',
          teacherEndTime: res.data.teacherEndTime || '10:00',
          adminStartTime: res.data.adminStartTime || '00:00',
          adminEndTime: res.data.adminEndTime || '23:59',
          showFullFeeOnVoucher: res.data.showFullFeeOnVoucher !== false,
          showPreviousDuesOnVoucher: res.data.showPreviousDuesOnVoucher === true,
          showTeacherPhoneToStudents: res.data.showTeacherPhoneToStudents !== false,
          showTeacherPhoneToParents: res.data.showTeacherPhoneToParents !== false,
          showFeesOnStudentPortal: res.data.showFeesOnStudentPortal !== false
        });
      }
      toast.success('Settings updated successfully');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Portal Settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <SettingsIcon className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Portal <span className="text-blue-500">Settings</span>
            </h1>
            <p className="text-slate-500 mt-2 font-black uppercase text-[10px] tracking-[0.3em]">
              Global configuration and timing protocols
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teacher Timing Block */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <Clock className="text-blue-500" size={20} />
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Teacher Attendance</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Daily Start Time</label>
                <input
                  type="time"
                  value={settings.teacherStartTime}
                  onChange={(e) => setSettings({...settings, teacherStartTime: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all [color-scheme:dark]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Daily End Time</label>
                <input
                  type="time"
                  value={settings.teacherEndTime}
                  onChange={(e) => setSettings({...settings, teacherEndTime: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl">
              <p className="text-[9px] text-blue-400 font-bold leading-relaxed uppercase tracking-wider">
                Note: Teachers will only be able to mark attendance within this window. They cannot mark for past or future dates.
              </p>
            </div>
          </div>

          {/* Admin Timing Block */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <Shield className="text-blue-500" size={20} />
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Admin Attendance</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Daily Start Time</label>
                <input
                  type="time"
                  value={settings.adminStartTime}
                  onChange={(e) => setSettings({...settings, adminStartTime: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all [color-scheme:dark]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Daily End Time</label>
                <input
                  type="time"
                  value={settings.adminEndTime}
                  onChange={(e) => setSettings({...settings, adminEndTime: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-xl">
              <p className="text-[9px] text-indigo-400 font-bold leading-relaxed uppercase tracking-wider">
                Default: 00:00 to 23:59 allows full access for today's attendance only.
              </p>
            </div>
          </div>
        </div>

        {/* Voucher Fee Display Toggle */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Receipt className="text-blue-500" size={20} />
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Fee Voucher Settings</h2>
          </div>
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Show Full Fee on Voucher</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                {settings.showFullFeeOnVoucher 
                  ? 'Voucher will show original class fee (without discount applied)' 
                  : 'Voucher will show discounted fee (after student discount)'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, showFullFeeOnVoucher: !prev.showFullFeeOnVoucher }))}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                settings.showFullFeeOnVoucher ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                settings.showFullFeeOnVoucher ? 'translate-x-8' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div className="bg-amber-600/10 border border-amber-500/20 p-4 rounded-xl">
            <p className="text-[9px] text-amber-400 font-bold leading-relaxed uppercase tracking-wider">
              Note: This only affects the printed voucher text. Backend billing, student profile dues, and actual calculations always use the discounted amount.
            </p>
          </div>

          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Show Previous Dues on Voucher</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                {settings.showPreviousDuesOnVoucher 
                  ? 'Voucher will include previous outstanding dues along with current month fee' 
                  : 'Voucher will only show the current month fee'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, showPreviousDuesOnVoucher: !prev.showPreviousDuesOnVoucher }))}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                settings.showPreviousDuesOnVoucher ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                settings.showPreviousDuesOnVoucher ? 'translate-x-8' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Show Fees on Student Portal</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                {settings.showFeesOnStudentPortal !== false
                  ? 'Students can view their fee status, balance dues, and fee vouchers on Student Portal' 
                  : 'Fee page, fee cards, and dues are completely hidden from the Student Portal'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, showFeesOnStudentPortal: !prev.showFeesOnStudentPortal }))}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                settings.showFeesOnStudentPortal !== false ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                settings.showFeesOnStudentPortal !== false ? 'translate-x-8' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Faculty Phone Privacy & Portal Visibility */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Phone className="text-blue-500" size={20} />
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Faculty Phone Privacy Settings</h2>
          </div>

          <div className="space-y-4">
            {/* Toggle 1: Show to Students */}
            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-5 rounded-2xl">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Show Teacher Phone to Students</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                  {settings.showTeacherPhoneToStudents 
                    ? 'Students can see their Class Teacher phone number on their dashboard' 
                    : 'Teacher phone number is hidden from Student Portal'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, showTeacherPhoneToStudents: !prev.showTeacherPhoneToStudents }))}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  settings.showTeacherPhoneToStudents ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                  settings.showTeacherPhoneToStudents ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Toggle 2: Show to Parents */}
            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-5 rounded-2xl">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Show Teacher Phone to Parents</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                  {settings.showTeacherPhoneToParents 
                    ? 'Parents can view the Class Teacher contact number on their portal' 
                    : 'Teacher phone number is hidden from Parent Portal'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, showTeacherPhoneToParents: !prev.showTeacherPhoneToParents }))}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  settings.showTeacherPhoneToParents ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                  settings.showTeacherPhoneToParents ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all flex items-center gap-3 disabled:opacity-50 group hover:scale-[1.02] active:scale-95"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Synchronizing...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
