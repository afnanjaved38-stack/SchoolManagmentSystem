import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Sun, 
  CloudRain, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  X, 
  Layers,
  MapPin
} from 'lucide-react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';

const HolidaysManager = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('single'); // 'single' or 'range'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    type: 'Public Holiday',
    startDate: '',
    endDate: '',
    description: '',
    appliesTo: 'All'
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/holidays`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setHolidays(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load school holidays');
      setLoading(false);
    }
  };

  const openSingleDayModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      title: '',
      type: 'Public Holiday',
      startDate: today,
      endDate: today,
      description: '',
      appliesTo: 'All'
    });
    setModalMode('single');
    setShowModal(true);
  };

  const openVacationModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      title: 'Summer Vacations 2026',
      type: 'Summer Vacation',
      startDate: today,
      endDate: today,
      description: 'Annual summer break for all grades',
      appliesTo: 'All'
    });
    setModalMode('range');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.startDate || !form.endDate) {
      return toast.warning('Please fill in title and dates');
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...form,
        endDate: modalMode === 'single' ? form.startDate : form.endDate
      };

      await axios.post(`${API_BASE_URL}/api/holidays`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(modalMode === 'single' ? 'Single-day holiday declared!' : 'Vacation period scheduled successfully!');
      setShowModal(false);
      fetchHolidays();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || 'Error saving holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/holidays/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Holiday deleted');
      setHolidays(holidays.filter(h => h._id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete holiday');
    }
  };

  const getStatusBadge = (h) => {
    const now = new Date();
    const start = new Date(h.startDate);
    const end = new Date(h.endDate);

    if (now >= start && now <= end) {
      return (
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active Now
        </span>
      );
    }
    if (now < start) {
      return (
        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
          Upcoming
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-slate-800 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-wider">
        Past
      </span>
    );
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Summer Vacation':
        return <Sun size={18} className="text-amber-400" />;
      case 'Winter Vacation':
        return <Sparkles size={18} className="text-cyan-400" />;
      case 'Emergency Holiday':
      case 'School Closure':
        return <CloudRain size={18} className="text-rose-400" />;
      default:
        return <CalendarIcon size={18} className="text-purple-400" />;
    }
  };

  const calculateDays = (s, e) => {
    const start = new Date(s);
    const end = new Date(e);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const now = new Date();
  const activeCount = holidays.filter(h => new Date(h.startDate) <= now && new Date(h.endDate) >= now).length;
  const upcomingCount = holidays.filter(h => new Date(h.startDate) > now).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">Holidays & Vacations</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Official School Closures, Dynamic Chutti & Summer/Winter Vacations
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={openSingleDayModal}
            className="px-5 py-3.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Clock size={16} /> Declare 1-Day Holiday (Chutti)
          </button>
          <button
            type="button"
            onClick={openVacationModal}
            className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2"
          >
            <Sun size={16} /> Declare Vacations (Break)
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Declared</div>
          <div className="text-3xl font-black text-white">{holidays.length}</div>
          <p className="text-[10px] text-slate-500">School holidays & vacation periods</p>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Right Now</div>
          <div className="text-3xl font-black text-emerald-400">{activeCount}</div>
          <p className="text-[10px] text-slate-500">Ongoing school break or closed day</p>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Upcoming Holidays</div>
          <div className="text-3xl font-black text-blue-400">{upcomingCount}</div>
          <p className="text-[10px] text-slate-500">Scheduled on academic calendar</p>
        </div>
      </div>

      {/* Notice info banner */}
      <div className="p-5 bg-blue-950/20 border border-blue-500/20 rounded-2xl flex items-start gap-4 text-xs text-blue-300">
        <Info size={20} className="shrink-0 text-blue-400 mt-0.5" />
        <div className="space-y-1">
          <div className="font-black uppercase tracking-wider">Automated Attendance Protection</div>
          <p className="text-[11px] text-slate-400 font-medium">
            On any declared single-day holiday or vacation range, the attendance system will automatically recognize the school as closed. Students and teachers will not be marked Absent.
          </p>
        </div>
      </div>

      {/* Holidays List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">All Holiday & Vacation Records</h3>
          <span className="text-xs text-slate-500 font-bold">{holidays.length} records</span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500 font-bold">Loading holidays calendar...</div>
        ) : holidays.length === 0 ? (
          <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <CalendarIcon size={36} className="mx-auto text-slate-600" />
            <div className="text-sm font-black text-white uppercase tracking-wider">No Holidays Declared Yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Declare single-day holidays (e.g. Wednesday Rain Day) or annual vacations to automate school schedules.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {holidays.map(h => {
              const daysCount = calculateDays(h.startDate, h.endDate);
              const isSingleDay = daysCount === 1;

              return (
                <div 
                  key={h._id}
                  className="p-6 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl space-y-4 transition-all shadow-lg hover:shadow-2xl relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                        {getTypeIcon(h.type)}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white uppercase tracking-tight">{h.title}</h4>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h.type}</span>
                      </div>
                    </div>
                    {getStatusBadge(h)}
                  </div>

                  {h.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{h.description}</p>
                  )}

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Duration:</span>
                      <span className="font-black text-white">
                        {isSingleDay ? '1 Day (Single Day)' : `${daysCount} Days`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Dates:</span>
                      <span className="font-bold text-purple-300">
                        {new Date(h.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {!isSingleDay && ` - ${new Date(h.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Applies To:</span>
                      <span className="font-black text-emerald-400 uppercase text-[10px]">{h.appliesTo}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDelete(h._id, h.title)}
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Delete Holiday"
                    >
                      <Trash2 size={14} />
                      <span className="text-[10px] uppercase">Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 custom-scrollbar">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                {modalMode === 'single' ? <Clock size={20} className="text-purple-400" /> : <Sun size={20} className="text-amber-400" />}
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  {modalMode === 'single' ? 'Declare 1-Day Holiday (Chutti)' : 'Declare Vacation Period'}
                </h2>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Holiday / Vacation Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalMode === 'single' ? 'e.g. Iqbal Day / Rain Emergency Holiday' : 'e.g. Summer Vacations 2026'}
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-purple-500 font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Category / Type
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-purple-500 font-bold text-sm [color-scheme:dark]"
                  >
                    <option value="Public Holiday">Public Holiday</option>
                    <option value="Summer Vacation">Summer Vacation</option>
                    <option value="Winter Vacation">Winter Vacation</option>
                    <option value="Emergency Holiday">Emergency Holiday (Chutti)</option>
                    <option value="School Closure">School Closure</option>
                    <option value="Local Holiday">Local Holiday</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Applies To
                  </label>
                  <select
                    value={form.appliesTo}
                    onChange={e => setForm({ ...form, appliesTo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-purple-500 font-bold text-sm [color-scheme:dark]"
                  >
                    <option value="All">All (Students & Teachers)</option>
                    <option value="Students">Students Only</option>
                    <option value="Faculty">Faculty / Teachers Only</option>
                  </select>
                </div>
              </div>

              {modalMode === 'single' ? (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Holiday Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-purple-500 font-bold text-sm [color-scheme:dark]"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Vacation Starts On *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={e => setForm({ ...form, startDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-purple-500 font-bold text-sm [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Vacation Ends On *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.endDate}
                      onChange={e => setForm({ ...form, endDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-purple-500 font-bold text-sm [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Description / Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. As announced by District Administration due to heavy rain"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-purple-500 font-bold text-sm custom-scrollbar"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-purple-900/30 uppercase text-xs tracking-wider disabled:opacity-50 mt-4"
              >
                {isSubmitting ? 'Saving...' : modalMode === 'single' ? 'Confirm 1-Day Holiday' : 'Save Vacation Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidaysManager;
