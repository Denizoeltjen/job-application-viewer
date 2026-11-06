import { useState } from 'react';
import { storage } from '../utils/storage';
import { logoutAndReload } from '../utils/api';
import { Link } from 'react-router-dom';
import { applications as staticApps } from '../data/applications';
import { getLocalApplications, deleteLocalApplication } from '../utils/localApplications';
import { getConfigOverride, setConfigOverride } from '../utils/appStorage';
import { autoAppliedDateFor, autoInterviewDateFor, autoFinalDecisionDateFor } from '../utils/autoStatusDates';
import { STATUS_LABELS } from '../utils/status';
import { ApplicationCard } from '../components/dashboard/ApplicationCard';
import type { DateFieldName } from '../components/dashboard/ApplicationCard';
import { ImportApplicationModal } from '../components/ImportApplicationModal';
import { BackupModal } from '../components/BackupModal';
import type { ApplicationConfig, ApplicationStatus } from '../types';

function readStatus(id: string, fallback: ApplicationStatus): ApplicationStatus {
  return (storage.getItem(`status-${id}`) as ApplicationStatus | null) ?? fallback;
}

function writeStatus(id: string, status: ApplicationStatus) {
  storage.setItem(`status-${id}`, status);
}

type SortField = 'company' | 'role' | 'status' | 'appliedDate' | 'interviewDate' | 'finalDecisionDate';

