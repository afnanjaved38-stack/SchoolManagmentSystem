import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Copy, Check, Sparkles, AlertCircle, ZoomIn, ZoomOut, RotateCcw, Sun, Moon } from 'lucide-react';

let mermaidInstance = null;

const FALLBACK_COLORS = [
  { fill: '#2563eb', stroke: '#1e40af' },
  { fill: '#059669', stroke: '#047857' },
  { fill: '#d97706', stroke: '#b45309' },
  { fill: '#7c3aed', stroke: '#6d28d9' },
  { fill: '#db2777', stroke: '#be185d' },
  { fill: '#0891b2', stroke: '#0e7490' },
  { fill: '#ea580c', stroke: '#c2410c' }
];

const CANVAS_THEMES = {
  classroom: {
    label: 'Classroom',
    canvasClass: 'bg-[#f0f9ff] border-blue-200',
    svgBg: '#f0f9ff',
    edgeLabelBg: '#ffffff',
    edgeLabelText: '#1e3a8a',
    edgeLabelBorder: '#93c5fd',
    linkColor: '#3b82f6',
    arrowHead: '#1e40af',
    clusterText: '#1e3a8a',
    clusterBorder: '#93c5fd',
    subgraphFills: ['#fef3c7', '#dbeafe', '#dcfce7', '#f3e8ff', '#fce7f3', '#cffafe']
  },
  dark: {
    label: 'Dark',
    canvasClass: 'bg-[#0f172a] border-slate-700',
    svgBg: '#0f172a',
    edgeLabelBg: '#1e293b',
    edgeLabelText: '#e2e8f0',
    edgeLabelBorder: '#475569',
    linkColor: '#60a5fa',
    arrowHead: '#93c5fd',
    clusterText: '#e2e8f0',
    clusterBorder: '#334155',
    subgraphFills: ['#1c1917', '#172554', '#14532d', '#1e1b4b', '#4a0519', '#164e63']
  },
  green: {
    label: 'Board',
    canvasClass: 'bg-[#0d2818] border-emerald-800',
    svgBg: '#0d2818',
    edgeLabelBg: '#052e16',
    edgeLabelText: '#d1fae5',
    edgeLabelBorder: '#059669',
    linkColor: '#34d399',
    arrowHead: '#6ee7b7',
    clusterText: '#d1fae5',
    clusterBorder: '#059669',
    subgraphFills: ['#1a2e05', '#052e16', '#0e2a3e', '#1a0e2e', '#2e0e1a', '#0e2e2a']
  },
  light: {
    label: 'Light',
    canvasClass: 'bg-white border-slate-200',
    svgBg: '#ffffff',
    edgeLabelBg: '#f8fafc',
    edgeLabelText: '#0f172a',
    edgeLabelBorder: '#cbd5e1',
    linkColor: '#2563eb',
    arrowHead: '#1e40af',
    clusterText: '#0f172a',
    clusterBorder: '#e2e8f0',
    subgraphFills: ['#fefce8', '#eff6ff', '#f0fdf4', '#faf5ff', '#fdf2f8', '#ecfeff']
  }
};

/* Parse any CSS color (rgb / rgba / #hex) into {r,g,b} */
const parseColor = (str) => {
  if (!str || str === 'none' || str === 'transparent') return null;
  if (str.startsWith('rgb')) {
    const m = str.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  }
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
  }
  return null;
};

const getBrightness = ({ r, g, b }) => (r * 299 + g * 587 + b * 114) / 1000;

/*
 * Post-process the LIVE rendered SVG in the DOM.
 * Uses getComputedStyle to read each node's REAL fill color (even when applied
 * via mermaid's internal <style> CSS from classDef), then forces a contrasting
 * text color with inline !important styles that no stylesheet can override.
 */
