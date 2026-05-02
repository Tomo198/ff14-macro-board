import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Settings, Plus, Trash2, Edit2, Copy, X, ExternalLink, Info, ZoomIn, ZoomOut, GripHorizontal, RotateCcw } from 'lucide-react';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#0ea5e9', '#3b82f6',
  '#8b5cf6', '#d946ef', '#94a3b8', '#ffffff'
];

const INITIAL_MACROS = [
  {
    id: '1',
    title: '共鳴4層 散開・暴走',
    x: 40, y: 40, zIndex: 10,
    content: `/p 【散開】　【ペア】
/p MT ST　 MTD1　STD2
/p D1 D2 　H1D3　H2D4
/p H1 H2
/p D3 D4
/p 【暴走】※内側列車基準
/p MT 　 H1 　 ST 〈汽笛2回3：3〉
/p 　 D1 ★ D2　 　 　 H1D1D2
/p 　 　 H2　 　 　 　 H2D3D4
/p 　 D3 　D4
/p 【魔法陣2:6受】 T:左前 他:右前
/p 軽減：①MT組→②ST組→③タンクLB
/p 【塔】2回目:MT無敵 3回目:ST無敵
/p 【サイコキネシス】
/p 散開基準で外周捨て→中安置`
  }
];

const INITIAL_RULES = [
  { id: '1', keyword: 'MT', color: PRESET_COLORS[7] },
  { id: '2', keyword: 'ST', color: PRESET_COLORS[7] },
  { id: '3', keyword: 'T', color: PRESET_COLORS[7] },
  { id: '4', keyword: 'H1', color: PRESET_COLORS[4] },
  { id: '5', keyword: 'H2', color: PRESET_COLORS[4] },
  { id: '6', keyword: 'H', color: PRESET_COLORS[4] },
  { id: '7', keyword: 'D1', color: PRESET_COLORS[0] },
  { id: '8', keyword: 'D2', color: PRESET_COLORS[0] },
  { id: '9', keyword: 'D3', color: PRESET_COLORS[0] },
  { id: '10', keyword: 'D4', color: PRESET_COLORS[0] },
  { id: '11', keyword: 'D', color: PRESET_COLORS[0] },
];

// テキストハイライト用コンポーネント（変更なし）
const HighlightedText = React.memo(({ text, highlightPattern, sortedRules }) => {
  if (!highlightPattern) return <>{text}</>;
  const parts = text.split(highlightPattern);
  return parts.map((part, i) => {
    const rule = sortedRules.find(r => r.keyword === part);
    return rule ? <span key={i} style={{ color: rule.color, fontWeight: 800 }}>{part}</span> : part;
  });
});

