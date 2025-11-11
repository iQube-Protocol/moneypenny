import React, { useEffect } from 'react';

type PropsWithChildren<P = unknown> = P & { children?: React.ReactNode };

/** Inject tokens/styles once near app root */
export function UIStyles() {
  useEffect(() => {
    if (document.getElementById('ui-thin-styles')) return;
    const style = document.createElement('style');
    style.id = 'ui-thin-styles';
    style.innerHTML = CSS_TEXT;
    document.head.appendChild(style);
  }, []);
  return null;
}

/** Design tokens + component styles (no external deps) */
const CSS_TEXT = `
:root {
  /* Color system */
  --bg: 14 25 45;
  --card-rgba: 255,255,255; /* glass bg uses alpha */
  --ring-rgba: 255,255,255;

  --muted: 148 163 184;    /* slate-400 */
  --text: 226 232 240;     /* slate-200 */
  --text-weak: 203 213 225;/* slate-300 */

  --brand: 99 102 241;     /* indigo-500 */
  --success: 34 197 94;    /* green-500 */
  --warn: 234 179 8;       /* yellow-500 */
  --error: 244 63 94;      /* rose-500 */

  /* Accents */
  --accent-cyan: 34 211 238;
  --accent-purple: 168 85 247;
  --accent-blue: 59 130 246;

  /* Chains */
  --chain-eth: 59 130 246;
  --chain-arb: 6 182 212;
  --chain-base: 59 130 246;
  --chain-op: 244 63 94;
  --chain-poly: 168 85 247;
  --chain-btc: 245 159 0;
  --chain-sol: 16 185 129;

  /* Radii */
  --radius-xs: 4px;
  --radius: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-soft: 0 1px 0 0 rgba(255,255,255,0.05);

  /* Glass alphas */
  --alpha-card: 0.05;
  --alpha-card-strong: 0.10;
  --alpha-ring: 0.10;
  --alpha-hover: 0.10;
  --alpha-hover-2: 0.20;

  /* Spacing scale (px) */
  --s-0: 0px; --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px;
}

html, body {
  background: rgb(var(--bg));
  color: rgb(var(--text));
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}
* { box-sizing: border-box; }

/* Scrollbars (subtle) */
* { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.2) transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 999px; }

/* Utility classes */
.ui-row { display: flex; align-items: center; }
.ui-between { display: flex; align-items: center; justify-content: space-between; }
.ui-col { display: flex; flex-direction: column; }
.ui-gap-1 { gap: var(--s-1); }
.ui-gap-2 { gap: var(--s-2); }
.ui-gap-3 { gap: var(--s-3); }
.ui-p-2 { padding: var(--s-2); }
.ui-p-3 { padding: var(--s-3); }
.ui-px-4 { padding-left: var(--s-4); padding-right: var(--s-4); }
.ui-py-3 { padding-top: var(--s-3); padding-bottom: var(--s-3); }
.ui-mb-2 { margin-bottom: var(--s-2); }
.ui-mb-3 { margin-bottom: var(--s-3); }
.ui-mt-2 { margin-top: var(--s-2); }
.ui-mt-3 { margin-top: var(--s-3); }

.ui-text-xs { font-size: 12px; line-height: 1.3; }
.ui-text-11 { font-size: 11px; line-height: 1.3; }
.ui-text-10 { font-size: 10px; line-height: 1.3; }
.ui-text-weak { color: rgb(var(--text-weak)); }
.ui-muted { color: rgb(var(--muted)); }
.ui-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

.ui-ring { box-shadow: 0 0 0 1px rgba(var(--ring-rgba), var(--alpha-ring)); }
.ui-rounded { border-radius: var(--radius); }
.ui-rounded-lg { border-radius: var(--radius-lg); }
.ui-rounded-xs { border-radius: var(--radius-xs); }
.ui-shadow-soft { box-shadow: var(--shadow-soft); }
.ui-hover:hover { background: rgba(255,255,255, var(--alpha-hover)); }

/* Card */
.ui-card {
  background: rgba(var(--card-rgba), var(--alpha-card));
  border-radius: var(--radius);
  padding: var(--s-3);
  box-shadow: var(--shadow-soft);
  position: relative;
}
.ui-card-ring { box-shadow: 0 0 0 1px rgba(var(--ring-rgba), var(--alpha-ring)); }
.ui-card-title { font-size: 12px; font-weight: 600; color: rgb(var(--text)); letter-spacing: .02em; }

/* Inputs */
.ui-input, .ui-select, .ui-textarea {
  width: 100%;
  background: rgba(255,255,255, .05);
  color: rgb(var(--text));
  border-radius: var(--radius);
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
  border: none;
  box-shadow: 0 0 0 1px rgba(var(--ring-rgba), var(--alpha-ring));
}
.ui-input::placeholder { color: rgba(255,255,255,.45); }

/* Buttons */
.ui-btn {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: var(--radius);
  color: rgb(var(--text));
  cursor: pointer;
  border: none;
  background: rgba(59,130,246, .20); /* blue-500/20 */
  box-shadow: 0 0 0 1px rgba(59,130,246, .30); /* ring */
  transition: background .15s ease;
}
.ui-btn:hover { background: rgba(59,130,246, .30); }
.ui-btn:disabled { background: rgba(255,255,255,.05); color: rgba(255,255,255,.5); cursor: not-allowed; }
.ui-btn-ghost { background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(var(--ring-rgba), var(--alpha-ring)); }
.ui-btn-ghost:hover { background: rgba(255,255,255,.10); }
.ui-btn-success {
  background: rgba(34,197,94, .10); box-shadow: 0 0 0 1px rgba(34,197,94, .20); color: rgba(34,197,94, .95);
}
.ui-btn-success:hover { background: rgba(34,197,94, .20); }
.ui-btn-danger {
  background: rgba(244,63,94, .10); box-shadow: 0 0 0 1px rgba(244,63,94, .20); color: rgba(244,63,94, .95);
}
.ui-btn-danger:hover { background: rgba(244,63,94, .20); }

/* Badges */
.ui-badge { display: inline-block; padding: 2px 6px; font-size: 11px; border-radius: var(--radius); box-shadow: 0 0 0 1px rgba(var(--ring-rgba), var(--alpha-ring)); }
.ui-badge-custody { background: rgba(217,70,239,.10); color: rgba(240,171,252,.95); box-shadow: 0 0 0 1px rgba(217,70,239,.20); }
.ui-badge-claims { background: rgba(34,211,238,.10); color: rgba(125,211,252,.95); box-shadow: 0 0 0 1px rgba(34,211,238,.20); }

/* Header w/ info icon */
.ui-section-header { display:flex; align-items:center; justify-content:space-between; }
.ui-info { display:inline-flex; align-items:center; justify-content:center; color:rgba(255,255,255,.6); width:16px; height:16px; border-radius:999px; cursor:help; }

/* Scroll Area */
.ui-scroll { overflow-y: auto; }
.ui-maxh-72 { max-height: 18rem; }

/* Drawer */
.ui-drawer-root { position: fixed; inset: 0; z-index: 50; }
.ui-drawer-backdrop { position: absolute; inset: 0; background: rgba(30,27,75,.6); }
.ui-drawer-panel {
  position: absolute; top: 0; right: 0; height: 100%; width: 21.6rem;
  background: rgba(0,0,0,.30); backdrop-filter: blur(12px);
  box-shadow: 0 0 0 1px rgba(var(--ring-rgba), var(--alpha-ring));
  border-left: 1px solid rgba(255,255,255,.10); overflow-y: auto;
}
.ui-drawer-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px;
  background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(var(--ring-rgba), var(--alpha-ring)); }

/* Modal */
.ui-modal-root { position: fixed; inset: 0; z-index: 50; display:flex; align-items:center; justify-content:center; }
.ui-modal-backdrop { position: absolute; inset: 0; background: rgba(30,27,75,.6); }
.ui-modal-panel { position: relative; z-index: 1; width: min(560px, 92vw); background: rgba(0,0,0,.30); backdrop-filter: blur(12px);
  border-radius: var(--radius-lg); box-shadow: 0 0 0 1px rgba(var(--ring-rgba), var(--alpha-ring)); padding: 16px; }
`;

