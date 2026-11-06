import type { Profile, Project } from '../types';
import { slugify } from './slug';

/** `name` slugified, or `fallback`, with `-2`, `-3`, … appended until it isn't in `taken`. */
export function uniqueSlug(name: string, taken: Set<string>, fallback: string): string {
  const base = slugify(name) || fallback;
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/** An id for a newly added project that no existing project uses. */
export function newProjectId(projects: Project[]): string {
  return uniqueSlug('', new Set(projects.map((p) => p.id)), 'project');
}

export interface ProjectIdRepair {
  profile: Profile;
  changed: boolean;
  /**
   * The new id of the first project that had a blank id, if any. A featured
   * project id of '' used to resolve to exactly that project (lookups take
   * the first match), so applications referencing '' should now use this.
   */
  blankId: string | null;
}

// Project ids must be unique: the featured projects picker and the CV look
// projects up by id, so two projects sharing one (most often both blank,
// which "+ Add project" used to create) make one swallow the other.
//
// Every non-blank id stays with its first owner and is reserved before
// anything is renamed, so a project that already had a good id is never
// renamed to make room for another. Blanks and later duplicates get a slug
// of their name. Duplicates need no reference fix-up: lookups already
// resolved them to the first owner, which keeps the id.
export function repairProjectIds(profile: Profile): ProjectIdRepair {
  const taken = new Set(profile.projects.map((p) => p.id).filter(Boolean));
  const kept = new Set<string>();
  let blankId: string | null = null;
  let changed = false;

  const projects = profile.projects.map((project) => {
    if (project.id && !kept.has(project.id)) {
      kept.add(project.id);
      return project;
    }
    const id = uniqueSlug(project.name, taken, 'project');
    taken.add(id);
    changed = true;
    if (!project.id && blankId === null) blankId = id;
    return { ...project, id };
  });

  return { profile: changed ? { ...profile, projects } : profile, changed, blankId };
}

/** Ids that more than one project uses, plus '' if any project has none — for flagging in the editor. */
export function conflictingProjectIds(projects: Project[]): Set<string> {
  const seen = new Set<string>();
  const conflicts = new Set<string>();
  for (const { id } of projects) {
    if (!id || seen.has(id)) conflicts.add(id);
    seen.add(id);
  }
  return conflicts;
}
