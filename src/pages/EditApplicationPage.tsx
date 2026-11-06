import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate, useBlocker } from 'react-router-dom';
import { applications } from '../data/applications';
import { getLocalApplications } from '../utils/localApplications';
import type { ApplicationConfig, AppFont, AppLanguage, CoverLetter, SkillGroup } from '../types';
import { ALL_FONTS, FONT_LABELS } from '../utils/fonts';
import { getProfile } from '../data/profiles';
import { getBaseProfiles } from '../utils/baseProfiles';
import { useApplication } from '../hooks/useApplication';
import { CVDocument } from '../components/cv/CVDocument';
import { CoverLetterDocument } from '../components/cover-letter/CoverLetterDocument';
import { AutoTextarea } from '../components/AutoTextarea';
import { ImportParagraphsControl } from '../components/ImportParagraphsControl';
import { ExportParagraphsButton } from '../components/ExportParagraphsButton';
import { SkillGroupsEditor } from '../components/SkillGroupsEditor';
import { ExportSkillGroupsButton } from '../components/ExportSkillGroupsButton';
import { ImportSkillGroupsModal } from '../components/ImportSkillGroupsModal';
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog';
import { JsonConfigPanel } from '../components/JsonConfigPanel';
import { FeaturedProjectsPicker } from '../components/FeaturedProjectsPicker';
import { MoveButtons } from '../components/MoveButtons';
import { move } from '../utils/move';
import { formatDateLong, formatDateNumeric, parseToIsoDate } from '../utils/date';
import { DEFAULT_CLOSINGS } from '../utils/coverLetterClosing';
import {
  nafSection, nafRow, nafLabel, nafOptional, nafInput, nafTextarea,
  nafCheckboxLabel, nafCheckboxInput, nafParagraphRow, nafRemoveBtn, nafAddBtn,
  newAppPage, newAppBack, newAppTitle, newAppBody, newAppForm,
  newAppPreview, napHeader, napFilename, napHint,
  editAppHeader, editAppCompany, editAppHeaderActions, editResetBtn, editSaveBtn,
} from '../styles/formStyles';

const LANG_FLAGS: Record<AppLanguage, string> = { en: '🇬🇧', de: '🇩🇪' };
const LANGUAGE_DEFAULT_PREFIX = 'language-default:';

function toId(company: string) {
  return company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'new-app';
}