const postProcessSvg = (container, theme, hasClassDef) => {
  const svgEl = container.querySelector('svg');
  if (!svgEl) return;

  /* Solid canvas background behind everything */
  const viewBox = svgEl.getAttribute('viewBox')?.split(/\s+/) || [];
  if (viewBox.length === 4 && !svgEl.querySelector('.diagram-bg-rect')) {
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('class', 'diagram-bg-rect');
    bgRect.setAttribute('x', viewBox[0]);
    bgRect.setAttribute('y', viewBox[1]);
    bgRect.setAttribute('width', viewBox[2]);
    bgRect.setAttribute('height', viewBox[3]);
    bgRect.setAttribute('fill', theme.svgBg);
    svgEl.insertBefore(bgRect, svgEl.firstChild);
  }

  /* Never clip label overflow anywhere (foreignObjects are exact-sized) */
  svgEl.querySelectorAll('foreignObject').forEach((fo) => {
    fo.setAttribute('overflow', 'visible');
    fo.style.setProperty('overflow', 'visible', 'important');
  });

  /* ---------- NODES ---------- */
  const nodes = [...svgEl.querySelectorAll('.node')];
  nodes.forEach((node, idx) => {
    const shapes = [...node.querySelectorAll('rect, circle, polygon, ellipse, path')]
      .filter((s) => !s.closest('.label'));

    /* No classDef from AI: paint shapes ourselves with the palette */
    if (!hasClassDef) {
      const c = FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
      shapes.forEach((shape) => {
        shape.style.setProperty('fill', c.fill, 'important');
        shape.style.setProperty('stroke', c.stroke, 'important');
        shape.style.setProperty('stroke-width', '2.5px', 'important');
        if (shape.tagName === 'rect') {
          shape.setAttribute('rx', '12');
          shape.setAttribute('ry', '12');
        }
      });
    } else {
      shapes.forEach((shape) => {
        if (shape.tagName === 'rect') {
          shape.setAttribute('rx', '12');
          shape.setAttribute('ry', '12');
        }
        const sw = parseFloat(getComputedStyle(shape).strokeWidth) || 0;
        if (sw < 2) shape.style.setProperty('stroke-width', '2.5px', 'important');
      });
    }

    /* Read the REAL computed fill (works even when set via classDef CSS) */
    let rgb = null;
    for (const shape of shapes) {
      rgb = parseColor(getComputedStyle(shape).fill);
      if (rgb) break;
    }
    /* Contrast-based text color: dark bg -> white text, light bg -> near-black */
    const textColor = rgb && getBrightness(rgb) > 150 ? '#0f172a' : '#ffffff';

    node.querySelectorAll('text, tspan').forEach((t) => {
      t.style.setProperty('fill', textColor, 'important');
      t.style.setProperty('font-weight', '700', 'important');
      t.style.setProperty('stroke', 'none', 'important');
    });

    /* NOTE: no font-size/padding overrides — foreignObject is measured exact,
       changing metrics after layout causes clipping */
    node.querySelectorAll('.nodeLabel, foreignObject div, foreignObject span, foreignObject p').forEach((el) => {
      el.style.setProperty('color', textColor, 'important');
      el.style.setProperty('font-weight', '700', 'important');
      el.style.setProperty('background', 'transparent', 'important');
      el.style.setProperty('border', 'none', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('text-shadow', 'none', 'important');
    });
  });

  /* ---------- SUBGRAPH / CLUSTER BOXES & TITLES ---------- */
  const clusters = [...svgEl.querySelectorAll('.cluster')];
  clusters.forEach((cluster, idx) => {
    const fill = theme.subgraphFills[idx % theme.subgraphFills.length];
    cluster.querySelectorAll('rect').forEach((rect) => {
      rect.style.setProperty('fill', fill, 'important');
      rect.style.setProperty('fill-opacity', '0.55', 'important');
      rect.style.setProperty('stroke', theme.clusterBorder, 'important');
      rect.style.setProperty('stroke-width', '2px', 'important');
      rect.setAttribute('rx', '16');
      rect.setAttribute('ry', '16');
    });
    cluster.querySelectorAll('text, tspan').forEach((t) => {
      t.style.setProperty('fill', theme.clusterText, 'important');
      t.style.setProperty('font-weight', '700', 'important');
      t.style.setProperty('stroke', 'none', 'important');
    });
    cluster.querySelectorAll('.nodeLabel, foreignObject div, foreignObject span, foreignObject p').forEach((el) => {
      el.style.setProperty('color', theme.clusterText, 'important');
      el.style.setProperty('font-weight', '700', 'important');
      el.style.setProperty('background', 'transparent', 'important');
    });
  });

  /* ---------- EDGE (ARROW) LABELS ---------- */
  svgEl.querySelectorAll('.edgeLabel rect').forEach((rect) => {
    rect.style.setProperty('fill', theme.edgeLabelBg, 'important');
    rect.style.setProperty('stroke', theme.edgeLabelBorder, 'important');
    rect.style.setProperty('stroke-width', '1px', 'important');
    rect.setAttribute('rx', '9');
    rect.setAttribute('ry', '9');
  });
  svgEl.querySelectorAll('.edgeLabel text, .edgeLabel tspan').forEach((t) => {
    t.style.setProperty('fill', theme.edgeLabelText, 'important');
    t.style.setProperty('font-weight', '700', 'important');
    t.style.setProperty('stroke', 'none', 'important');
  });
  /* Inner span/p: color only, transparent bg, NO padding (avoids clipping) */
  svgEl.querySelectorAll('.edgeLabel foreignObject span, .edgeLabel foreignObject p').forEach((el) => {
    el.style.setProperty('color', theme.edgeLabelText, 'important');
    el.style.setProperty('font-weight', '700', 'important');
    el.style.setProperty('background', 'transparent', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('text-shadow', 'none', 'important');
  });
  /* Outer div carries the pill background */
  svgEl.querySelectorAll('.edgeLabel foreignObject div').forEach((el) => {
    el.style.setProperty('color', theme.edgeLabelText, 'important');
    el.style.setProperty('font-weight', '700', 'important');
    el.style.setProperty('background', theme.edgeLabelBg, 'important');
    el.style.setProperty('border-radius', '6px', 'important');
    el.style.setProperty('padding', '0 4px', 'important');
    el.style.setProperty('text-shadow', 'none', 'important');
  });

  /* ---------- ARROWS ---------- */
  svgEl.querySelectorAll('.edgePath path, .flowchart-link').forEach((p) => {
    p.style.setProperty('stroke', theme.linkColor, 'important');
    p.style.setProperty('stroke-width', '2.5px', 'important');
  });
  svgEl.querySelectorAll('marker path').forEach((p) => {
    p.style.setProperty('fill', theme.arrowHead, 'important');
    p.style.setProperty('stroke', theme.arrowHead, 'important');
  });
};

const DiagramRenderer = ({ code, title = 'Visual Learning Diagram' }) => {
  const svgHostRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [canvasTheme, setCanvasTheme] = useState('classroom');

  const theme = CANVAS_THEMES[canvasTheme] || CANVAS_THEMES.classroom;

  const renderDiagram = useCallback(async () => {
    if (!code || !code.trim()) return;

    try {
      setStatus('loading');
      setErrorMsg('');

      if (!mermaidInstance) {
        const mermaidModule = await import('mermaid');
        mermaidInstance = mermaidModule.default || mermaidModule;
      }

      const activeTheme = CANVAS_THEMES[canvasTheme] || CANVAS_THEMES.classroom;

      mermaidInstance.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          darkMode: canvasTheme === 'dark' || canvasTheme === 'green',
          background: activeTheme.svgBg,
          mainBkg: '#2563eb',
          nodeBorder: '#1e40af',
          nodeTextColor: '#ffffff',
          textColor: '#ffffff',
          clusterBkg: 'transparent',
          clusterBorder: activeTheme.clusterBorder,
          defaultLinkColor: activeTheme.linkColor,
          lineColor: activeTheme.linkColor,
          titleColor: activeTheme.clusterText,
          edgeLabelBackground: activeTheme.edgeLabelBg,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '14px'
        },
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          nodeSpacing: 40,
          rankSpacing: 60,
          padding: 18,
          wrappingWidth: 180,
          useMaxWidth: true
        },
        securityLevel: 'loose'
      });

      let cleanCode = code.trim();
      if (cleanCode.startsWith('```mermaid')) {
        cleanCode = cleanCode.replace(/^```mermaid\s*/i, '').replace(/```$/, '').trim();
      }
      const hasClassDef = /classDef\s/.test(cleanCode);

      const uniqueId = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
      const { svg } = await mermaidInstance.render(uniqueId, cleanCode);

      if (svgHostRef.current) {
        svgHostRef.current.innerHTML = svg;
        /* Post-process on the LIVE DOM so getComputedStyle sees real colors */
        postProcessSvg(svgHostRef.current, activeTheme, hasClassDef);
        setStatus('done');
      }
    } catch (err) {
      console.error('Mermaid render error:', err);
      setErrorMsg(err.message || 'Unable to parse diagram syntax.');
      setStatus('error');
    }
  }, [code, canvasTheme]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themeButtons = [
    { key: 'classroom', icon: Sparkles },
    { key: 'dark', icon: Moon },
    { key: 'green', icon: null },
    { key: 'light', icon: Sun }
  ];

  return (
    <div className={`diagram-renderer my-4 rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden transition-all duration-300 ${
      isExpanded ? 'fixed inset-4 z-50 flex flex-col border-blue-400 bg-slate-950' : 'w-full'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="text-blue-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {themeButtons.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setCanvasTheme(key)}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors flex items-center gap-0.5 ${
                  canvasTheme === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {Icon && <Icon size={9} />}
                <span>{CANVAS_THEMES[key]?.label}</span>
              </button>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-0.5">
            <button onClick={() => setZoomLevel(p => Math.max(0.5, p - 0.15))} className="p-0.5 text-slate-400 hover:text-white"><ZoomOut size={12} /></button>
            <span className="text-[9px] font-mono text-slate-500 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => setZoomLevel(p => Math.min(2, p + 0.15))} className="p-0.5 text-slate-400 hover:text-white"><ZoomIn size={12} /></button>
            {zoomLevel !== 1 && <button onClick={() => setZoomLevel(1)} className="p-0.5 text-slate-400 hover:text-blue-400"><RotateCcw size={10} /></button>}
          </div>
          <button onClick={handleCopyCode} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[9px] font-bold flex items-center gap-0.5">
            {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
            <span>{copied ? 'Copied' : 'Code'}</span>
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      <div className={`p-3 overflow-auto custom-scrollbar transition-colors duration-300 ${theme.canvasClass} ${isExpanded ? 'flex-1 flex items-center justify-center' : ''}`}>
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
            <AlertCircle size={22} className="text-amber-400" />
            <p className="text-[11px] text-slate-400 font-bold">{errorMsg}</p>
            <pre className="text-[10px] text-blue-400 bg-slate-900 p-2 rounded-lg border border-slate-800 text-left w-full overflow-x-auto font-mono">{code}</pre>
          </div>
        )}
        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-blue-500 font-bold animate-pulse">
            <Sparkles size={14} />
            <span>Drawing diagram...</span>
          </div>
        )}
        <div
          ref={svgHostRef}
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', display: status === 'done' ? 'block' : 'none' }}
          className="diagram-svg-wrap max-w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block [&>svg]:mx-auto"
        />
      </div>
    </div>
  );
};

export default DiagramRenderer;
