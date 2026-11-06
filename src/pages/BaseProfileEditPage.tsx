import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useBlocker } from 'react-router-dom';
import type {
  ApplicationConfig, BaseProfile, Profile,
  Experience, Project, HumanLanguage,
} from '../types';
import {
  getBaseProfile, saveBaseProfile, deleteBaseProfile, applicationsUsingBaseProfile,
} from '../utils/baseProfiles';
import { CVDocument } from '../components/cv/CVDocument';
import { AutoTextarea } from '../components/AutoTextarea';
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog';
import { ImportProfileJsonModal } from '../components/ImportProfileJsonModal';
import { SkillGroupsEditor } from '../components/SkillGroupsEditor';
import { MoveButtons } from '../components/MoveButtons';
import { move } from '../utils/move';
import {
  nafSection, nafRow, nafLabel, nafOptional, nafInput, nafTextarea,
  nafParagraphRow, nafRemoveBtn, nafAddBtn,
} from '../styles/formStyles';

// ── helpers ─────────────────────────────────────────────────────────────────

function at<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
}
function without<T>(arr: T[], i: number): T[] {
  return arr.filter((_, idx) => idx !== i);
}

// ── primitives ───────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={nafLabel}>{title}</span>
      <div className="flex-1 h-px bg-[color:var(--rule)]" />
    </div>
  );
}

function EntryCard<T>({ children, items, index, onChange, removeLabel = 'Remove' }: {
  children: React.ReactNode;
  items: T[];
  index: number;
  onChange: (next: T[]) => void;
  removeLabel?: string;
}) {
  return (
    <div className="border border-[color:var(--rule)] rounded p-3.5 flex flex-col gap-3">
      {children}
      <div className="flex justify-between">
        <button className={nafRemoveBtn} onClick={() => onChange(without(items, index))}>{removeLabel}</button>
        <MoveButtons index={index} length={items.length} onMove={(to) => onChange(move(items, index, to))} />
      </div>
    </div>
  );
}

// ── constants ────────────────────────────────────────────────────────────────

const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', de: '🇩🇪' };
const PREVIEW_APP: ApplicationConfig = { id: 'base-profile-preview', company: '', role: '', status: 'drafting' };

// ── page ─────────────────────────────────────────────────────────────────────

export function BaseProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const stored = id ? getBaseProfile(id) : undefined;

  if (!id || !stored) {
    return (
      <div className="py-20 px-10 [font-family:var(--font-mono)] text-[color:var(--ink-2)] flex flex-col gap-4">
        <p>Base profile not found.</p>
        <Link className="text-[color:var(--accent)]" to="/profiles">← Back to base profiles</Link>
      </div>
    );
  }

  return <BaseProfileEditContent stored={stored} />;
}

