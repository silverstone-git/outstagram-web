export type PostCategory =
  | "tech"
  | "entertainment"
  | "business"
  | "vlog"
  | "lifestyle"
  | "academic"
  | "achievement"
  | "study_group"
  | "exam_result"
  | "project";

/** The API stores category labels ("Exam Result"); the UI keys off slugs ("exam_result"). Accepts either. */
export function categoryKey(c: string | null | undefined): PostCategory | string {
  const k = (c || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return k === 'technology' ? 'tech' : k;
}
