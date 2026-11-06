import { useEffect, useRef, useState } from 'react';
import type { ApplicationConfig, Profile, SkillGroup } from '../types';
import { parseSkillGroups } from '../utils/parseSkillGroups';
import { CVDocument } from './cv/CVDocument';

interface Props {
  application: ApplicationConfig;
  profile: Profile;
  onApply: (skillGroups: SkillGroup[]) => void;
  onClose: () => void;
}

const PLACEHOLDER = `[
  { "label": "Languages", "skills": ["TypeScript", "Python"] },
  { "label": "Frameworks", "skills": ["React", "FastAPI"] }
]`;

export function ImportSkillGroupsModal({ application, profile, onApply, onClose }: Props) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [previewGroups, setPreviewGroups] = useState<SkillGroup[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePreview = () => {
    const result = parseSkillGroups(text);
    if (!result.ok) {
      setErrors(result.errors);
      setPreviewGroups(null);
      return;
    }
    setErrors([]);
    setPreviewGroups(result.skillGroups);
  };

  const backToEdit = () => setPreviewGroups(null);

  const handleApply = () => {
    if (!previewGroups) return;
    onApply(previewGroups);
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
            {previewGroups ? 'Preview skill groups' : 'Import skill groups JSON'}
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            {previewGroups ? (
              <>
                <button
                  className="[font-family:var(--font-mono)] text-[11px] bg-transparent text-[#8896AB] border border-white/12 rounded px-3.5 py-1.5 cursor-pointer hover:text-[color:var(--ink-invert)]"
                  onClick={backToEdit}
                >
                  Back to edit
                </button>
                <button
                  className="[font-family:var(--font-mono)] text-[11px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-4 py-1.5 cursor-pointer transition-[filter] duration-150 hover:brightness-110"
                  onClick={handleApply}
                >
                  Apply
                </button>
              </>
            ) : (
              <button
                className="[font-family:var(--font-mono)] text-[11px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-4 py-1.5 cursor-pointer transition-[filter] duration-150 hover:brightness-110"
                onClick={handlePreview}
              >
                Preview
              </button>
            )}
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
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        {previewGroups ? (
          <div className="flex-1 overflow-y-auto bg-[#0f1522]">
            <div className="py-8 px-5">
              <CVDocument profile={profile} application={{ ...application, skillGroupsOverride: previewGroups }} />
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="flex-1 [font-family:var(--font-mono)] text-[12.5px] leading-[1.65] text-[#c9d1e0] bg-transparent border-none p-5 resize-none outline-none whitespace-pre [overflow-wrap:normal] overflow-auto"
            value={text}
            onChange={(e) => { setText(e.target.value); setErrors([]); }}
            placeholder={PLACEHOLDER}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
