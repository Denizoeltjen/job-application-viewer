import { useEffect, useRef, useState } from 'react';
import { exportAllData, downloadBackup, parseBackup, applyBackup } from '../utils/dataBackup';
import { flush } from '../utils/storage';
import type { DataBackup } from '../utils/dataBackup';

interface Props {
  onClose: () => void;
}

export function BackupModal({ onClose }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingBackup, setPendingBackup] = useState<DataBackup | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleExport = () => {
    downloadBackup(exportAllData());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setPendingBackup(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = parseBackup(String(reader.result ?? ''));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingBackup(result.backup);
    };
    reader.onerror = () => setError('Could not read the selected file.');
    reader.readAsText(file);
  };

  const handleRestore = () => {
    if (!pendingBackup) return;
    const appCount = pendingBackup.localApps.length;
    const overrideCount = Object.keys(pendingBackup.configOverrides).length;
    const profileCount = pendingBackup.baseProfiles?.length;
    const profileSummary = profileCount === undefined
      ? 'your current base profiles are kept, since this backup predates them'
      : `${profileCount} base profile${profileCount === 1 ? '' : 's'}`;
    const confirmed = confirm(
      `This replaces ALL applications, statuses, dates, notes, base profiles, and profile customizations currently stored in your account ` +
      `with the backup (${appCount} local application${appCount === 1 ? '' : 's'}, ${overrideCount} saved edit${overrideCount === 1 ? '' : 's'}, ${profileSummary}). ` +
      `This cannot be undone. Continue?`,
    );
    if (!confirmed) return;
    applyBackup(pendingBackup);
    // Reload only once the server has the restored data, or it would come back stale.
    flush().then(() => window.location.reload(), (e) => alert(`Restoring failed: ${e instanceof Error ? e.message : e}`));
  };

  return (
    <div className="fixed inset-0 bg-[rgba(20,28,46,0.65)] flex items-center justify-center z-[100] p-6" onClick={onClose}>
      <div
        className="bg-[#1a2236] rounded-lg w-full max-w-[520px] flex flex-col shadow-[0_20px_60px_rgba(20,28,46,0.40)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center py-3 px-5 border-b border-white/7 gap-4">
          <span className="[font-family:var(--font-mono)] text-[11px] font-semibold text-[color:var(--ink-invert)] tracking-[0.08em] uppercase">
            Backup &amp; restore
          </span>
          <button
            className="text-[14px] bg-transparent border-none text-[#4A5568] cursor-pointer py-1 px-2 rounded leading-none hover:bg-white/7 hover:text-[color:var(--ink-invert)]"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
              Export
            </span>
            <p className="text-[12.5px] text-[color:var(--ink-2)] leading-[1.5] m-0">
              Downloads every application, its status/dates/notes, your base profiles, and any profile customizations stored in your account as one JSON file — for moving data between accounts or as a backup.
            </p>
            <button
              className="self-start [font-family:var(--font-mono)] text-[11px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-4 py-1.5 cursor-pointer transition-[filter] duration-150 hover:brightness-110"
              onClick={handleExport}
            >
              Download backup (.json)
            </button>
          </div>

          <div className="h-px bg-white/7" />

          <div className="flex flex-col gap-2">
            <span className="[font-family:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
              Import
            </span>
            <p className="text-[12.5px] text-[color:var(--ink-2)] leading-[1.5] m-0">
              Restores from a backup file exported above. This replaces everything currently stored in your account.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="self-start [font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-2)] cursor-pointer file:cursor-pointer file:[font-family:var(--font-mono)] file:text-[11px] file:bg-[color:var(--accent)] file:text-[color:var(--ink)] file:font-semibold file:border-none file:rounded file:px-4 file:py-1.5 file:mr-3 file:transition-[filter] file:duration-150 hover:file:brightness-110"
              onChange={handleFileChange}
            />
            {fileName && pendingBackup && !error && (
              <span className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-3)]">
                {pendingBackup.localApps.length} application{pendingBackup.localApps.length === 1 ? '' : 's'}, exported{' '}
                {new Date(pendingBackup.exportedAt).toLocaleString()}
              </span>
            )}
            {error && (
              <span className="[font-family:var(--font-mono)] text-[11px] text-[color:var(--status-rejected)]">{error}</span>
            )}
            <button
              className="self-start [font-family:var(--font-mono)] text-[11px] bg-transparent text-[color:var(--accent)] border border-[color:var(--accent)] rounded px-4 py-1.5 cursor-pointer transition-colors duration-150 hover:bg-[color:var(--accent)] hover:text-[color:var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[color:var(--accent)]"
              disabled={!pendingBackup}
              onClick={handleRestore}
            >
              Restore from backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
