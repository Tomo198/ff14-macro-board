import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Copy, X, Check, ExternalLink, Info, ZoomIn, ZoomOut } from 'lucide-react';

// 12色のカラープリセットを定義（FF14のロールカラーを意識した構成）
const PRESET_COLORS = [
  '#ef4444', // 赤 (DPS)
  '#f97316', // オレンジ
  '#f59e0b', // アンバー
  '#eab308', // 黄
  '#22c55e', // 緑 (ヒーラー)
  '#10b981', // エメラルド
  '#0ea5e9', // スカイブルー
  '#3b82f6', // 青 (タンク)
  '#8b5cf6', // バイオレット
  '#d946ef', // ピンク/フクシア
  '#94a3b8', // スレート(グレー)
  '#ffffff', // 白
];

const INITIAL_MACROS = [
  {
    id: '1',
    title: '共鳴4層 散開・暴走',
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

// 初期設定の色もプリセットの色コードに統一
const INITIAL_RULES = [
  { id: '1', keyword: 'MT', color: PRESET_COLORS[7] }, // 青
  { id: '2', keyword: 'ST', color: PRESET_COLORS[7] },
  { id: '3', keyword: 'T', color: PRESET_COLORS[7] },
  { id: '4', keyword: 'H1', color: PRESET_COLORS[4] }, // 緑
  { id: '5', keyword: 'H2', color: PRESET_COLORS[4] },
  { id: '6', keyword: 'H', color: PRESET_COLORS[4] },
  { id: '7', keyword: 'D1', color: PRESET_COLORS[0] }, // 赤
  { id: '8', keyword: 'D2', color: PRESET_COLORS[0] },
  { id: '9', keyword: 'D3', color: PRESET_COLORS[0] },
  { id: '10', keyword: 'D4', color: PRESET_COLORS[0] },
  { id: '11', keyword: 'D', color: PRESET_COLORS[0] },
];

export default function App() {
  // 【変更点】初期化時にローカルストレージからデータを読み込む
  const [macros, setMacros] = useState(() => {
    try {
      const saved = localStorage.getItem('ff14_macros');
      return saved ? JSON.parse(saved) : INITIAL_MACROS;
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

  // 【変更点】マクロが変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('ff14_macros', JSON.stringify(macros));
  }, [macros]);

  // 【変更点】ルールが変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('ff14_rules', JSON.stringify(rules));
  }, [rules]);

  const [editingMacro, setEditingMacro] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [draftMacro, setDraftMacro] = useState({ title: '', content: '' });

  // 新規ルール用のステート。初期選択色を青に設定。
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleColor, setNewRuleColor] = useState(PRESET_COLORS[7]);

  const [zoomLevels, setZoomLevels] = useState({});
  const cardContentRefs = useRef({});

  const handleZoomChange = (id, newSize) => {
    setZoomLevels(prev => ({ ...prev, [id]: newSize }));
  };

  const { sortedRules, highlightPattern } = React.useMemo(() => {
    const sorted = [...rules].sort((a, b) => b.keyword.length - a.keyword.length);
    const patternStr = sorted.map(r => r.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const pattern = patternStr ? new RegExp(`(${patternStr})`, 'g') : null;
    return { sortedRules: sorted, highlightPattern: pattern };
  }, [rules]);

  useEffect(() => {
    const cleanupFns = [];

    Object.entries(cardContentRefs.current).forEach(([id, element]) => {
      if (!element) return;

      const handleWheel = (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -1 : 1;
          setZoomLevels(prev => {
            const current = prev[id] || 13;
            const next = Math.max(10, Math.min(40, current + delta));
            return { ...prev, [id]: next };
          });
        }
      };

      element.addEventListener('wheel', handleWheel, { passive: false });
      cleanupFns.push(() => element.removeEventListener('wheel', handleWheel));
    });

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, [macros]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('コピーしました');
    });
  };

  const openInPiP = async (macro) => {
    if (!window.documentPictureInPicture) {
      showToast("【非対応】お使いの環境は文字のPiPに対応していません（PCのChrome/Edgeをご利用ください）");
      return;
    }

    try {
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 400,
        height: 500,
      });

      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
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

      let currentPipZoom = zoomLevels[macro.id] || 13;
      const zoomContainer = pipWindow.document.createElement('div');
      zoomContainer.className = 'flex items-center gap-2';
      zoomContainer.innerHTML = `
        <span style="font-size: 12px; color: #94a3b8;">A-</span>
        <input type="range" min="10" max="40" value="${currentPipZoom}" class="w-20 accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" id="pip-zoom">
        <span style="font-size: 14px; color: #94a3b8; font-weight: bold;">A+</span>
      `;

      header.appendChild(title);
      header.appendChild(zoomContainer);

      const contentWrapper = pipWindow.document.createElement('div');
      contentWrapper.className = 'flex-1 overflow-auto';

      const pre = pipWindow.document.createElement('pre');
      pre.className = 'leading-snug whitespace-pre font-mono font-medium';
      pre.style.fontSize = `${currentPipZoom}px`;
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
        const newSize = e.target.value;
        pre.style.fontSize = `${newSize}px`;
        handleZoomChange(macro.id, parseInt(newSize, 10));
      });

      contentWrapper.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -1 : 1;
          const currentSize = parseInt(pre.style.fontSize, 10) || 13;
          const nextSize = Math.max(10, Math.min(40, currentSize + delta));
          pre.style.fontSize = `${nextSize}px`;
          slider.value = nextSize;
          handleZoomChange(macro.id, nextSize);
        }
      }, { passive: false });

    } catch (err) {
      console.error("PiPエラー:", err);
      if (err.name === 'NotAllowedError' || (err.message && err.message.includes('top-level browsing context'))) {
        showToast("プレビュー環境ではPiPを利用できません。デプロイ後、または独立したタブで実行してください。");
      } else {
        showToast("PiPウィンドウの展開に失敗しました。");
      }
    }
  };

  const handleSaveMacro = () => {
    if (editingMacro?.id) {
      setMacros(macros.map(m => m.id === editingMacro.id ? { ...m, ...draftMacro } : m));
    } else {
      setMacros([...macros, { id: Date.now().toString(), ...draftMacro }]);
    }
    setEditingMacro(null);
  };

  const HighlightedText = React.memo(({ text }) => {
    if (!highlightPattern) return <>{text}</>;
    const parts = text.split(highlightPattern);
    return parts.map((part, i) => {
      const rule = sortedRules.find(r => r.keyword === part);
      return rule ? <span key={i} style={{ color: rule.color, fontWeight: 800 }}>{part}</span> : part;
    });
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">FF14 マクロボード</h1>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors">
            <Settings size={20} />
          </button>
          <button onClick={() => { setDraftMacro({ title: '', content: '' }); setEditingMacro({}); }} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 font-bold flex items-center gap-1 transition-colors">
            <Plus size={18} /> 新規マクロ
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {macros.map((macro) => {
          const currentZoom = zoomLevels[macro.id] || 13;
          return (
            <div
              key={macro.id}
              className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col group resize overflow-hidden shadow-lg"
              style={{ height: '400px', minHeight: '200px', minWidth: '280px' }}
            >
              <div className="flex flex-col border-b border-slate-700 bg-slate-800/50">
                <div className="flex justify-between items-center p-3 pb-2">
                  <span className="font-semibold truncate">{macro.title}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openInPiP(macro)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors" title="PiPモード（最前面）">
                      <ExternalLink size={16} />
                    </button>
                    <button onClick={() => { setDraftMacro(macro); setEditingMacro(macro); }} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setMacros(macros.filter(m => m.id !== macro.id))} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="px-3 pb-2 flex items-center gap-2">
                  <ZoomOut size={14} className="text-slate-500" />
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={currentZoom}
                    onChange={(e) => handleZoomChange(macro.id, parseInt(e.target.value, 10))}
                    className="flex-1 accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <ZoomIn size={14} className="text-slate-500" />
                  <span className="text-[10px] text-slate-400 hidden xl:block whitespace-nowrap cursor-help" title="枠の右下をドラッグでサイズ変更、Ctrl+マウスホイールで文字の拡大縮小ができます">
                    (Ctrl+ホイールで文字ズーム / 右下ドラッグで枠リサイズ)
                  </span>
                </div>
              </div>

              <div
                ref={el => cardContentRefs.current[macro.id] = el}
                className="p-4 relative bg-[#0f172a] flex-1 overflow-auto"
              >
                <pre
                  className="whitespace-pre font-mono font-medium tracking-wide"
                  style={{ fontSize: `${currentZoom}px` }}
                >
                  <HighlightedText text={macro.content} />
                </pre>
                <button onClick={() => copyToClipboard(macro.content)} className="absolute top-2 right-2 p-2 bg-blue-600/80 rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <Copy size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {/* 編集モーダル */}
      {editingMacro && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-700 shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="font-bold text-lg">マクロ編集</h2>
              <button onClick={() => setEditingMacro(null)} className="text-slate-400 hover:text-white transition-colors"><X /></button>
            </div>
            <div className="p-4 space-y-4">
              <input
                className="w-full bg-slate-900 p-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white"
                value={draftMacro.title}
                onChange={e => setDraftMacro({ ...draftMacro, title: e.target.value })}
                placeholder="タイトル"
              />
              <textarea
                className="w-full bg-slate-900 p-3 rounded-lg border border-slate-700 h-64 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white resize-none"
                value={draftMacro.content}
                onChange={e => setDraftMacro({ ...draftMacro, content: e.target.value })}
                placeholder="/p マクロ内容"
              />
              <button onClick={handleSaveMacro} className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 設定モーダル */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 p-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between mb-4 sticky top-0 bg-slate-800 pb-2 z-10 border-b border-slate-700">
              <h2 className="font-bold text-lg">設定・ガイド</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-red-400 transition-colors"><X /></button>
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
                    placeholder="追加する文字 (例: MT)"
                    value={newRuleKeyword}
                    onChange={e => setNewRuleKeyword(e.target.value)}
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
                      key={color}
                      onClick={() => setNewRuleColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-all duration-200 cursor-pointer
                        ${newRuleColor === color
                          ? 'border-white scale-125 shadow-md shadow-white/20'
                          : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                      title="この色を選択"
                      aria-label={`${color}を選択`}
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
                  <strong className="text-white">ボード枠のサイズ変更：</strong>
                  <br />各マクロカードの<strong className="text-blue-400">右下端（斜線部分）をドラッグ</strong>することで、縦・横・斜めにカード自体を自由に拡大・縮小できます。
                </li>
                <li className="leading-relaxed">
                  <strong className="text-white">文字のズーム：</strong>
                  <br />マクロ上で<strong className="text-blue-400">Ctrlキー ＋ マウスホイール</strong>を上下にスクロールすると、文字だけを素早く拡大・縮小できます（スライダーでの操作も可能です）。
                </li>
                {/* 【変更点】注意書きを自動保存に関する内容にアップデート */}
                <li className="leading-relaxed">
                  <strong className="text-green-400">自動保存機能：</strong>
                  <br />追加したマクロや色設定は、お使いのブラウザに自動で保存されます。次回開いたときもそのまま続きから利用できます。<span className="text-yellow-400">※PCとスマホなど、別の端末間でデータを共有することはできません。</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-4 right-4 bg-blue-600 px-4 py-3 rounded-lg shadow-2xl z-50 animate-fade-in flex items-center gap-2 font-bold">{toast}</div>}
    </div>
  );
}