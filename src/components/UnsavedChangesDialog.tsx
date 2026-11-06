interface Props {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({ onSave, onDiscard, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 bg-[rgba(20,28,46,0.65)] flex items-center justify-center z-[100] p-6"
      onClick={onCancel}
    >
      <div
        className="bg-[#1a2236] rounded-lg w-full max-w-[420px] p-6 flex flex-col gap-4 shadow-[0_20px_60px_rgba(20,28,46,0.40)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="[font-family:var(--font-mono)] text-[12px] font-semibold tracking-[0.04em] uppercase text-[color:var(--ink-invert)]">
          Unsaved changes
        </div>
        <p className="text-[13px] text-[color:var(--ink-2)] leading-[1.55] m-0">
          You have unsaved edits. Save them before leaving, or discard them?
        </p>
        <div className="flex justify-end gap-2 mt-1">
          <button
            className="[font-family:var(--font-mono)] text-[11px] bg-transparent text-[color:var(--ink-3)] border border-white/12 rounded px-3.5 py-[6px] cursor-pointer hover:text-[color:var(--ink-invert)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="[font-family:var(--font-mono)] text-[11px] bg-transparent text-[color:var(--status-rejected)] border border-[color:var(--status-rejected)] rounded px-3.5 py-[6px] cursor-pointer hover:bg-[color:var(--status-rejected)] hover:text-[color:var(--ink)]"
            onClick={onDiscard}
          >
            Leave without saving
          </button>
          <button
            className="[font-family:var(--font-mono)] text-[11px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-4 py-[6px] cursor-pointer hover:brightness-110"
            onClick={onSave}
          >
            Save & leave
          </button>
        </div>
      </div>
    </div>
  );
}
