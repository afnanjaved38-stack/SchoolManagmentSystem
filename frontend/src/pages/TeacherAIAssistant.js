import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { AuthContext } from '../context/AuthContext';
import BRANDING from '../branding';
import AIMarkdownRenderer from '../components/AIMarkdownRenderer';
import {
  Sparkles,
  BookOpen,
  ClipboardList,
  CheckSquare,
  FileText,
  UserCheck,
  Send,
  Copy,
  Check,
  Printer,
  RefreshCw,
  Sliders,
  Layers,
  GraduationCap,
  Bot
} from 'lucide-react';
import { toast } from 'react-toastify';

const TeacherAIAssistant = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('lesson-plan');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [classes, setClasses] = useState([]);
  const [aiConfig, setAiConfig] = useState(null);

  // Form states
  const [lessonForm, setLessonForm] = useState({
    className: 'Class 5',
    subject: 'General Science',
    topic: 'Gravity and Gravitational Force',
    duration: '40 mins',
    learningObjectives: 'Students understand why objects fall to earth, gravitational pull, and simple weight concept.'
  });

  const [quizForm, setQuizForm] = useState({
    className: 'Class 5',
    subject: 'General Science',
    topic: 'Gravity and Solar System',
    numQuestions: 5,
    questionTypes: 'MCQs and Short Conceptual Questions',
    difficulty: 'Medium'
  });

  const [diagramForm, setDiagramForm] = useState({
    subject: 'Science',
    topic: 'Gravity on Earth vs Space',
    diagramGoal: 'Step-by-step visual comparison between falling apple, orbiting moon, and zero gravity.'
  });

  const [remarksForm, setRemarksForm] = useState({
    studentName: 'Ali Khan',
    subject: 'Science',
    marks: 14,
    totalMarks: 20,
    behavior: 'Attentive, participates actively in class discussions'
  });

  const [chatPrompt, setChatPrompt] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchAiConfig();
  }, []);

  const fetchAiConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/ai/config`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAiConfig(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (Array.isArray(res.data)) {
        setClasses(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async (toolType, payload) => {
    setLoading(true);
    setGeneratedOutput('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/ai/teacher/generate`, {
        toolType,
        payload
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setGeneratedOutput(res.data.result);
      toast.success('Generated successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.msg || 'Generation failed. Please verify AI Settings.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${BRANDING.productName} - Teacher AI Material</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1, h2, h3 { color: #1e3a8a; }
            pre { background: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 13px; }
            hr { border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h2>${BRANDING.schoolDisplayName} - Academic AI Materials</h2>
          <hr />
          <div>${generatedOutput.replace(/\n/g, '<br/>')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };



  const tabs = [
    { id: 'lesson-plan', label: 'Lesson Planner', icon: BookOpen },
    { id: 'quiz-maker', label: 'Quiz & Test Paper', icon: CheckSquare },
    { id: 'diagrams', label: 'Blackboard Diagrams', icon: Layers },
    { id: 'remarks', label: 'Report Card Remarks', icon: UserCheck },
    { id: 'general', label: 'Teaching Assistant Chat', icon: Bot }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Teacher AI Productivity Suite</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={11} /> {aiConfig?.modelName || 'Gemini AI'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Automated lesson preparation, quiz synthesis, blackboard flowcharts, and student feedback
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setGeneratedOutput(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Controls */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
          {activeTab === 'lesson-plan' && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <BookOpen size={18} className="text-blue-400" /> Lesson Plan Builder
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Class / Grade</label>
                  <input
                    type="text"
                    value={lessonForm.className}
                    onChange={(e) => setLessonForm({ ...lessonForm, className: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                    placeholder="e.g. Class 5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subject</label>
                  <input
                    type="text"
                    value={lessonForm.subject}
                    onChange={(e) => setLessonForm({ ...lessonForm, subject: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                    placeholder="e.g. Science"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lesson Topic / Chapter</label>
                <input
                  type="text"
                  value={lessonForm.topic}
                  onChange={(e) => setLessonForm({ ...lessonForm, topic: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                  placeholder="e.g. Gravity & Earth's Pull"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Period Duration</label>
                <input
                  type="text"
                  value={lessonForm.duration}
                  onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                  placeholder="e.g. 40 mins"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Key Learning Objectives</label>
                <textarea
                  value={lessonForm.learningObjectives}
                  onChange={(e) => setLessonForm({ ...lessonForm, learningObjectives: e.target.value })}
                  rows={3}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white p-3 rounded-xl text-xs font-medium focus:border-blue-500 outline-none resize-none"
                  placeholder="What should students master by the end of this lesson?"
                />
              </div>
              <button
                onClick={() => handleGenerate('lesson-plan', lessonForm)}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>Generate Comprehensive Lesson Plan</span>
              </button>
            </div>
          )}

          {activeTab === 'quiz-maker' && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <CheckSquare size={18} className="text-emerald-400" /> Quiz & Test Paper Generator
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Class</label>
                  <input
                    type="text"
                    value={quizForm.className}
                    onChange={(e) => setQuizForm({ ...quizForm, className: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subject</label>
                  <input
                    type="text"
                    value={quizForm.subject}
                    onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Topic / Units</label>
                <input
                  type="text"
                  value={quizForm.topic}
                  onChange={(e) => setQuizForm({ ...quizForm, topic: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">No. of Questions</label>
                  <input
                    type="number"
                    value={quizForm.numQuestions}
                    onChange={(e) => setQuizForm({ ...quizForm, numQuestions: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Difficulty</label>
                  <select
                    value={quizForm.difficulty}
                    onChange={(e) => setQuizForm({ ...quizForm, difficulty: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Challenging">Challenging / Advanced</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Question Types</label>
                <input
                  type="text"
                  value={quizForm.questionTypes}
                  onChange={(e) => setQuizForm({ ...quizForm, questionTypes: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                  placeholder="e.g. MCQs with Answer Keys & Short Conceptual Qs"
                />
              </div>
              <button
                onClick={() => handleGenerate('quiz-maker', quizForm)}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckSquare size={16} />}
                <span>Create Test Paper & Answer Key</span>
              </button>
            </div>
          )}

          {activeTab === 'diagrams' && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Layers size={18} className="text-cyan-400" /> Blackboard Visual & Flowchart Generator
              </h2>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subject</label>
                <input
                  type="text"
                  value={diagramForm.subject}
                  onChange={(e) => setDiagramForm({ ...diagramForm, subject: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Topic</label>
                <input
                  type="text"
                  value={diagramForm.topic}
                  onChange={(e) => setDiagramForm({ ...diagramForm, topic: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Visual Goal / Concept to Depict</label>
                <textarea
                  value={diagramForm.diagramGoal}
                  onChange={(e) => setDiagramForm({ ...diagramForm, diagramGoal: e.target.value })}
                  rows={3}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white p-3 rounded-xl text-xs font-medium focus:border-blue-500 outline-none resize-none"
                  placeholder="e.g. Show workflow of rain cycle, or force hierarchy"
                />
              </div>
              <button
                onClick={() => handleGenerate('diagram-generator', diagramForm)}
                disabled={loading}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>Generate Blackboard Diagram</span>
              </button>
            </div>
          )}

          {activeTab === 'remarks' && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <UserCheck size={18} className="text-purple-400" /> Student Report Card Remarks
              </h2>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Student Name</label>
                <input
                  type="text"
                  value={remarksForm.studentName}
                  onChange={(e) => setRemarksForm({ ...remarksForm, studentName: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subject</label>
                  <input
                    type="text"
                    value={remarksForm.subject}
                    onChange={(e) => setRemarksForm({ ...remarksForm, subject: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Marks (Obtained / Total)</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="number"
                      value={remarksForm.marks}
                      onChange={(e) => setRemarksForm({ ...remarksForm, marks: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-2 py-2 rounded-xl text-xs font-bold outline-none"
                    />
                    <span className="text-slate-600 font-bold">/</span>
                    <input
                      type="number"
                      value={remarksForm.totalMarks}
                      onChange={(e) => setRemarksForm({ ...remarksForm, totalMarks: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-2 py-2 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Classroom Engagement / Attitude</label>
                <input
                  type="text"
                  value={remarksForm.behavior}
                  onChange={(e) => setRemarksForm({ ...remarksForm, behavior: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-medium focus:border-blue-500 outline-none"
                  placeholder="e.g. Highly curious, needs practice in formulas"
                />
              </div>
              <button
                onClick={() => handleGenerate('report-remarks', remarksForm)}
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <UserCheck size={16} />}
                <span>Generate Tailored Remarks</span>
              </button>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Bot size={18} className="text-indigo-400" /> AI Teaching Consultant
              </h2>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ask any pedagogical or classroom question</label>
                <textarea
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  rows={4}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white p-3 rounded-xl text-xs font-medium focus:border-blue-500 outline-none resize-none"
                  placeholder="e.g. How do I manage mixed-ability students during a 40-minute math period on fractions?"
                />
              </div>
              <button
                onClick={() => handleGenerate('custom', { customQuery: chatPrompt })}
                disabled={loading || !chatPrompt.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Consult Pedagogical Agent</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Output Area */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">AI Generated Content</span>
              {loading && <span className="text-xs text-blue-400 font-bold animate-pulse">Generating...</span>}
            </div>
            {generatedOutput && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {generatedOutput ? (
              <AIMarkdownRenderer content={generatedOutput} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                  <Sparkles size={28} />
                </div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Ready to Generate</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Fill in the details on the left and click generate to create structured lesson plans, test papers, or report remarks in seconds.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAIAssistant;