function BaseProfileEditContent({ stored }: { stored: BaseProfile }) {
  const navigate = useNavigate();
  const [name, setName] = useState(stored.name);
  const [profile, setProfile] = useState<Profile>(stored.profile);
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imported, setImported] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // ── updaters ──────────────────────────────────────────────────────────────

  const set = (patch: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...patch }));
    setIsDirty(true);
  };

  const setName_ = (value: string) => {
    setName(value);
    setIsDirty(true);
  };

  const setExp = (i: number, patch: Partial<Experience>) =>
    set({ experience: at(profile.experience, i, patch) });

  const setExpBullet = (ei: number, bi: number, val: string) =>
    setExp(ei, { bullets: profile.experience[ei].bullets.map((b, i) => (i === bi ? val : b)) });

  const setProj = (i: number, patch: Partial<Project>) =>
    set({ projects: at(profile.projects, i, patch) });

  const setLangItem = (i: number, patch: Partial<HumanLanguage>) =>
    set({ languages: at(profile.languages, i, patch) });

  const setInterest = (i: number, val: string) =>
    set({ interests: profile.interests.map((x, idx) => (idx === i ? val : x)) });

  // ── actions ───────────────────────────────────────────────────────────────

  const handleSave = () => {
    saveBaseProfile({ id: stored.id, name: name.trim() || stored.name, language: stored.language, profile });
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    const usedBy = applicationsUsingBaseProfile(stored.id);
    const message = usedBy.length > 0
      ? `"${stored.name}" is used by ${usedBy.length} application${usedBy.length === 1 ? '' : 's'} ` +
        `(${usedBy.map((a) => a.company).join(', ')}). Deleting it will fall them back to the ` +
        `language default profile. Delete anyway?`
      : `Delete base profile "${stored.name}"? This cannot be undone.`;
    if (!confirm(message)) return;
    deleteBaseProfile(stored.id);
    navigate('/profiles');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `profile-${stored.language}-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (next: Profile) => {
    setProfile(next);
    setIsDirty(true);
    setImported(true);
    setTimeout(() => setImported(false), 2000);
  };

  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-[color:var(--ink)] flex flex-col">

      {/* Header */}
      <div className="bg-[color:var(--ink)] flex items-center justify-between px-6 h-[52px] shrink-0 gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <Link className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-3)] no-underline hover:text-[color:var(--ink-invert)]" to="/profiles">
            ← Base profiles
          </Link>
          <div className="[font-family:var(--font-mono)] text-[13px] flex items-center gap-2 min-w-0">
            <span className="text-[color:var(--ink-3)]">~/</span>
            <span className="text-[color:var(--ink-invert)] font-semibold truncate">{stored.name}</span>
            <span className="text-[12px]" title={stored.language}>{LANG_FLAGS[stored.language]}</span>
            {isDirty && (
              <span className="text-[9px] tracking-[0.1em] uppercase text-[color:var(--status-sent)] border border-[color:var(--status-sent)] rounded-[10px] py-px px-[7px] opacity-80 shrink-0">
                unsaved
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            className={`[font-family:var(--font-mono)] text-[11px] font-semibold border-none rounded px-4 py-[5px] cursor-pointer transition-colors duration-150 ${
              saved ? 'bg-[color:var(--status-offer)] text-[color:var(--ink)] pointer-events-none' : 'bg-[color:var(--accent)] text-[color:var(--ink)] hover:opacity-90'
            }`}
            onClick={handleSave}
          >{saved ? 'Saved!' : 'Save'}</button>

          <button
            className="[font-family:var(--font-mono)] text-[11px] bg-transparent text-[color:var(--ink-3)] border border-white/12 rounded px-3 py-[5px] cursor-pointer hover:text-[color:var(--status-rejected)] hover:border-[color:var(--status-rejected)] transition-colors"
            onClick={handleDelete}
          >
            Delete
          </button>

          <button className="[font-family:var(--font-mono)] text-[11px] bg-white/7 text-[color:var(--ink-invert)] border border-white/18 rounded px-3.5 py-[5px] cursor-pointer hover:bg-white/14" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button className="[font-family:var(--font-mono)] text-[11px] bg-white/7 text-[color:var(--ink-invert)] border border-white/18 rounded px-3.5 py-[5px] cursor-pointer hover:bg-white/14" onClick={handleDownload}>
            Download
          </button>
          <button className="[font-family:var(--font-mono)] text-[11px] bg-white/7 text-[color:var(--ink-invert)] border border-white/18 rounded px-3.5 py-[5px] cursor-pointer hover:bg-white/14" onClick={() => setImportOpen(true)}>
            {imported ? 'Imported!' : 'Import'}
          </button>
        </div>
      </div>

      {importOpen && <ImportProfileJsonModal onApply={handleImport} onClose={() => setImportOpen(false)} />}

      {/* Body */}
      <div className="grid grid-cols-[520px_1fr] flex-1 overflow-hidden">

        {/* Form */}
        <div className="py-7 px-7 overflow-y-auto bg-[color:var(--bg)] flex flex-col gap-6 border-r border-[color:var(--rule)]">

          {/* ── Base profile name ── */}
          <SectionHeader title="base profile" />
          <div className={nafSection}>
            <span className={nafLabel}>Name <span className={nafOptional}>(used to pick this profile when creating an application)</span></span>
            <input className={nafInput} value={name} onChange={(e) => setName_(e.target.value)} />
          </div>

          {/* ── Basics ── */}
          <SectionHeader title="basics" />
          <div className="flex flex-col gap-4">
            <div className={nafRow}>
              <div className={nafSection}>
                <span className={nafLabel}>Name</span>
                <input className={nafInput} value={profile.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div className={nafSection}>
                <span className={nafLabel}>Role / title</span>
                <input className={nafInput} value={profile.role} onChange={(e) => set({ role: e.target.value })} />
              </div>
            </div>
            <div className={nafRow}>
              <div className={nafSection}>
                <span className={nafLabel}>Email</span>
                <input className={nafInput} value={profile.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
              <div className={nafSection}>
                <span className={nafLabel}>City</span>
                <input className={nafInput} value={profile.city} onChange={(e) => set({ city: e.target.value })} />
              </div>
            </div>
            <div className={nafRow}>
              <div className={nafSection}>
                <span className={nafLabel}>Website</span>
                <input className={nafInput} value={profile.website} onChange={(e) => set({ website: e.target.value })} />
              </div>
              <div className={nafSection}>
                <span className={nafLabel}>GitHub</span>
                <input className={nafInput} value={profile.github} onChange={(e) => set({ github: e.target.value })} />
              </div>
            </div>
            <div className={nafSection}>
              <span className={nafLabel}>LinkedIn</span>
              <input className={nafInput} value={profile.linkedin} onChange={(e) => set({ linkedin: e.target.value })} />
            </div>
          </div>

          {/* ── Summary ── */}
          <SectionHeader title="summary" />
          <AutoTextarea
            className={nafTextarea}
            value={profile.summary}
            onChange={(e) => set({ summary: e.target.value })}
          />

          {/* ── Experience ── */}
          <SectionHeader title="experience" />
          <div className="flex flex-col gap-3">
            {profile.experience.map((exp, ei) => (
              <EntryCard key={ei} items={profile.experience} index={ei} onChange={(experience) => set({ experience })}>
                <div className={nafRow}>
                  <div className={nafSection}>
                    <span className={nafLabel}>Title</span>
                    <input className={nafInput} value={exp.title} onChange={(e) => setExp(ei, { title: e.target.value })} />
                  </div>
                  <div className={nafSection}>
                    <span className={nafLabel}>Dates</span>
                    <input className={nafInput} value={exp.dates} onChange={(e) => setExp(ei, { dates: e.target.value })} />
                  </div>
                </div>
                <div className={nafRow}>
                  <div className={nafSection}>
                    <span className={nafLabel}>Company</span>
                    <input className={nafInput} value={exp.company} onChange={(e) => setExp(ei, { company: e.target.value })} />
                  </div>
                  <div className={nafSection}>
                    <span className={nafLabel}>Note <span className={nafOptional}>(optional)</span></span>
                    <input className={nafInput} value={exp.companyNote ?? ''} onChange={(e) => setExp(ei, { companyNote: e.target.value || undefined })} />
                  </div>
                </div>
                <div className={nafSection}>
                  <span className={nafLabel}>Bullets</span>
                  {exp.bullets.map((b, bi) => (
                    <div key={bi} className={nafParagraphRow}>
                      <input className={nafInput} value={b} onChange={(e) => setExpBullet(ei, bi, e.target.value)} />
                      {exp.bullets.length > 1 && (
                        <button className={nafRemoveBtn} onClick={() => setExp(ei, { bullets: without(exp.bullets, bi) })}>✕</button>
                      )}
                    </div>
                  ))}
                  <button className={nafAddBtn} onClick={() => setExp(ei, { bullets: [...exp.bullets, ''] })}>+ Add bullet</button>
                </div>
              </EntryCard>
            ))}
            <button className={nafAddBtn} onClick={() => set({ experience: [...profile.experience, { title: '', company: '', dates: '', bullets: [''] }] })}>
              + Add experience
            </button>
          </div>

          {/* ── Projects ── */}
          <SectionHeader title="projects" />
          <div className="flex flex-col gap-3">
            {profile.projects.map((proj, pi) => (
              <EntryCard key={pi} items={profile.projects} index={pi} onChange={(projects) => set({ projects })}>
                <div className={nafRow}>
                  <div className={nafSection}>
                    <span className={nafLabel}>Name</span>
                    <input className={nafInput} value={proj.name} onChange={(e) => setProj(pi, { name: e.target.value })} />
                  </div>
                  <div className={nafSection}>
                    <span className={nafLabel}>ID <span className={nafOptional}>(url slug)</span></span>
                    <input className={nafInput} value={proj.id} onChange={(e) => setProj(pi, { id: e.target.value })} />
                  </div>
                </div>
                <div className={nafSection}>
                  <span className={nafLabel}>Stack</span>
                  <input className={nafInput} value={proj.stack} onChange={(e) => setProj(pi, { stack: e.target.value })} />
                </div>
                <div className={nafSection}>
                  <span className={nafLabel}>Description</span>
                  <AutoTextarea className={nafTextarea} value={proj.description} onChange={(e) => setProj(pi, { description: e.target.value })} />
                </div>
                <div className={nafRow}>
                  <div className={nafSection}>
                    <span className={nafLabel}>Link <span className={nafOptional}>(optional)</span></span>
                    <input className={nafInput} value={proj.link ?? ''} onChange={(e) => setProj(pi, { link: e.target.value || undefined })} />
                  </div>
                  <div className={nafSection}>
                    <span className={nafLabel}>Link label <span className={nafOptional}>(optional)</span></span>
                    <input className={nafInput} value={proj.linkLabel ?? ''} onChange={(e) => setProj(pi, { linkLabel: e.target.value || undefined })} />
                  </div>
                </div>
                <div className={nafSection}>
                  <span className={nafLabel}>Hackathon label <span className={nafOptional}>(optional)</span></span>
                  <input className={nafInput} value={proj.hackathonLabel ?? ''} onChange={(e) => setProj(pi, { hackathonLabel: e.target.value || undefined })} />
                </div>
              </EntryCard>
            ))}
            <button className={nafAddBtn} onClick={() => set({ projects: [...profile.projects, { id: '', name: '', stack: '', description: '' }] })}>
              + Add project
            </button>
          </div>

          {/* ── Education ── */}
          <SectionHeader title="education" />
          <div className="flex flex-col gap-4">
            <div className={nafRow}>
              <div className={nafSection}>
                <span className={nafLabel}>Degree / program</span>
                <input className={nafInput} value={profile.education.degree} onChange={(e) => set({ education: { ...profile.education, degree: e.target.value } })} />
              </div>
              <div className={nafSection}>
                <span className={nafLabel}>Dates</span>
                <input className={nafInput} value={profile.education.dates} onChange={(e) => set({ education: { ...profile.education, dates: e.target.value } })} />
              </div>
            </div>
            <div className={nafRow}>
              <div className={nafSection}>
                <span className={nafLabel}>School</span>
                <input className={nafInput} value={profile.education.school} onChange={(e) => set({ education: { ...profile.education, school: e.target.value } })} />
              </div>
              <div className={nafSection}>
                <span className={nafLabel}>Detail <span className={nafOptional}>(optional)</span></span>
                <input className={nafInput} value={profile.education.schoolDetail ?? ''} onChange={(e) => set({ education: { ...profile.education, schoolDetail: e.target.value || undefined } })} />
              </div>
            </div>
          </div>

          {/* ── Skill groups ── */}
          <SectionHeader title="skill groups" />
          <SkillGroupsEditor skillGroups={profile.skillGroups} onChange={(skillGroups) => set({ skillGroups })} />

          {/* ── Languages ── */}
          <SectionHeader title="languages" />
          <div className="flex flex-col gap-2">
            {profile.languages.map((lang, li) => (
              <div key={li} className={nafParagraphRow}>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <input className={nafInput} value={lang.name} placeholder="Language" onChange={(e) => setLangItem(li, { name: e.target.value })} />
                  <input className={nafInput} value={lang.level} placeholder="Level" onChange={(e) => setLangItem(li, { level: e.target.value })} />
                </div>
                {profile.languages.length > 1 && (
                  <button className={nafRemoveBtn} onClick={() => set({ languages: without(profile.languages, li) })}>✕</button>
                )}
              </div>
            ))}
            <button className={nafAddBtn} onClick={() => set({ languages: [...profile.languages, { name: '', level: '' }] })}>
              + Add language
            </button>
          </div>

          {/* ── Interests ── */}
          <SectionHeader title="interests" />
          <div className="flex flex-col gap-2">
            {profile.interests.map((interest, ii) => (
              <div key={ii} className={nafParagraphRow}>
                <input className={nafInput} value={interest} onChange={(e) => setInterest(ii, e.target.value)} />
                {profile.interests.length > 1 && (
                  <button className={nafRemoveBtn} onClick={() => set({ interests: without(profile.interests, ii) })}>✕</button>
                )}
              </div>
            ))}
            <button className={nafAddBtn} onClick={() => set({ interests: [...profile.interests, ''] })}>
              + Add interest
            </button>
          </div>

          <div className="pb-4" />
        </div>

        {/* Preview */}
        <div className="bg-[#1a2236] overflow-y-auto">
          <div className="py-8 px-5">
            <CVDocument profile={profile} application={{ ...PREVIEW_APP, language: stored.language }} />
          </div>
        </div>
      </div>

      {blocker.state === 'blocked' && (
        <UnsavedChangesDialog
          onCancel={() => blocker.reset()}
          onDiscard={() => blocker.proceed()}
          onSave={() => {
            saveBaseProfile({ id: stored.id, name: name.trim() || stored.name, language: stored.language, profile });
            blocker.proceed();
          }}
        />
      )}
    </div>
  );
}