export function DashboardPage() {
  const [localApps, setLocalApps] = useState(() => getLocalApplications());
  const allApps = [...staticApps, ...localApps];

  const [statuses, setStatuses] = useState<Record<string, ApplicationStatus>>(() =>
    Object.fromEntries(allApps.map((a) => [a.id, readStatus(a.id, a.status)])),
  );

  const [appliedDates, setAppliedDates] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(allApps.map((a) => [a.id, getConfigOverride(a.id)?.appliedDate ?? a.appliedDate])),
  );

  const [interviewDates, setInterviewDates] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(allApps.map((a) => [a.id, getConfigOverride(a.id)?.interviewDate ?? a.interviewDate])),
  );

  const [finalDecisionDates, setFinalDecisionDates] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(allApps.map((a) => [a.id, getConfigOverride(a.id)?.finalDecisionDate ?? a.finalDecisionDate])),
  );

  const [notes, setNotes] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(allApps.map((a) => [a.id, getConfigOverride(a.id)?.notes ?? a.notes])),
  );

  const [importOpen, setImportOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const applyAutoDates = (app: ApplicationConfig, prevStatus: ApplicationStatus, nextStatus: ApplicationStatus) => {
    const autoApplied = autoAppliedDateFor(prevStatus, nextStatus, appliedDates[app.id] ?? app.appliedDate, app.language);
    const autoInterview = autoInterviewDateFor(prevStatus, nextStatus, interviewDates[app.id] ?? app.interviewDate, app.language);
    const autoFinalDecision = autoFinalDecisionDateFor(prevStatus, nextStatus, finalDecisionDates[app.id] ?? app.finalDecisionDate, app.language);
    if (!autoApplied && !autoInterview && !autoFinalDecision) return;

    const { status: _s, ...rest } = app;
    const base = getConfigOverride(app.id) ?? rest;
    setConfigOverride(app.id, {
      ...base,
      ...(autoApplied && { appliedDate: autoApplied }),
      ...(autoInterview && { interviewDate: autoInterview }),
      ...(autoFinalDecision && { finalDecisionDate: autoFinalDecision }),
    });
    if (autoApplied) setAppliedDates((prev) => ({ ...prev, [app.id]: autoApplied }));
    if (autoInterview) setInterviewDates((prev) => ({ ...prev, [app.id]: autoInterview }));
    if (autoFinalDecision) setFinalDecisionDates((prev) => ({ ...prev, [app.id]: autoFinalDecision }));
  };

  const handleStatusChange = (id: string, status: ApplicationStatus) => {
    const app = allApps.find((a) => a.id === id);
    if (app) applyAutoDates(app, statuses[id] ?? app.status, status);
    writeStatus(id, status);
    setStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const handleFieldChange = (id: string, field: DateFieldName | 'notes', value: string) => {
    const app = allApps.find((a) => a.id === id);
    if (!app) return;
    const { status: _s, ...rest } = app;
    const base = getConfigOverride(id) ?? rest;
    const trimmed = value.trim() || undefined;

    switch (field) {
      case 'appliedDate':
        setConfigOverride(id, { ...base, appliedDate: trimmed });
        setAppliedDates((prev) => ({ ...prev, [id]: trimmed }));
        break;
      case 'interviewDate':
        setConfigOverride(id, { ...base, interviewDate: trimmed });
        setInterviewDates((prev) => ({ ...prev, [id]: trimmed }));
        break;
      case 'finalDecisionDate':
        setConfigOverride(id, { ...base, finalDecisionDate: trimmed });
        setFinalDecisionDates((prev) => ({ ...prev, [id]: trimmed }));
        break;
      case 'notes':
        setConfigOverride(id, { ...base, notes: trimmed });
        setNotes((prev) => ({ ...prev, [id]: trimmed }));
        break;
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this application?')) return;
    deleteLocalApplication(id);
    setLocalApps(getLocalApplications());
  };

  const hasActiveFilter = !!(search || statusFilter);
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIndicator = (field: SortField) => (sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const visibleApps = allApps
    .filter((app) => {
      const q = search.trim().toLowerCase();
      if (q && !app.company.toLowerCase().includes(q) && !app.role.toLowerCase().includes(q)) return false;
      if (statusFilter && (statuses[app.id] ?? app.status) !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const value = (app: typeof a) => {
        if (sortField === 'status') return statuses[app.id] ?? app.status;
        if (sortField === 'appliedDate') return appliedDates[app.id] ?? app.appliedDate ?? '';
        if (sortField === 'interviewDate') return interviewDates[app.id] ?? app.interviewDate ?? '';
        if (sortField === 'finalDecisionDate') return finalDecisionDates[app.id] ?? app.finalDecisionDate ?? '';
        return app[sortField] ?? '';
      };
      const cmp = value(a).localeCompare(value(b));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <div className="min-h-screen bg-[color:var(--bg)] pt-12 px-8 pb-32 max-w-[1220px] mx-auto">
      <header className="mb-8 flex items-baseline justify-between gap-6">
        <div className="[font-family:var(--font-mono)] text-[15px]">
          <span className="text-[color:var(--ink-3)]">~/</span>
          <span className="text-[color:var(--accent)]">applications</span>
          <span className="text-[color:var(--ink-3)] animate-pulse"> _</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-3)] no-underline border border-[color:var(--rule)] px-3 py-1.5 hover:text-[color:var(--ink-2)] hover:border-[color:var(--ink-2)] transition-colors duration-150"
            to="/profiles"
          >
            base profiles
          </Link>
          <button
            className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-3)] bg-transparent border border-[color:var(--rule)] px-3 py-1.5 cursor-pointer hover:text-[color:var(--ink-2)] hover:border-[color:var(--ink-2)] transition-colors duration-150"
            onClick={() => setImportOpen(true)}
          >
            import
          </button>
          <button
            className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-3)] bg-transparent border border-[color:var(--rule)] px-3 py-1.5 cursor-pointer hover:text-[color:var(--ink-2)] hover:border-[color:var(--ink-2)] transition-colors duration-150"
            onClick={() => setBackupOpen(true)}
          >
            backup
          </button>
          <Link
            className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-3)] no-underline border border-[color:var(--rule)] px-3 py-1.5 hover:text-[color:var(--accent)] hover:border-[color:var(--accent)] transition-colors duration-150"
            to="/application/new"
          >
            + new
          </Link>
          <button
            className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-3)] bg-transparent border border-[color:var(--rule)] px-3 py-1.5 cursor-pointer hover:text-[color:var(--ink-2)] hover:border-[color:var(--ink-2)] transition-colors duration-150"
            onClick={() => void logoutAndReload()}
          >
            log out
          </button>
        </div>
      </header>

      {/* Search + filters */}
      <div className="flex items-center gap-2 mb-4">
        <input
          className="[font-family:var(--font-mono)] text-[12px] bg-transparent border border-[color:var(--rule)] text-[color:var(--ink-invert)] px-3 py-1.5 flex-1 outline-none focus:border-[color:var(--accent)] placeholder:text-[color:var(--ink-3)]"
          placeholder="search company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="[font-family:var(--font-mono)] text-[11px] bg-transparent border border-[color:var(--rule)] text-[color:var(--ink-2)] px-2 py-1.5 cursor-pointer"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
        >
          <option value="">all statuses</option>
          {(Object.entries(STATUS_LABELS) as [ApplicationStatus, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {hasActiveFilter && (
          <button
            className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-3)] bg-transparent border-none cursor-pointer hover:text-[color:var(--status-rejected)] transition-colors"
            onClick={clearFilters}
          >
            clear
          </button>
        )}
      </div>

      {/* Scrolls sideways instead of crushing columns on narrow windows */}
      <div className="overflow-x-auto">
      <div className="min-w-[960px]">

      {/* Column headers */}
      <div className="flex items-center border-b border-[color:var(--rule)] pb-1.5">
        <button
          className="[font-family:var(--font-mono)] text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--ink-3)] hover:text-[color:var(--ink-2)] bg-transparent border-none cursor-pointer text-left p-0 w-[190px] shrink-0"
          onClick={() => toggleSort('company')}
        >
          company{sortIndicator('company')}
        </button>
        <button
          className="[font-family:var(--font-mono)] text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--ink-3)] hover:text-[color:var(--ink-2)] bg-transparent border-none cursor-pointer text-left p-0 flex-1 min-w-[120px]"
          onClick={() => toggleSort('role')}
        >
          role{sortIndicator('role')}
        </button>
        <span className="w-[28px] shrink-0" />
        <button
          className="[font-family:var(--font-mono)] text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--ink-3)] hover:text-[color:var(--ink-2)] bg-transparent border-none cursor-pointer text-right p-0 w-[116px] shrink-0 pr-1"
          onClick={() => toggleSort('status')}
        >
          status{sortIndicator('status')}
        </button>
        <button
          className="[font-family:var(--font-mono)] text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--ink-3)] hover:text-[color:var(--ink-2)] bg-transparent border-none cursor-pointer text-right p-0 w-[88px] shrink-0 ml-2"
          onClick={() => toggleSort('appliedDate')}
        >
          applied{sortIndicator('appliedDate')}
        </button>
        <button
          className="[font-family:var(--font-mono)] text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--ink-3)] hover:text-[color:var(--ink-2)] bg-transparent border-none cursor-pointer text-right p-0 w-[88px] shrink-0 ml-2"
          onClick={() => toggleSort('interviewDate')}
        >
          interview{sortIndicator('interviewDate')}
        </button>
        <button
          className="[font-family:var(--font-mono)] text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--ink-3)] hover:text-[color:var(--ink-2)] bg-transparent border-none cursor-pointer text-right p-0 w-[88px] shrink-0 ml-2"
          onClick={() => toggleSort('finalDecisionDate')}
        >
          decision{sortIndicator('finalDecisionDate')}
        </button>
        <span className="[font-family:var(--font-mono)] text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--ink-3)] w-[170px] shrink-0 pl-3">
          notes
        </span>
        <span className="w-[36px] shrink-0" />
      </div>

      {allApps.length === 0 ? (
        <p className="[font-family:var(--font-mono)] text-[12px] text-[color:var(--ink-3)] py-10">
          no applications found.
        </p>
      ) : visibleApps.length === 0 ? (
        <p className="[font-family:var(--font-mono)] text-[12px] text-[color:var(--ink-3)] py-10">
          no applications match your search/filters.
        </p>
      ) : (
        <div>
          {visibleApps.map((app) => {
            const isLocal = !staticApps.some((s) => s.id === app.id);
            return (
              <ApplicationCard
                key={app.id}
                application={app}
                status={statuses[app.id] ?? app.status}
                appliedDate={appliedDates[app.id] ?? app.appliedDate}
                interviewDate={interviewDates[app.id] ?? app.interviewDate}
                finalDecisionDate={finalDecisionDates[app.id] ?? app.finalDecisionDate}
                notes={notes[app.id]}
                onStatusChange={(s) => handleStatusChange(app.id, s)}
                onFieldChange={(field, value) => handleFieldChange(app.id, field, value)}
                onDelete={isLocal ? () => handleDelete(app.id) : undefined}
              />
            );
          })}
        </div>
      )}
      </div>
      </div>

      {importOpen && <ImportApplicationModal onClose={() => setImportOpen(false)} />}
      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}
    </div>
  );
}
