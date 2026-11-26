// In-app navigation events (the app has no router): any component can open a profile; App listens.

export function openProfile(username: string) {
  window.dispatchEvent(new CustomEvent<string>('openprofile', { detail: username }));
}

export function onOpenProfile(cb: (username: string) => void): () => void {
  const on = (e: Event) => cb((e as CustomEvent<string>).detail);
  window.addEventListener('openprofile', on);
  return () => window.removeEventListener('openprofile', on);
}

/** Open one post (e.g. from "Saved equations"); App listens. */
export function openPost(postId: string) {
  window.dispatchEvent(new CustomEvent<string>('openpost', { detail: postId }));
}

export function onOpenPost(cb: (postId: string) => void): () => void {
  const on = (e: Event) => cb((e as CustomEvent<string>).detail);
  window.addEventListener('openpost', on);
  return () => window.removeEventListener('openpost', on);
}
