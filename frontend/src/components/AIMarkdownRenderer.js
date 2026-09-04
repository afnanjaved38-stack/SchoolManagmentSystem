import React, { useState } from 'react';
import DiagramRenderer from './DiagramRenderer';
import { Sparkles, CheckCircle2, Copy, Check, Terminal, BookOpen, HelpCircle } from 'lucide-react';

const AIMarkdownRenderer = ({ content }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState(null);

  if (!content) return null;

  // Split content by mermaid code blocks and standard text
  const splitMermaidBlocks = (text) => {
    const mermaidRegex = /```mermaid([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mermaidRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'markdown',
          content: text.slice(lastIndex, match.index)
        });
      }
      parts.push({
        type: 'mermaid',
        code: match[1].trim()
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'markdown',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  };

  const handleCopyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const parseInline = (str) => {
    if (!str) return '';
    return str
      // Bold with highlight
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/20 shadow-sm">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="text-cyan-200 italic font-medium">$1</em>')
      // Inline Code
      .replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-blue-300 px-2 py-0.5 rounded-lg text-xs font-mono border border-slate-700 font-bold">$1</code>');
  };

  // Render markdown text lines into structured UI components
  const renderMarkdownChunk = (rawText, chunkIdx) => {
    const lines = rawText.split('\n');
    const renderedElements = [];
    let inCodeBlock = false;
    let codeBlockLanguage = '';
    let codeBuffer = [];
    let tableBuffer = [];

    const flushTable = (key) => {
      if (tableBuffer.length > 0) {
        const rows = tableBuffer.map(row => row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim()));
        if (rows.length > 0) {
          const headerRow = rows[0];
          const dataRows = rows.slice(2); // skip separator row |---|---|

          renderedElements.push(
            <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 shadow-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-blue-400 font-black uppercase tracking-wider">
                    {headerRow.map((h, hIdx) => (
                      <th key={hIdx} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dataRows.map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/40 transition-colors text-slate-200 font-medium">
                      {r.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5" dangerouslySetInnerHTML={{ __html: parseInline(cell) }} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        tableBuffer = [];
      }
    };

    lines.forEach((line, index) => {
      const lineKey = `${chunkIdx}-${index}`;

      // Fenced Code Block Check
      if (line.trim().startsWith('```') && !line.trim().startsWith('```mermaid')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLanguage = line.trim().replace('```', '') || 'code';
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          const fullCode = codeBuffer.join('\n');
          const codeIdx = `${chunkIdx}-code-${index}`;
          renderedElements.push(
            <div key={codeIdx} className="my-4 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Terminal size={13} /> {codeBlockLanguage}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(fullCode, codeIdx)}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedCodeIdx === codeIdx ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedCodeIdx === codeIdx ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed whitespace-pre custom-scrollbar">
                {fullCode}
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Markdown Table Row
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        tableBuffer.push(line.trim());
        return;
      } else if (tableBuffer.length > 0) {
        flushTable(lineKey);
      }

      // Horizontal Rule
      if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        renderedElements.push(
          <div key={lineKey} className="my-5 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        );
        return;
      }

      // Heading 1 (#)
      if (line.startsWith('# ')) {
        renderedElements.push(
          <div key={lineKey} className="mt-6 mb-3 pb-2 border-b border-blue-500/30">
            <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-cyan-300 uppercase tracking-tight flex items-center gap-2">
              <Sparkles size={22} className="text-blue-400 shrink-0" />
              <span>{line.replace('# ', '')}</span>
            </h1>
          </div>
        );
        return;
      }

      // Heading 2 (##)
      if (line.startsWith('## ')) {
        renderedElements.push(
          <div key={lineKey} className="mt-6 mb-3 p-3 bg-gradient-to-r from-blue-900/30 via-slate-900/80 to-transparent border-l-4 border-blue-500 rounded-r-2xl shadow-sm">
            <h2 className="text-base md:text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400 shrink-0" />
              <span>{line.replace('## ', '')}</span>
            </h2>
          </div>
        );
        return;
      }

      // Heading 3 (###)
      if (line.startsWith('### ')) {
        renderedElements.push(
          <div key={lineKey} className="mt-4 mb-2">
            <h3 className="text-sm md:text-base font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{line.replace('### ', '')}</span>
            </h3>
          </div>
        );
        return;
      }

      // Multiple Choice Option (e.g. A) Option text or B) Option text)
      const optionMatch = line.trim().match(/^([A-D]\))\s*(.*)/i);
      if (optionMatch) {
        renderedElements.push(
          <div key={lineKey} className="my-2 p-3 bg-slate-900/90 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/50 rounded-2xl transition-all flex items-center gap-3 group shadow-sm">
            <span className="w-8 h-8 rounded-xl bg-blue-600/20 group-hover:bg-blue-600 text-blue-400 group-hover:text-white font-black text-xs flex items-center justify-center border border-blue-500/30 transition-all shrink-0">
              {optionMatch[1].replace(')', '')}
            </span>
            <span className="text-sm font-bold text-slate-200 group-hover:text-white" dangerouslySetInnerHTML={{ __html: parseInline(optionMatch[2]) }} />
          </div>
        );
        return;
      }

      // Ordered list (1. , 2. )
      const orderedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (orderedMatch) {
        renderedElements.push(
          <div key={lineKey} className="flex items-start gap-3 my-2 ml-1">
            <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              {orderedMatch[1]}
            </span>
            <div className="text-sm md:text-base leading-relaxed text-slate-200 font-medium" dangerouslySetInnerHTML={{ __html: parseInline(orderedMatch[2]) }} />
          </div>
        );
        return;
      }

      // Unordered list (* , - )
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemContent = line.trim().replace(/^[-*]\s+/, '');
        return renderedElements.push(
          <div key={lineKey} className="flex items-start gap-3 my-2 ml-2">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 mt-2 shrink-0 shadow-sm shadow-cyan-500/50" />
            <div className="text-sm md:text-base leading-relaxed text-slate-200 font-medium" dangerouslySetInnerHTML={{ __html: parseInline(itemContent) }} />
          </div>
        );
      }

      // Empty Line
      if (!line.trim()) {
        renderedElements.push(<div key={lineKey} className="h-2" />);
        return;
      }

      // Regular Paragraph Line
      renderedElements.push(
        <p key={lineKey} className="my-1.5 leading-relaxed text-slate-200 font-medium text-sm md:text-base" dangerouslySetInnerHTML={{ __html: parseInline(line) }} />
      );
    });

    if (tableBuffer.length > 0) {
      flushTable('end');
    }

    return renderedElements;
  };

  const chunks = splitMermaidBlocks(content);

  return (
    <div className="space-y-2 leading-relaxed">
      {chunks.map((chunk, cIdx) => {
        if (chunk.type === 'mermaid') {
          return <DiagramRenderer key={cIdx} code={chunk.code} />;
        }
        return <div key={cIdx}>{renderMarkdownChunk(chunk.content, cIdx)}</div>;
      })}
    </div>
  );
};

export default AIMarkdownRenderer;