// Inner component — staticApp is guaranteed to exist. onReload remounts it
// so the form picks up a config saved outside the form (the JSON editor).
function EditContent({ staticApp, onReload }: { staticApp: ApplicationConfig; onReload: () => void }) {
  const { app, save, reset, isDirty } = useApplication(staticApp);
  const navigate = useNavigate();
  // The right-hand panel toggles between the live preview and the raw JSON
  // config. jsonBaseline is the JSON as generated when switching over, so
  // switching back can tell whether there are unapplied edits.
  const [rightView, setRightView] = useState<'preview' | 'json'>('preview');
  const [jsonText, setJsonText] = useState('');
  const [jsonBaseline, setJsonBaseline] = useState('');

  const [company, setCompany] = useState(app.company);
  const [role, setRole] = useState(app.role);
  const [url, setUrl] = useState(app.url ?? '');
  const [appliedDateISO, setAppliedDateISO] = useState(() => parseToIsoDate(app.appliedDate ?? ''));
  const [interviewDateISO, setInterviewDateISO] = useState(() => parseToIsoDate(app.interviewDate ?? ''));
  const [finalDecisionDateISO, setFinalDecisionDateISO] = useState(() => parseToIsoDate(app.finalDecisionDate ?? ''));
  const [language, setLanguage] = useState<AppLanguage>(app.language ?? 'en');
  const [font, setFont] = useState<AppFont>(app.font ?? 'sans');
  const [baseProfiles] = useState(() => getBaseProfiles());
  const [baseProfileId, setBaseProfileId] = useState<string | ''>(app.baseProfileId ?? '');

  const selectedBaseProfile = baseProfileId ? baseProfiles.find((p) => p.id === baseProfileId) : undefined;
  const profile = selectedBaseProfile?.profile ?? getProfile(language);

  // The language always comes from the profile: a base profile carries its
  // own, and the fallback options pick one of the per-language defaults.
  const handleBaseProfileChange = (value: string) => {
    if (value.startsWith(LANGUAGE_DEFAULT_PREFIX)) {
      setBaseProfileId('');
      setLanguage(value.slice(LANGUAGE_DEFAULT_PREFIX.length) as AppLanguage);
      return;
    }
    setBaseProfileId(value);
    const bp = baseProfiles.find((p) => p.id === value);
    if (bp) setLanguage(bp.language);
  };

  const [hasSummaryOverride, setHasSummaryOverride] = useState(!!app.summaryOverride);
  const [summaryOverride, setSummaryOverride] = useState(app.summaryOverride ?? profile.summary);
  const [featuredIds, setFeaturedIds] = useState<string[]>(
    app.featuredProjectIds ?? profile.projects.map((p) => p.id),
  );
  const [hasSkillGroupsOverride, setHasSkillGroupsOverride] = useState(!!app.skillGroupsOverride);
  const [skillGroupsOverride, setSkillGroupsOverride] = useState<SkillGroup[]>(
    app.skillGroupsOverride ?? profile.skillGroups,
  );
  const [importSkillGroupsOpen, setImportSkillGroupsOpen] = useState(false);
  const [hasCoverLetter, setHasCoverLetter] = useState(!!app.coverLetter);
  const [dateISO, setDateISO] = useState(() => parseToIsoDate(app.coverLetter?.date ?? ''));
  const [recipientOrg, setRecipientOrg] = useState(app.coverLetter?.recipientOrg ?? '');
  const [recipientName, setRecipientName] = useState(app.coverLetter?.recipientName ?? '');
  const [subjectRole, setSubjectRole] = useState(app.coverLetter?.subjectRole ?? '');
  const [paragraphs, setParagraphs] = useState<string[]>([...(app.coverLetter?.paragraphs ?? [''])]);
  const [closing, setClosing] = useState(app.coverLetter?.closing ?? '');

  const updateParagraph = (i: number, value: string) =>
    setParagraphs((prev) => prev.map((p, idx) => (idx === i ? value : p)));

  const addParagraph = () => setParagraphs((prev) => [...prev, '']);
  const removeParagraph = (i: number) =>
    setParagraphs((prev) => prev.filter((_, idx) => idx !== i));

  const buildConfig = (): Omit<ApplicationConfig, 'status'> => ({
    id: staticApp.id,
    company,
    role,
    language,
    font,
    ...(baseProfileId && { baseProfileId }),
    ...(url && { url }),
    ...(appliedDateISO && { appliedDate: formatDateNumeric(appliedDateISO, language) }),
    ...(interviewDateISO && { interviewDate: formatDateNumeric(interviewDateISO, language) }),
    ...(finalDecisionDateISO && { finalDecisionDate: formatDateNumeric(finalDecisionDateISO, language) }),
    ...(app.notes && { notes: app.notes }),
    ...(hasSummaryOverride && { summaryOverride }),
    featuredProjectIds: featuredIds,
    ...(hasSkillGroupsOverride && { skillGroupsOverride }),
    ...(hasCoverLetter && {
      coverLetter: {
        recipientOrg,
        ...(recipientName && { recipientName }),
        date: formatDateLong(dateISO, language),
        subjectRole: subjectRole || role,
        paragraphs: paragraphs.filter(Boolean),
        ...(closing.trim() && { closing: closing.trim() }),
      },
    }),
  });

  // Snapshot of the form's initial values — never updated, since saving or
  // resetting always immediately navigates away rather than staying on the page.
  const [initialSnapshot] = useState(() => JSON.stringify(buildConfig()));
  const isFormDirty = JSON.stringify(buildConfig()) !== initialSnapshot;

  // Save/Reset trigger their own deliberate navigation right after already
  // persisting or discarding the changes — never block those. skipBlockRef is
  // mutated synchronously right before calling navigate() in the same event
  // handler, before React re-renders, so this must read it live via a
  // function (a plain boolean would bake in a stale snapshot from the last
  // render and still block that same-tick navigation).
  const skipBlockRef = useRef(false);
  const blocker = useBlocker(() => isFormDirty && !skipBlockRef.current);

  useEffect(() => {
    if (!isFormDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isFormDirty]);

  const handleSave = () => {
    save(buildConfig());
    skipBlockRef.current = true;
    navigate(`/application/${staticApp.id}`);
  };

  const handleReset = () => {
    if (!confirm('Reset all edits and restore the original config?')) return;
    reset();
    skipBlockRef.current = true;
    navigate(`/application/${staticApp.id}`);
  };

  const previewApp: ApplicationConfig = { ...buildConfig(), status: app.status };

  const switchRightView = (view: 'preview' | 'json') => {
    if (view === rightView) return;
    if (view === 'json') {
      const text = JSON.stringify(buildConfig(), null, 2);
      setJsonText(text);
      setJsonBaseline(text);
    } else if (jsonText !== jsonBaseline && !confirm('Discard your unapplied JSON edits?')) {
      return;
    }
    setRightView(view);
  };

  // Persists the JSON config, then remounts the form so it shows what was saved.
  const handleApplyJson = (config: ApplicationConfig) => {
    const { status: _status, ...rest } = config;
    save({ ...rest, id: staticApp.id });
    onReload();
  };

  return (
    <div className={newAppPage}>
      <div className={editAppHeader}>
        <Link className={newAppBack} to={`/application/${staticApp.id}`}>
          ← {staticApp.company}
        </Link>
        <span className={newAppTitle}>
          Editing &nbsp;<span className={editAppCompany}>{staticApp.company}</span>
        </span>
        <div className={editAppHeaderActions}>
          {isDirty && (
            <button className={editResetBtn} onClick={handleReset}>
              Reset to default
            </button>
          )}
          <button className={editSaveBtn} onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>

      <div className={newAppBody}>
        {/* ── Form ── */}
        <div className={newAppForm}>
          <div className={nafSection}>
            <span className={nafLabel}>Base profile</span>
            <select
              className={nafInput}
              value={baseProfileId || `${LANGUAGE_DEFAULT_PREFIX}${language}`}
              onChange={(e) => handleBaseProfileChange(e.target.value)}
            >
              {baseProfiles.length > 0 && (
                <optgroup label="Base profiles">
                  {baseProfiles.map((bp) => (
                    <option key={bp.id} value={bp.id}>{LANG_FLAGS[bp.language]} {bp.name}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Language defaults">
                <option value={`${LANGUAGE_DEFAULT_PREFIX}en`}>{LANG_FLAGS.en} English default</option>
                <option value={`${LANGUAGE_DEFAULT_PREFIX}de`}>{LANG_FLAGS.de} Deutsch default</option>
              </optgroup>
            </select>
            <span className={nafOptional}>The application's language follows the selected profile.</span>
          </div>

          <div className={nafSection}>
            <span className={nafLabel}>Company</span>
            <input className={nafInput} value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>

          <div className={nafSection}>
            <span className={nafLabel}>Role</span>
            <input className={nafInput} value={role} onChange={(e) => setRole(e.target.value)} />
          </div>

          <div className={nafSection}>
            <span className={nafLabel}>
              Job posting URL <span className={nafOptional}>(optional)</span>
            </span>
            <input
              className={nafInput}
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className={nafRow}>
            <div className={nafSection}>
              <span className={nafLabel}>Font</span>
              <select
                className={nafInput}
                value={font}
                onChange={(e) => setFont(e.target.value as AppFont)}
              >
                {ALL_FONTS.map((f) => (
                  <option key={f} value={f}>{FONT_LABELS[f]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={nafSection}>
            <span className={nafLabel}>
              Applied date <span className={nafOptional}>(optional)</span>
            </span>
            <input
              type="date"
              className={nafInput}
              value={appliedDateISO}
              onChange={(e) => setAppliedDateISO(e.target.value)}
            />
          </div>

          <div className={nafRow}>
            <div className={nafSection}>
              <span className={nafLabel}>
                Interview date <span className={nafOptional}>(optional)</span>
              </span>
              <input
                type="date"
                className={nafInput}
                value={interviewDateISO}
                onChange={(e) => setInterviewDateISO(e.target.value)}
              />
            </div>
            <div className={nafSection}>
              <span className={nafLabel}>
                Final decision date <span className={nafOptional}>(optional)</span>
              </span>
              <input
                type="date"
                className={nafInput}
                value={finalDecisionDateISO}
                onChange={(e) => setFinalDecisionDateISO(e.target.value)}
              />
            </div>
          </div>

          <div className={nafSection}>
            <label className={nafCheckboxLabel}>
              <input
                className={nafCheckboxInput}
                type="checkbox"
                checked={hasSummaryOverride}
                onChange={(e) => setHasSummaryOverride(e.target.checked)}
              />
              Override profile summary for this application
            </label>
          </div>

          {hasSummaryOverride && (
            <div className={nafSection}>
              <span className={nafLabel}>
                Profile summary override <span className={nafOptional}>(replaces the profile's summary on this application only)</span>
              </span>
              <AutoTextarea
                className={nafTextarea}
                value={summaryOverride}
                onChange={(e) => setSummaryOverride(e.target.value)}
              />
            </div>
          )}

          <div className={nafSection}>
            <span className={nafLabel}>Featured projects</span>
            <FeaturedProjectsPicker projects={profile.projects} featuredIds={featuredIds} onChange={setFeaturedIds} />
          </div>

          <div className={nafSection}>
            <label className={nafCheckboxLabel}>
              <input
                className={nafCheckboxInput}
                type="checkbox"
                checked={hasSkillGroupsOverride}
                onChange={(e) => setHasSkillGroupsOverride(e.target.checked)}
              />
              Override skill groups for this application
            </label>
          </div>

          {hasSkillGroupsOverride && (
            <div className={nafSection}>
              <span className={nafLabel}>
                Skill groups override <span className={nafOptional}>(replaces the profile's skill groups on this application only)</span>
              </span>
              <div className="flex gap-2">
                <button className={nafAddBtn} onClick={() => setImportSkillGroupsOpen(true)}>Import from JSON</button>
                <ExportSkillGroupsButton skillGroups={skillGroupsOverride} />
              </div>
              <SkillGroupsEditor skillGroups={skillGroupsOverride} onChange={setSkillGroupsOverride} />
            </div>
          )}

          <div className={nafSection}>
            <label className={nafCheckboxLabel}>
              <input
                className={nafCheckboxInput}
                type="checkbox"
                checked={hasCoverLetter}
                onChange={(e) => setHasCoverLetter(e.target.checked)}
              />
              Include cover letter
            </label>
          </div>

          {hasCoverLetter && (
            <>
              <div className={nafRow}>
                <div className={nafSection}>
                  <span className={nafLabel}>Cover letter date</span>
                  <input
                    type="date"
                    className={nafInput}
                    value={dateISO}
                    onChange={(e) => setDateISO(e.target.value)}
                  />
                </div>
                <div className={nafSection}>
                  <span className={nafLabel}>Subject role</span>
                  <input
                    className={nafInput}
                    placeholder="defaults to Role"
                    value={subjectRole}
                    onChange={(e) => setSubjectRole(e.target.value)}
                  />
                </div>
              </div>

              <div className={nafRow}>
                <div className={nafSection}>
                  <span className={nafLabel}>Recipient org</span>
                  <input
                    className={nafInput}
                    value={recipientOrg}
                    onChange={(e) => setRecipientOrg(e.target.value)}
                  />
                </div>
                <div className={nafSection}>
                  <span className={nafLabel}>
                    Recipient name <span className={nafOptional}>(optional)</span>
                  </span>
                  <input
                    className={nafInput}
                    placeholder="defaults to Hiring Team"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
              </div>

              <div className={nafSection}>
                <span className={nafLabel}>Cover letter paragraphs</span>
                <ImportParagraphsControl onImport={setParagraphs} />
                <ExportParagraphsButton paragraphs={paragraphs} />
                {paragraphs.map((p, i) => (
                  <div className={nafParagraphRow} key={i}>
                    <AutoTextarea
                      className={nafTextarea}
                      placeholder={`Paragraph ${i + 1}`}
                      value={p}
                      onChange={(e) => updateParagraph(i, e.target.value)}
                    />
                    {paragraphs.length > 1 && (
                      <>
                        <MoveButtons index={i} length={paragraphs.length} onMove={(to) => setParagraphs(move(paragraphs, i, to))} />
                        <button className={nafRemoveBtn} onClick={() => removeParagraph(i)}>
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                ))}
                <button className={nafAddBtn} onClick={addParagraph}>
                  + Add paragraph
                </button>
              </div>

              <div className={nafSection}>
                <span className={nafLabel}>
                  Closing <span className={nafOptional}>(optional, shown above your signature)</span>
                </span>
                <input
                  className={nafInput}
                  placeholder={`defaults to ${DEFAULT_CLOSINGS[language]}`}
                  value={closing}
                  onChange={(e) => setClosing(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Live preview ── */}
        <div className={newAppPreview}>
          <div className={napHeader}>
            <span className={napFilename}>
              private/applications/{toId(company)}.json
            </span>
            <div className="flex items-center gap-1 bg-white/5 rounded p-0.5" role="tablist" aria-label="Right panel view">
              {(['preview', 'json'] as const).map((view) => (
                <button
                  key={view}
                  role="tab"
                  aria-selected={rightView === view}
                  className={`[font-family:var(--font-mono)] text-[10.5px] tracking-[0.06em] rounded px-3 py-1 border-none cursor-pointer transition-colors ${
                    rightView === view
                      ? 'bg-[color:var(--accent)] text-[color:var(--ink)]'
                      : 'bg-transparent text-[#8896AB] hover:text-[color:var(--ink-invert)]'
                  }`}
                  onClick={() => switchRightView(view)}
                >
                  {view === 'preview' ? 'live preview' : 'JSON'}
                </button>
              ))}
            </div>
          </div>
          {rightView === 'json' ? (
            <JsonConfigPanel text={jsonText} onTextChange={setJsonText} onApply={handleApplyJson} />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="py-8 px-5">
                <CVDocument profile={profile} application={previewApp} />
                {previewApp.coverLetter && (
                  <CoverLetterDocument
                    profile={profile}
                    application={{ ...previewApp, coverLetter: previewApp.coverLetter as CoverLetter }}
                    paginate
                  />
                )}
              </div>
            </div>
          )}
          <p className={napHint}>
            {rightView === 'json'
              ? <>Starts from the form, unsaved edits included. <code>Apply JSON</code> saves it and reloads the form.</>
              : <>Changes are saved to your account as you edit. Switch to <code>JSON</code> to edit or copy the config for <code>private/applications/{toId(company)}.json</code>.</>}
          </p>
        </div>
      </div>

      {blocker.state === 'blocked' && (
        <UnsavedChangesDialog
          onCancel={() => blocker.reset()}
          onDiscard={() => blocker.proceed()}
          onSave={() => {
            save(buildConfig());
            blocker.proceed();
          }}
        />
      )}

      {importSkillGroupsOpen && (
        <ImportSkillGroupsModal
          application={previewApp}
          profile={profile}
          onApply={setSkillGroupsOverride}
          onClose={() => setImportSkillGroupsOpen(false)}
        />
      )}
    </div>
  );
}

export function EditApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const staticApp = id ? [...applications, ...getLocalApplications()].find((a) => a.id === id) : undefined;
  const [formVersion, setFormVersion] = useState(0);

  if (!staticApp) {
    return (
      <div className="py-20 px-10 [font-family:var(--font-mono)] text-[color:var(--ink-2)] flex flex-col gap-4">
        <p>Application not found.</p>
        <Link className="text-[color:var(--accent)]" to="/">← Back to dashboard</Link>
      </div>
    );
  }

  return <EditContent key={formVersion} staticApp={staticApp} onReload={() => setFormVersion((v) => v + 1)} />;
}