/* Components */
export function Card(props: PropsWithChildren<{ className?: string; title?: string; extra?: React.ReactNode }>) {
  const { className, title, extra, children } = props;
  return (
    <div className={`ui-card ui-card-ring ${className || ''}`}>
      {(title || extra) && (
        <div className="ui-section-header ui-mb-3">
          <div className="ui-card-title">{title}</div>
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}

export function SectionHeader(props: { title: string; infoTitle?: string; right?: React.ReactNode }) {
  return (
    <div className="ui-section-header ui-mb-2">
      <div className="ui-card-title">{props.title}</div>
      <div className="ui-row ui-gap-2">
        {props.right}
        {props.infoTitle ? <span className="ui-info" title={props.infoTitle}>i</span> : null}
      </div>
    </div>
  );
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'ghost'|'success'|'danger' }
) {
  const { variant='primary', className, ...rest } = props;
  const v = variant === 'ghost' ? 'ui-btn ui-btn-ghost'
          : variant === 'success' ? 'ui-btn ui-btn-success'
          : variant === 'danger' ? 'ui-btn ui-btn-danger'
          : 'ui-btn';
  return <button {...rest} className={`${v} ${className || ''}`} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={`ui-input ${className || ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return <select {...rest} className={`ui-select ${className || ''}`}>{children}</select>;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={`ui-textarea ${className || ''}`} />;
}

export function Badge(props: PropsWithChildren<{ className?: string; variant?: 'custody'|'claims'|'neutral' }>) {
  const { children, variant='neutral', className } = props;
  const v = variant === 'custody' ? 'ui-badge ui-badge-custody'
          : variant === 'claims' ? 'ui-badge ui-badge-claims'
          : 'ui-badge';
  return <span className={`${v} ${className || ''}`}>{children}</span>;
}

export function ScrollArea(props: PropsWithChildren<{ className?: string; maxHeight?: number }>) {
  const { className, maxHeight, children } = props;
  const style = maxHeight ? { maxHeight: `${maxHeight}px` } : undefined;
  return <div className={`ui-scroll ${className || ''}`} style={style}>{children}</div>;
}

/* Drawer */
export function Drawer(props: PropsWithChildren<{
  open: boolean; onClose?: () => void; title?: React.ReactNode; right?: React.ReactNode; style?: React.CSSProperties;
}>) {
  const { open, onClose, title, right, children, style } = props;
  if (!open) return null;
  return (
    <div className="ui-drawer-root">
      <div className="ui-drawer-backdrop" onClick={onClose} />
      <aside className="ui-drawer-panel" style={style}>
        {(title || right) && (
          <div className="ui-drawer-header">
            <div className="ui-card-title">{title}</div>
            <div className="ui-row ui-gap-2">
              {right}
              <Button variant="ghost" onClick={onClose} aria-label="Close">✕</Button>
            </div>
          </div>
        )}
        <div className="ui-px-4 ui-py-3 ui-col ui-gap-3">{children}</div>
      </aside>
    </div>
  );
}

/* Modal */
export function Modal(props: PropsWithChildren<{
  open: boolean; onClose?: () => void; title?: string; right?: React.ReactNode;
}>) {
  const { open, onClose, title, right, children } = props;
  if (!open) return null;
  return (
    <div className="ui-modal-root">
      <div className="ui-modal-backdrop" onClick={onClose} />
      <div className="ui-modal-panel">
        {(title || right) && (
          <div className="ui-between ui-mb-3">
            <div className="ui-card-title">{title}</div>
            <div className="ui-row ui-gap-2">
              {right}
              <Button variant="ghost" onClick={onClose} aria-label="Close">✕</Button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* Helpers */
export function truncateHash(hash?: string, left=12, right=8) {
  if (!hash) return '';
  if (hash.length <= left + right + 3) return hash;
  return `${hash.slice(0, left)}…${hash.slice(-right)}`;
}

/* Tiny chain chip (uses your chain tokens) */
export function ChainChip({ chain, label }: { chain: string; label?: string }) {
  const c = (chain || '').toLowerCase();
  const color =
    c==='ethereum' ? 'var(--chain-eth)' :
    c==='arbitrum' ? 'var(--chain-arb)' :
    c==='base' ? 'var(--chain-base)' :
    c==='optimism' ? 'var(--chain-op)' :
    c==='polygon' ? 'var(--chain-poly)' :
    c==='bitcoin' ? 'var(--chain-btc)' :
    c==='solana' ? 'var(--chain-sol)' : '255 255 255';
  const dot = { width: 10, height: 10, borderRadius: 999, background: `rgb(${color})`, display:'inline-block', marginRight:6, boxShadow:'0 0 0 1px rgba(255,255,255,.25)' };
  return <span className="ui-badge ui-hover"><span style={dot} />{label || chain}</span>;
}
