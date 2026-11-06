import { useState } from 'react';
import type { AppLanguage, BaseProfile, Profile } from '../types';
import { getStaticProfile } from '../data/profiles';
import { blankProfile, saveBaseProfile, uniqueBaseProfileId } from '../utils/baseProfiles';
import { parseProfile } from '../utils/parseProfile';
import { JsonFileButton } from './JsonFileButton';
import { nafSection, nafLabel, nafInput, nafAddBtn } from '../styles/formStyles';

type StartFrom = 'blank' | 'language-default' | 'json' | `duplicate:${string}`;

interface Props {
  existingProfiles: BaseProfile[];
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function CreateBaseProfileModal({ existingProfiles, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [startFrom, setStartFrom] = useState<StartFrom>('language-default');
  const [jsonText, setJsonText] = useState('');
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);

  const canCreate = name.trim() !== '' && (startFrom !== 'json' || jsonText.trim() !== '');

  const handleCreate = () => {
    if (!canCreate) return;

    let profile: Profile;
    if (startFrom === 'json') {
      const result = parseProfile(jsonText);
      if (!result.ok) {
        setJsonErrors(result.errors);
        return;
      }
      profile = result.profile;
    } else {
      profile = startFrom === 'blank'
        ? blankProfile(language)
        : startFrom === 'language-default'
          ? { ...getStaticProfile(language) }
          : { ...existingProfiles.find((p) => p.id === startFrom.slice('duplicate:'.length))!.profile };
    }

    const id = uniqueBaseProfileId(name);
    const baseProfile: BaseProfile = { id, name: name.trim(), language, profile };
    saveBaseProfile(baseProfile);
    onCreated(id);
  };

  return (
    <div className="fixed inset-0 bg-[rgba(20,28,46,0.65)] flex items-center justify-center z-[100] p-6" onClick={onClose}>
      <div
        className={`bg-[#1a2236] rounded-lg w-full ${startFrom === 'json' ? 'max-w-[600px]' : 'max-w-[440px]'} p-6 flex flex-col gap-4 shadow-[0_20px_60px_rgba(20,28,46,0.40)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="[font-family:var(--font-mono)] text-[12px] font-semibold tracking-[0.04em] uppercase text-[color:var(--ink-invert)]">
          New base profile
        </div>

        <div className={nafSection}>
          <span className={nafLabel}>Name</span>
          <input
            autoFocus
            className={nafInput}
            placeholder="e.g. Backend (EN)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={nafSection}>
          <span className={nafLabel}>Language</span>
          <select
            className={nafInput}
            value={language}
            onChange={(e) => setLanguage(e.target.value as AppLanguage)}
          >
            <option value="en">English 🇬🇧</option>
            <option value="de">Deutsch 🇩🇪</option>
          </select>
        </div>

        <div className={nafSection}>
          <span className={nafLabel}>Start from</span>
          <select
            className={nafInput}
            value={startFrom}
            onChange={(e) => setStartFrom(e.target.value as StartFrom)}
          >
            <option value="language-default">Language default</option>
            <option value="blank">Blank profile</option>
            <option value="json">Import JSON (paste or file)</option>
            {existingProfiles.length > 0 && (
              <optgroup label="Duplicate existing">
                {existingProfiles.map((p) => (
                  <option key={p.id} value={`duplicate:${p.id}`}>{p.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {startFrom === 'json' && (
          <div className={nafSection}>
            <div className="flex items-center justify-between gap-2">
              <span className={nafLabel}>Profile JSON</span>
              <JsonFileButton
                className={nafAddBtn}
                onLoad={(fileText) => { setJsonText(fileText); setJsonErrors([]); }}
              />
            </div>
            <textarea
              className={nafInput + ' [font-family:var(--font-mono)] text-[11.5px] leading-[1.55] h-[220px] resize-none whitespace-pre [overflow-wrap:normal] overflow-auto'}
              placeholder={'{\n  "name": "...",\n  "role": "...",\n  ...\n}'}
              spellCheck={false}
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setJsonErrors([]); }}
            />
            {jsonErrors.length > 0 && (
              <div className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--status-rejected)] flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                <span className="font-semibold">This doesn't look like a profile:</span>
                {jsonErrors.map((err, i) => <div key={i}>{err}</div>)}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-1">
          <button
            className="[font-family:var(--font-mono)] text-[11px] bg-transparent text-[color:var(--ink-3)] border border-white/12 rounded px-3.5 py-[6px] cursor-pointer hover:text-[color:var(--ink-invert)]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="[font-family:var(--font-mono)] text-[11px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-4 py-[6px] cursor-pointer transition-[filter] duration-150 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleCreate}
            disabled={!canCreate}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
