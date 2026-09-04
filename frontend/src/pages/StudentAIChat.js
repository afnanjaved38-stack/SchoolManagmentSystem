import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { AuthContext } from '../context/AuthContext';
import BRANDING from '../branding';
import AIMarkdownRenderer from '../components/AIMarkdownRenderer';
import {
  Sparkles,
  Send,
  Bot,
  User,
  BookOpen,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Volume2,
  VolumeX,
  FileText,
  ClipboardList,
  AlertCircle,
  ArrowRight,
  Compass,
  GraduationCap
} from 'lucide-react';
import { toast } from 'react-toastify';

const StudentAIChat = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState(null);
  const [studentContext, setStudentContext] = useState(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchAiConfig();
    // Default greeting
    setMessages([
      {
        role: 'assistant',
        content: `Assalam-o-Alaikum & Hello! 👋 I am your **Personal AI Learning Companion**.\n\nI know your syllabus, today's diary & assignments! Ask me anything—science, math, english, or your homework questions—and I'll explain it clearly with step-by-step examples and visual diagrams! 🚀`,
        timestamp: new Date()
      }
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const fetchAiConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/ai/config`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAiConfig(res.data);
    } catch (err) {
      console.error('Failed to load AI config:', err);
    }
  };

  const handleSendMessage = async (customPrompt) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setLoading(true);

    try {
      // Build history for multi-turn
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await axios.post(`${API_BASE_URL}/api/ai/student/chat`, {
        message: textToSend,
        history: historyPayload
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.data.studentContext) {
        setStudentContext(res.data.studentContext);
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.reply,
          hasDiagram: res.data.hasDiagram,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Unable to get response from AI Tutor. Please verify school AI settings.';
      toast.error(errorMsg);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Notice**: ${errorMsg}`,
          timestamp: new Date(),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text, idx) => {
    if ('speechSynthesis' in window) {
      if (speakingIndex === idx) {
        window.speechSynthesis.cancel();
        setSpeakingIndex(null);
        return;
      }
      window.speechSynthesis.cancel();
      // Remove markdown and mermaid code block from speech
      const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/[*_#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);
      setSpeakingIndex(idx);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Explanation copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const quickPrompts = [
    { title: '🌍 What is Gravity?', prompt: 'Explain what gravity is in simple words with a visual flowchart diagram of earth pulling objects!' },
    { title: '💧 Water Cycle Diagram', prompt: 'Explain the water cycle step by step and draw a complete flowchart diagram showing evaporation, condensation, and rain.' },
    { title: '🌿 Photosynthesis', prompt: 'How do plants make food through photosynthesis? Explain with a simple diagram.' },
    { title: '➗ Fractions Made Easy', prompt: 'I find fractions confusing. Can you explain what a fraction is with everyday pizza/apple examples?' },
    { title: '📝 Quiz Me on Science', prompt: 'Give me a fun 3-question quick quiz on Class 5 General Science with options A, B, C, D!' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-6xl mx-auto pb-4">
      {/* Header Context Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 mb-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
              <Bot size={26} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white uppercase tracking-tight">AI Learning Companion</h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={11} /> {aiConfig?.modelName || 'Gemini AI'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Personalized Grade Context · Dynamic Visual Diagrams · Syllabus Aligned
            </p>
          </div>
        </div>

        {/* Student / Curriculum Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {aiConfig?.curriculum && (
            <div className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-300">
              <BookOpen size={14} className="text-indigo-400" />
              <span className="truncate max-w-[200px]">{aiConfig.curriculum}</span>
            </div>
          )}
          <button
            onClick={() => setMessages([{ role: 'assistant', content: 'Chat reset. How can I help you today?', timestamp: new Date() }])}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700/50"
            title="Reset Chat"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-slate-900/50 border border-slate-800/80 rounded-3xl p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-6 shadow-inner">
        {messages.map((msg, index) => {
          const hasDiagram = msg.role === 'assistant' && msg.content?.includes('```mermaid');
          return (
          <div
            key={index}
            className={`flex items-start gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} ${hasDiagram ? 'w-full' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white shadow-blue-600/30'
                : msg.isError
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
            }`}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>

            {/* Bubble */}
            <div className={`rounded-3xl shadow-xl transition-all ${
              hasDiagram
                ? 'w-full max-w-full p-3 md:p-4 bg-slate-950 border border-slate-700 rounded-tl-none overflow-visible'
                : 'max-w-[88%] md:max-w-[78%] p-4 md:p-5'
            } ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : msg.isError
                ? 'bg-red-950/40 border border-red-900/50 rounded-tl-none'
                : hasDiagram
                ? ''
                : 'bg-slate-900 border border-slate-800 rounded-tl-none'
            }`}>
              <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-slate-800/40">
                <span className={`text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-blue-100' : 'text-indigo-400'}`}>
                  {msg.role === 'user' ? 'You' : 'AI Companion'}
                </span>
                {msg.role === 'assistant' && !msg.isError && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSpeak(msg.content, index)}
                      className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                      title="Read aloud"
                    >
                      {speakingIndex === index ? <VolumeX size={14} className="text-indigo-400" /> : <Volume2 size={14} />}
                    </button>
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Copy text"
                    >
                      {copiedIndex === index ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              {msg.role === 'user' ? (
                <p className="text-sm md:text-base font-semibold leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <AIMarkdownRenderer content={msg.content} />
              )}

              <div className="mt-2 text-right">
                <span className="text-[9px] font-bold text-slate-500 uppercase">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        );
        })}

        {loading && (
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Bot size={18} />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl rounded-tl-none p-4 shadow-xl flex items-center gap-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
              </div>
              <span className="text-xs font-bold text-slate-400">AI Tutor is thinking & crafting visual explanation...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="my-3 overflow-x-auto custom-scrollbar flex items-center gap-2 py-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 shrink-0 ml-1 flex items-center gap-1">
          <Lightbulb size={12} className="text-amber-400" /> Suggestions:
        </span>
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q.prompt)}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-xl text-xs font-bold text-slate-300 hover:text-white whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <span>{q.title}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="relative flex items-center bg-slate-900 border border-slate-800 focus-within:border-blue-500 rounded-2xl p-2 shadow-2xl transition-all">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask a question about your lessons, homework, or science concept..."
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-slate-500 px-4 py-2.5 outline-none resize-none font-semibold text-sm max-h-24"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || loading}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            inputMessage.trim() && !loading
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default StudentAIChat;
