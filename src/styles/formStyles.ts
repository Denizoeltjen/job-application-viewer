// Shared Tailwind utility classes for the new/edit application form panel,
// used by both NewApplicationPage and EditApplicationPage.
export const nafSection = 'flex flex-col gap-1.5';
export const nafRow = 'grid grid-cols-2 gap-4';
export const nafLabel = '[font-family:var(--font-mono)] text-[9.5px] tracking-[0.14em] uppercase text-[color:var(--accent)]';
export const nafOptional = 'text-[color:var(--ink-3)] normal-case tracking-normal text-[9px]';
export const nafInput = '[font-family:var(--font-sans)] text-[13px] bg-[color:var(--surface)] border-[1.5px] border-[color:var(--rule)] rounded-[5px] py-2 px-[11px] text-[color:var(--ink-invert)] [color-scheme:dark] transition-[border-color] duration-150 w-full focus:outline-none focus:border-[color:var(--accent)]';
export const nafTextarea = '[font-family:var(--font-sans)] text-[12.5px] bg-[color:var(--surface)] border-[1.5px] border-[color:var(--rule)] rounded-[5px] py-2 px-[11px] text-[color:var(--ink-invert)] w-full leading-[1.55] transition-[border-color] duration-150 focus:outline-none focus:border-[color:var(--accent)]';
export const nafCheckboxes = 'flex flex-col gap-1.5';
export const nafCheckboxLabel = 'flex items-center gap-2 text-[12.5px] text-[color:var(--ink-2)] cursor-pointer';
export const nafCheckboxInput = 'accent-[var(--accent)] w-3.5 h-3.5 cursor-pointer';
export const nafParagraphRow = 'flex gap-2 items-start mb-2';
export const nafRemoveBtn = 'text-[12px] bg-transparent border border-[color:var(--rule)] text-[color:var(--ink-3)] rounded px-2 py-[5px] cursor-pointer mt-0.5 shrink-0 hover:border-[color:var(--status-rejected)] hover:text-[color:var(--status-rejected)]';
export const nafMoveBtn = 'text-[12px] bg-transparent border border-[color:var(--rule)] text-[color:var(--ink-3)] rounded px-2 py-[5px] cursor-pointer mt-0.5 shrink-0 leading-none hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-30 disabled:cursor-default disabled:hover:border-[color:var(--rule)] disabled:hover:text-[color:var(--ink-3)]';
export const nafAddBtn = '[font-family:var(--font-mono)] text-[11px] bg-transparent border border-dashed border-[color:var(--rule)] text-[color:var(--ink-3)] rounded-[5px] py-[7px] px-3.5 cursor-pointer text-left transition-[border-color,color] duration-150 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]';

export const newAppPage = 'h-screen bg-[color:var(--bg)] flex flex-col';
export const newAppHeader = 'bg-[color:var(--ink)] flex items-center gap-5 px-6 h-[52px] shrink-0';
export const newAppBack = '[font-family:var(--font-mono)] text-[11px] text-[color:var(--ink-3)] no-underline hover:text-[color:var(--ink-invert)]';
export const newAppTitle = 'text-[13px] font-semibold text-[color:var(--ink-invert)]';
export const newAppBody = 'grid grid-cols-[420px_1fr] flex-1 overflow-hidden';
export const newAppForm = 'py-8 px-7 overflow-y-auto bg-[color:var(--bg)] flex flex-col gap-5 border-r-[1.5px] border-[color:var(--rule)]';

export const newAppPreview = 'flex flex-col bg-[#1a2236] overflow-hidden';
export const napHeader = 'flex justify-between items-center py-2.5 px-5 border-b border-white/8 shrink-0';
export const napFilename = '[font-family:var(--font-mono)] text-[11px] text-[#8896AB]';
export const napCopyBtn = '[font-family:var(--font-mono)] text-[11px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-3.5 py-[5px] cursor-pointer transition-[filter] duration-150 hover:brightness-110';
export const napCopyBtnCopied = '[font-family:var(--font-mono)] text-[11px] bg-[#059669] text-[color:var(--ink)] font-semibold border-none rounded px-3.5 py-[5px] cursor-pointer hover:bg-[#059669]';
export const napCode = '[font-family:var(--font-mono)] text-[12px] leading-[1.65] text-[#c9d1e0] p-5 overflow-y-auto flex-1 whitespace-pre';
export const napHint = '[font-family:var(--font-mono)] text-[10.5px] text-[#4A5568] py-3 px-5 border-t border-white/6 leading-[1.6] shrink-0';
export const napHintCode = 'text-[#8896AB]';
export const napLiveLabel = '[font-family:var(--font-mono)] text-[10px] text-[#4A5568] tracking-[0.06em]';

export const editAppHeader = 'bg-[color:var(--ink)] flex items-center justify-between px-6 h-[52px] gap-4 shrink-0';
export const editAppCompany = 'text-[color:var(--accent)] font-semibold';
export const editAppHeaderActions = 'flex items-center gap-2 shrink-0';
export const editResetBtn = '[font-family:var(--font-mono)] text-[11px] bg-transparent text-[color:var(--ink-3)] border border-white/12 rounded px-3 py-[5px] cursor-pointer tracking-[0.03em] hover:text-[color:var(--status-rejected)] hover:border-[color:var(--status-rejected)]';
export const editSaveBtn = '[font-family:var(--font-mono)] text-[11px] bg-[color:var(--accent)] text-[color:var(--ink)] font-semibold border-none rounded px-4 py-1.5 cursor-pointer tracking-[0.03em] transition-[filter] duration-150 hover:brightness-110';
