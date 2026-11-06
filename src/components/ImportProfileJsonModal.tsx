import { useEffect, useRef, useState } from 'react';
import type { Profile } from '../types';
import { parseProfile } from '../utils/parseProfile';
import { JsonFileButton } from './JsonFileButton';

interface Props {
  onApply: (profile: Profile) => void;
  onClose: () => void;
}

// Replaces the profile being edited with one pasted or loaded from a .json
// file, after validating it against the Profile shape.
export function ImportProfileJsonModal({ onApply, onClose }: Props) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleApply = () => {
    const result = parseProfile(text);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onApply(result.profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(20,28,46,0.65)] flex items-center justify-center z-[100] p-6" onClick={onClose}>
      <div
        className="bg-[#1a2236] rounded-lg w-full max-w-[760px] h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(20,28,46,0.40)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center py-3 px-5 border-b border-white/7 shrink-0 gap-4">
          <span className="[font-family:var(--font-mono)] text-[11px] font-semibold text-[color:var(--ink-invert)] tracking-[0.08em] uppercase shrink-0">
            Import profile JSON — paste or load a file
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            <JsonFileButton
              className="[font-family:var(--font-mono)] text-[11px] bg-transparent text-[#8896AB] border border-white/12 rounded px-3.5 py-1.5 cursor-pointer hover:text-[color:var(--ink-invert)]"
              onLoad={(fileText) => { setText(fileText); setErrors([]); }}
            />
            <button
              className="[font-family:var(--font-mono)] text-[11px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-4 py-1.5 cursor-pointer transition-[filter] duration-150 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleApply}
              disabled={text.trim() === ''}
            >
              Replace profile
            </button>
            <button
              className="text-[14px] bg-transparent border-none text-[#4A5568] cursor-pointer py-1 px-2 rounded leading-none hover:bg-white/7 hover:text-[color:var(--ink-invert)]"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--status-rejected)] bg-[rgba(220,38,38,0.10)] border-b border-[rgba(220,38,38,0.20)] py-2 px-5 shrink-0 flex flex-col gap-1">
            <span className="font-semibold">This doesn't look like a profile:</span>
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="flex-1 [font-family:var(--font-mono)] text-[12.5px] leading-[1.65] text-[#c9d1e0] bg-transparent border-none p-5 resize-none outline-none whitespace-pre [overflow-wrap:normal] overflow-auto"
          value={text}
          onChange={(e) => { setText(e.target.value); setErrors([]); }}
          placeholder={'{\n  "name": "...",\n  "role": "...",\n  "experience": [ ... ],\n  "projects": [ ... ],\n  "skillGroups": [ ... ]\n}'}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