// パフォーマンス最適化のため、各カードを独立したコンポーネントに分離
const MacroCard = React.memo(({ macro, highlightPattern, sortedRules, onUpdate, onDelete, onEdit, onBringToFront, showToast }) => {
  const cardRef = useRef(null);
  const contentRef = useRef(null);
  const [zoom, setZoom] = useState(13); // 個別のズームレベルを管理（フリーズ対策）

  // Ctrl+Wheelでのズームを独立して処理
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        setZoom(prev => Math.max(10, Math.min(40, prev + delta)));
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // ドラッグ処理とはみ出し防止
  const handleDragStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    onBringToFront(macro.id);

    const startX = e.clientX || (e.touches && e.touches[0].clientX);
    const startY = e.clientY || (e.touches && e.touches[0].clientY);
    const initialX = macro.x || 0;
    const initialY = macro.y || 0;

    const handleMove = (moveEvent) => {
      const clientX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
      const clientY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);
      const dx = clientX - startX;
      const dy = clientY - startY;

      let nextX = initialX + dx;
      let nextY = initialY + dy;

      // 【はみ出し防止機能】
      const rect = cardRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 10; // 右端の限界（スクロールバー考慮）
      const maxY = document.documentElement.scrollHeight - rect.height; // 下端の限界

      if (nextX < 0) nextX = 0;
      if (nextX > maxX && maxX > 0) nextX = maxX;
      if (nextY < 0) nextY = 0;
      if (nextY > maxY && maxY > 0) nextY = maxY;

      if (cardRef.current) {
        cardRef.current.style.left = `${nextX}px`;
        cardRef.current.style.top = `${nextY}px`;
      }
    };

    const handleEnd = (upEvent) => {
      const clientX = upEvent.clientX || (upEvent.changedTouches && upEvent.changedTouches[0].clientX) || startX;
      const clientY = upEvent.clientY || (upEvent.changedTouches && upEvent.changedTouches[0].clientY) || startY;
      let nextX = initialX + (clientX - startX);
      let nextY = initialY + (clientY - startY);

      const rect = cardRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 10;
      const maxY = document.documentElement.scrollHeight - rect.height;

      if (nextX < 0) nextX = 0;
      if (nextX > maxX && maxX > 0) nextX = maxX;
      if (nextY < 0) nextY = 0;
      if (nextY > maxY && maxY > 0) nextY = maxY;

      onUpdate(macro.id, { x: nextX, y: nextY });

      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(macro.content).then(() => showToast('コピーしました'));
  };

  const openInPiP = async () => {
    if (!window.documentPictureInPicture) {
      showToast("【非対応】お使いの環境は文字のPiPに対応していません");
      return;
    }
    try {
      const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 400, height: 500 });
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map(r => r.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          pipWindow.document.head.appendChild(link);
        }
      });
      const container = pipWindow.document.createElement('div');
      container.className = 'bg-slate-900 min-h-screen p-4 text-white flex flex-col';
      const header = pipWindow.document.createElement('div');
      header.className = 'flex justify-between items-center border-b border-slate-700 pb-2 mb-2';
      const title = pipWindow.document.createElement('div');
      title.className = 'text-sm font-bold text-slate-400';
      title.innerText = macro.title;

      const zoomContainer = pipWindow.document.createElement('div');
      zoomContainer.className = 'flex items-center gap-2';
      zoomContainer.innerHTML = `
        <span style="font-size: 12px; color: #94a3b8;">A-</span>
        <input type="range" min="10" max="40" value="${zoom}" class="w-20 accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" id="pip-zoom">
        <span style="font-size: 14px; color: #94a3b8; font-weight: bold;">A+</span>
      `;
      header.appendChild(title);
      header.appendChild(zoomContainer);

      const contentWrapper = pipWindow.document.createElement('div');
      contentWrapper.className = 'flex-1 overflow-auto';
      const pre = pipWindow.document.createElement('pre');
      pre.className = 'leading-snug whitespace-pre font-mono font-medium';
      pre.style.fontSize = `${zoom}px`;
      pre.style.letterSpacing = '0.02em';

      const getHighlightedHTML = (text) => {
        if (!highlightPattern) return text;
        const parts = text.split(highlightPattern);
        return parts.map(part => {
          const rule = sortedRules.find(r => r.keyword === part);
          return rule ? `<span style="color: ${rule.color}; font-weight: 800;">${part}</span>` : part;
        }).join('');
      };

      pre.innerHTML = getHighlightedHTML(macro.content);
      contentWrapper.appendChild(pre);
      container.appendChild(header);
      container.appendChild(contentWrapper);
      pipWindow.document.body.appendChild(container);

      const slider = pipWindow.document.getElementById('pip-zoom');
      slider.addEventListener('input', (e) => {
        const newSize = parseInt(e.target.value, 10);
        pre.style.fontSize = `${newSize}px`;
        setZoom(newSize);
      });
      contentWrapper.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -1 : 1;
          const currentSize = parseInt(pre.style.fontSize, 10) || 13;
          const nextSize = Math.max(10, Math.min(40, currentSize + delta));
          pre.style.fontSize = `${nextSize}px`;
          slider.value = nextSize;
          setZoom(nextSize);
        }
      }, { passive: false });
    } catch (err) {
      showToast("プレビュー環境ではPiPを利用できません。独立したタブで実行してください。");
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseDown={() => onBringToFront(macro.id)}
      className="absolute bg-slate-800 rounded-xl border border-slate-700 flex flex-col group resize overflow-hidden shadow-2xl transition-shadow hover:border-slate-500"
      style={{
        left: `${macro.x}px`,
        top: `${macro.y}px`,
        zIndex: macro.zIndex,
        height: '400px',
        minHeight: '200px',
        minWidth: '280px',
        width: '340px'
      }}
    >
      <div
        className="flex flex-col border-b border-slate-700 bg-slate-800 hover:bg-slate-700/50 cursor-move active:cursor-grabbing transition-colors"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex justify-between items-center p-3 pb-2 pointer-events-none">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <GripHorizontal size={16} className="text-slate-500 shrink-0" />
            <span className="font-semibold truncate text-slate-100 select-none pointer-events-auto">{macro.title}</span>
          </div>
          <div className="flex gap-1 shrink-0 ml-2 pointer-events-auto">
            <button onClick={(e) => { e.stopPropagation(); openInPiP(); }} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors" title="PiPモード">
              <ExternalLink size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(macro); }} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors">
              <Edit2 size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(macro.id); }} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="px-3 pb-2 flex items-center gap-2 pointer-events-auto">
          <ZoomOut size={14} className="text-slate-500" />
          <input
            type="range" min="10" max="40" value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-1 accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <ZoomIn size={14} className="text-slate-500" />
        </div>
      </div>

      <div
        ref={contentRef}
        className="p-4 relative bg-[#0f172a] flex-1 overflow-auto cursor-text"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <pre className="whitespace-pre font-mono font-medium tracking-wide" style={{ fontSize: `${zoom}px` }}>
          <HighlightedText text={macro.content} highlightPattern={highlightPattern} sortedRules={sortedRules} />
        </pre>
        <button onClick={copyToClipboard} className="absolute top-2 right-2 p-2 bg-blue-600/80 rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-lg">
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
});

