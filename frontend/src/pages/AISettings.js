import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { AuthContext } from '../context/AuthContext';
import BRANDING from '../branding';
import {
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  Cpu,
  Globe,
  BookOpen,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Bot,
  Zap,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-toastify';

const DEFAULT_MODEL = 'gemini-3.5-flash';

const AISettings = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const keySyncTimer = useRef(null);

  const [form, setForm] = useState({
    geminiApiKey: '',
    modelName: DEFAULT_MODEL,
    region: 'Pakistan (National / Provincial Curriculum)',
    curriculum: 'Oxford / Federal Board Curriculum',
    languagePreference: 'Bilingual / Roman Urdu Friendly',
    studentSystemPrompt: '',
    teacherSystemPrompt: '',
    isStudentAIEnabled: true,
    isTeacherAIEnabled: true
  });

  useEffect(() => {
    fetchSettings();
    return () => {
      if (keySyncTimer.current) clearTimeout(keySyncTimer.current);
    };
  }, []);

  const fetchLiveModels = async (key, { silent = true } = {}) => {
    const keyToUse = (key || '').trim();
    if (!keyToUse || keyToUse.length < 10) return;

    try {
      setFetchingModels(true);
      const res = await axios.post(`${API_BASE_URL}/api/ai/models`, {
        apiKey: keyToUse
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.models && res.data.models.length > 0) {
        setAvailableModels(res.data.models);
        if (!silent) {
          toast.success(`Synced ${res.data.models.length} live Gemini models`);
        }
        // Keep default / saved model if still valid; otherwise prefer gemini-3.5-flash
        setForm((prev) => {
          const ids = res.data.models.map((m) => m.id);
          if (ids.includes(prev.modelName)) return prev;
          if (ids.includes(DEFAULT_MODEL)) return { ...prev, modelName: DEFAULT_MODEL };
          return { ...prev, modelName: ids[0] };
        });
      } else if (!silent) {
        toast.info('No models returned from Google for this key.');
      }
    } catch (err) {
      console.warn('Could not auto-fetch models:', err.message);
      if (!silent) {
        toast.error(err.response?.data?.msg || 'Failed to sync models from Google');
      }
    } finally {
      setFetchingModels(false);
    }
  };

  const scheduleModelSync = (key) => {
    if (keySyncTimer.current) clearTimeout(keySyncTimer.current);
    keySyncTimer.current = setTimeout(() => {
      fetchLiveModels(key, { silent: true });
    }, 700);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/ai/admin-settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data) {
        const savedModel = res.data.modelName || DEFAULT_MODEL;
        setForm({
          geminiApiKey: res.data.geminiApiKey || '',
          modelName: savedModel,
          region: res.data.region || 'Pakistan (National / Provincial Curriculum)',
          curriculum: res.data.curriculum || 'Oxford / Federal Board Curriculum',
          languagePreference: res.data.languagePreference || 'Bilingual / Roman Urdu Friendly',
          studentSystemPrompt: res.data.studentSystemPrompt || '',
          teacherSystemPrompt: res.data.teacherSystemPrompt || '',
          isStudentAIEnabled: res.data.isStudentAIEnabled !== false,
          isTeacherAIEnabled: res.data.isTeacherAIEnabled !== false
        });

        if (res.data.geminiApiKey) {
          fetchLiveModels(res.data.geminiApiKey, { silent: true });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, modelName: form.modelName || DEFAULT_MODEL };
      await axios.post(`${API_BASE_URL}/api/ai/admin-settings`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('AI Settings & API Key updated successfully!');
      if (payload.geminiApiKey?.trim()) {
        await fetchLiveModels(payload.geminiApiKey, { silent: false });
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!form.geminiApiKey.trim()) {
      return toast.warning('Please enter a Google Gemini API Key first.');
    }
    try {
      setTesting(true);
      setTestResult(null);
      const res = await axios.post(`${API_BASE_URL}/api/ai/test-connection`, {
        apiKey: form.geminiApiKey,
        modelName: form.modelName || DEFAULT_MODEL
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTestResult({
        success: true,
        msg: res.data.msg,
        sample: res.data.sampleResponse
      });
      toast.success('Gemini API Connected Successfully!');
      await fetchLiveModels(form.geminiApiKey, { silent: false });
    } catch (err) {
      setTestResult({
        success: false,
        msg: err.response?.data?.msg || 'Connection failed'
      });
      toast.error(err.response?.data?.msg || 'Gemini API Connection failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Loading AI Control Center...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-xl shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
              <Bot size={28} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white uppercase tracking-tight">AI Control Center & API Management</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={12} /> Google Gemini
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Configure school-wide Gemini API key, textbook curriculum, grade-level behavior, and role access
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Save AI Configuration</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* API Key & Model Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <KeyRound size={18} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Gemini API Key & Model Setup</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Master Key</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Google Gemini API Key (Secret)
              </label>
              <div className="relative mt-1.5 flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={form.geminiApiKey}
                  onChange={(e) => {
                    const nextKey = e.target.value;
                    setForm({ ...form, geminiApiKey: nextKey });
                    scheduleModelSync(nextKey);
                  }}
                  onBlur={() => {
                    if (form.geminiApiKey.trim().length >= 10) {
                      fetchLiveModels(form.geminiApiKey, { silent: false });
                    }
                  }}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs px-4 py-3.5 pr-28 rounded-xl focus:border-blue-500 outline-none transition-all"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                    title={showApiKey ? 'Hide Key' : 'Reveal Key'}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1"
                  >
                    {testing ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                    <span>Test</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 ml-1">
                Models auto-sync when you paste/save/test the key. Student & Teacher AI portals use the selected model automatically (default: gemini-3.5-flash).
              </p>
            </div>

            {testResult && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{testResult.msg}</span>
                </div>
                {testResult.sample && (
                  <span className="text-[10px] font-mono bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    Sample: {testResult.sample}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Gemini Model Selection
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!form.geminiApiKey.trim()) {
                          return toast.warning('Please enter your Gemini API Key first.');
                        }
                        fetchLiveModels(form.geminiApiKey, { silent: false });
                      }}
                      disabled={fetchingModels}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                      title="Sync live models for this API key"
                    >
                      <RefreshCw size={11} className={fetchingModels ? 'animate-spin' : ''} />
                      <span>{fetchingModels ? 'Syncing...' : 'Sync Models'}</span>
                    </button>
                    <span className="text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomModel(!isCustomModel)}
                      className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      {isCustomModel ? 'Use Dropdown' : 'Type Custom'}
                    </button>
                  </div>
                </div>

                {isCustomModel ? (
                  <div className="mt-1.5">
                    <input
                      type="text"
                      value={form.modelName}
                      onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                      placeholder="e.g. gemini-3.5-flash"
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs px-4 py-3 rounded-xl focus:border-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 ml-1">
                      Default recommended model: gemini-3.5-flash
                    </p>
                  </div>
                ) : (
                  <select
                    value={form.modelName}
                    onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                    className="w-full mt-1.5 bg-slate-950 border border-slate-800 text-white font-bold text-xs px-4 py-3 rounded-xl focus:border-blue-500 outline-none"
                  >
                    {availableModels.length > 0 && (
                      <optgroup label="✨ Live Models Available on Your Key">
                        {availableModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.id} ({m.id})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="🔥 Recommended & Standard Models">
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default · Recommended)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    </optgroup>
                  </select>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Language Preference
                </label>
                <select
                  value={form.languagePreference}
                  onChange={(e) => setForm({ ...form, languagePreference: e.target.value })}
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 text-white font-bold text-xs px-4 py-3 rounded-xl focus:border-blue-500 outline-none"
                >
                  <option value="Bilingual / Roman Urdu Friendly">Bilingual / Roman Urdu Friendly (Urdu + English)</option>
                  <option value="English">English Only</option>
                  <option value="Urdu">Urdu (Nastaliq / Urdu Script)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum & Regional Board Alignment */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Globe size={18} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Regional Syllabus & Textbook Settings</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Region / Educational Territory
              </label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full mt-1.5 bg-slate-950 border border-slate-800 text-white font-bold text-xs px-4 py-3 rounded-xl focus:border-blue-500 outline-none"
                placeholder="e.g. Pakistan (Karachi / Lahore / Islamabad)"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Board / Textbook Curriculum
              </label>
              <input
                type="text"
                value={form.curriculum}
                onChange={(e) => setForm({ ...form, curriculum: e.target.value })}
                className="w-full mt-1.5 bg-slate-950 border border-slate-800 text-white font-bold text-xs px-4 py-3 rounded-xl focus:border-blue-500 outline-none"
                placeholder="e.g. Oxford University Press / Federal Board FBISE / Cambridge"
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles & Role Access */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Portal Access & Feature Toggles</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wide">Student AI Companion</p>
                <p className="text-[11px] text-slate-400">Allow students & parents to access personalized AI tutoring</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, isStudentAIEnabled: !form.isStudentAIEnabled })}
                className="text-blue-500 hover:text-blue-400 transition-colors"
              >
                {form.isStudentAIEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-600" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wide">Teacher AI Productivity Suite</p>
                <p className="text-[11px] text-slate-400">Allow teachers to generate lesson plans, quizzes & remarks</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, isTeacherAIEnabled: !form.isTeacherAIEnabled })}
                className="text-blue-500 hover:text-blue-400 transition-colors"
              >
                {form.isTeacherAIEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* System Prompt Customization */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Sliders size={18} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Custom AI System Instructions & Directives</h2>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Student AI Tutor Persona (Visual Diagrams & Empathy Directives)
              </label>
              <textarea
                value={form.studentSystemPrompt}
                onChange={(e) => setForm({ ...form, studentSystemPrompt: e.target.value })}
                rows={4}
                className="w-full mt-1.5 bg-slate-950 border border-slate-800 text-white font-mono text-xs p-3.5 rounded-xl focus:border-blue-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Teacher AI Assistant Directive (Pedagogical & Lesson Planning Directives)
              </label>
              <textarea
                value={form.teacherSystemPrompt}
                onChange={(e) => setForm({ ...form, teacherSystemPrompt: e.target.value })}
                rows={3}
                className="w-full mt-1.5 bg-slate-950 border border-slate-800 text-white font-mono text-xs p-3.5 rounded-xl focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AISettings;
