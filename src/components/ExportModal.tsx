import { useEffect, useState } from 'react';

interface Props {
  text: string;
  onClose: () => void;
}

export function ExportModal({ text, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-[rgba(20,28,46,0.60)] flex items-center justify-center z-[100] p-6" onClick={onClose}>
      <div
        className="bg-[color:var(--surface)] rounded-lg w-full max-w-[740px] max-h-[84vh] flex flex-col shadow-[0_16px_48px_rgba(20,28,46,0.24)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center py-3.5 px-5 border-b border-[color:var(--rule)] shrink-0 gap-3">
          <span className="[font-family:var(--font-mono)] text-[12px] font-semibold text-[color:var(--ink)] tracking-[0.06em] uppercase">LLM Export</span>
          <div className="flex gap-2 items-center">
            <button
              className={
                copied
                  ? '[font-family:var(--font-mono)] text-[11px] bg-[#059669] text-[color:var(--ink)] font-semibold border-none rounded px-3.5 py-1.5 cursor-pointer tracking-[0.02em] hover:bg-[#059669]'
                  : '[font-family:var(--font-mono)] text-[11px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-3.5 py-1.5 cursor-pointer transition-[filter] duration-150 tracking-[0.02em] hover:brightness-110'
              }
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <button
              className="text-[14px] bg-transparent border-none text-[color:var(--ink-3)] cursor-pointer py-1 px-2 rounded leading-none hover:bg-[color:var(--bg)] hover:text-[color:var(--ink)]"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        <pre className="[font-family:var(--font-mono)] text-[11.5px] leading-[1.65] text-[color:var(--ink-2)] py-5 px-6 overflow-y-auto whitespace-pre-wrap break-words flex-1">{text}</pre>
      </div>
    </div>
  );
}