// アプリ本体コンポーネント
export default function App() {
  const [macros, setMacros] = useState(() => {
    try {
      const saved = localStorage.getItem('ff14_macros');
      return saved ? JSON.parse(saved).map((m, i) => ({ ...m, x: m.x ?? (40 + (i * 30)), y: m.y ?? (40 + (i * 30)), zIndex: m.zIndex ?? (10 + i) })) : INITIAL_MACROS;
    } catch (e) {
      return INITIAL_MACROS;
    }
  });

  const [rules, setRules] = useState(() => {
    try {
      const saved = localStorage.getItem('ff14_rules');
      return saved ? JSON.parse(saved) : INITIAL_RULES;
    } catch (e) {
      return INITIAL_RULES;
    }
  });

  const [zIndexCounter, setZIndexCounter] = useState(100);
  const [editingMacro, setEditingMacro] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [draftMacro, setDraftMacro] = useState({ title: '', content: '' });
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleColor, setNewRuleColor] = useState(PRESET_COLORS[7]);

  // ローカルストレージ自動保存
  useEffect(() => { localStorage.setItem('ff14_macros', JSON.stringify(macros)); }, [macros]);
  useEffect(() => { localStorage.setItem('ff14_rules', JSON.stringify(rules)); }, [rules]);

  // パターン生成を最適化
  const { sortedRules, highlightPattern } = useMemo(() => {
    const sorted = [...rules].sort((a, b) => b.keyword.length - a.keyword.length);
    const patternStr = sorted.map(r => r.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    return { sortedRules: sorted, highlightPattern: patternStr ? new RegExp(`(${patternStr})`, 'g') : null };
  }, [rules]);

  // 各種アクションの最適化（再レンダリング防止）
  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const updateMacro = useCallback((id, updates) => {
    setMacros(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const deleteMacro = useCallback((id) => {
    setMacros(prev => prev.filter(m => m.id !== id));
  }, []);

  const editMacro = useCallback((macro) => {
    setDraftMacro(macro);
    setEditingMacro(macro);
  }, []);

  const bringToFront = useCallback((id) => {
    setZIndexCounter(prev => {
      const next = prev + 1;
      setMacros(macrosPrev => macrosPrev.map(m => m.id === id ? { ...m, zIndex: next } : m));
      return next;
    });
  }, []);

  const handleSaveMacro = () => {
    if (editingMacro?.id) {
      updateMacro(editingMacro.id, draftMacro);
    } else {
      const offset = macros.length * 30;
      const newZ = zIndexCounter + 1;
      setMacros([...macros, { id: Date.now().toString(), x: 40 + offset, y: 40 + offset, zIndex: newZ, ...draftMacro }]);
      setZIndexCounter(newZ);
    }
    setEditingMacro(null);
  };

  const resetPositions = () => {
    setMacros(macros.map((m, i) => ({ ...m, x: 40 + (i * 30), y: 40 + (i * 30), zIndex: 10 + i })));
    showToast("すべての位置をリセットしました");
    setIsSettingsOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6 font-sans flex flex-col relative overflow-hidden">
      <header className="max-w-6xl mx-auto w-full flex justify-between items-center mb-6 relative z-[1000]">
        <h1 className="text-2xl font-bold text-white">FF14 マクロボード</h1>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors shadow-lg">
            <Settings size={20} />
          </button>
          <button onClick={() => { setDraftMacro({ title: '', content: '' }); setEditingMacro({}); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold flex items-center gap-1 transition-colors shadow-lg shadow-blue-900/50">
            <Plus size={18} /> 新規マクロ
          </button>
        </div>
      </header>

      {/* キャンバスエリア */}
      <main className="absolute inset-0 top-[88px] overflow-auto bg-slate-900/50 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]">
        <div className="relative w-full h-[200vh] min-h-full">
          {macros.map((macro) => (
            <MacroCard
              key={macro.id}
              macro={macro}
              highlightPattern={highlightPattern}
              sortedRules={sortedRules}
              onUpdate={updateMacro}
              onDelete={deleteMacro}
              onEdit={editMacro}
              onBringToFront={bringToFront}
              showToast={showToast}
            />
          ))}
        </div>
      </main>

      {/* 編集モーダル */}
      {editingMacro && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-700 shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="font-bold text-lg">マクロ編集</h2>
              <button onClick={() => setEditingMacro(null)} className="text-slate-400 hover:text-white transition-colors"><X /></button>
            </div>
            <div className="p-4 space-y-4">
              <input
                className="w-full bg-slate-900 p-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white"
                value={draftMacro.title} onChange={e => setDraftMacro({ ...draftMacro, title: e.target.value })} placeholder="タイトル"
              />
              <textarea
                className="w-full bg-slate-900 p-3 rounded-lg border border-slate-700 h-64 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white resize-none"
                value={draftMacro.content} onChange={e => setDraftMacro({ ...draftMacro, content: e.target.value })} placeholder="/p マクロ内容"
              />
              <button onClick={handleSaveMacro} className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 設定モーダル */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 p-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between mb-4 sticky top-0 bg-slate-800 pb-2 z-10 border-b border-slate-700">
              <h2 className="font-bold text-lg">設定・ガイド</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-red-400 transition-colors"><X /></button>
            </div>

            <div className="mb-6 pb-6 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">ウィンドウ管理</h3>
              <button onClick={resetPositions} className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors border border-slate-600">
                <RotateCcw size={16} /> 枠の位置をすべて初期位置に戻す
              </button>
              <p className="text-xs text-slate-500 mt-2">※画面外に枠が消えてしまった場合にご利用ください。</p>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">ハイライト色設定</h3>
              <div className="space-y-2 mb-4 max-h-40 overflow-auto border border-slate-700 rounded-lg p-2 bg-slate-900/50">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded shadow-sm" style={{ backgroundColor: rule.color }} />
                      <span className="font-mono text-sm font-bold text-slate-200">{rule.keyword}</span>
                    </div>
                    <button onClick={() => setRules(rules.filter(r => r.id !== rule.id))} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-slate-800 p-2 rounded border border-slate-600 text-sm focus:border-blue-500 outline-none text-white"
                    placeholder="追加する文字 (例: MT)" value={newRuleKeyword} onChange={e => setNewRuleKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && newRuleKeyword && (setRules([...rules, { id: Date.now().toString(), keyword: newRuleKeyword, color: newRuleColor }]), setNewRuleKeyword(''))}
                  />
                  <button
                    onClick={() => { if (newRuleKeyword) { setRules([...rules, { id: Date.now().toString(), keyword: newRuleKeyword, color: newRuleColor }]); setNewRuleKeyword(''); } }}
                    className="px-4 font-bold bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center justify-center text-white"
                  >
                    追加
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color} onClick={() => setNewRuleColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-all duration-200 cursor-pointer ${newRuleColor === color ? 'border-white scale-125 shadow-md shadow-white/20' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: color }} title="この色を選択" aria-label={`${color}を選択`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                <Info size={18} className="text-blue-400" />
                使い方ガイド・注意事項
              </h3>
              <ul className="text-sm text-slate-300 space-y-3 list-disc list-inside">
                <li className="leading-relaxed">
                  <strong className="text-white">ボードの移動と拡大：</strong>
                  <br />タイトル部分をドラッグすると自由に移動できます。枠の右下端をドラッグするとサイズを変更できます。
                </li>
                <li className="leading-relaxed">
                  <strong className="text-white">文字のズーム：</strong>
                  <br />マクロ上で<strong className="text-blue-400">Ctrlキー ＋ マウスホイール</strong>を上下にスクロールすると文字を拡大・縮小できます。
                </li>
                <li className="leading-relaxed">
                  <strong className="text-green-400">自動保存機能：</strong>
                  <br />データや配置はブラウザに自動で保存されます。
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-4 right-4 bg-blue-600 px-4 py-3 rounded-lg shadow-2xl z-[9999] animate-fade-in flex items-center gap-2 font-bold">{toast}</div>}
    </div>
  );
}