import { toast } from 'sonner';
import { postHref, profileHref } from '../features/public/routes';

/** System share sheet where there is one (phones), else copy the link. Links use this site's own origin,
 * so prod shares outstagram.aryan.cfd and the staging preview shares aryan.cfd/outstagram. */
export async function shareLink(url: string, title: string): Promise<void> {
  try {
    if (navigator.share) await navigator.share({ title, url });
    else { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
  } catch { /* cancelled */ }
}

export const sharePost = (postId: string, author?: string) =>
  shareLink(postHref(postId), author ? `Post by @${author} on Outstagram` : 'Post on Outstagram');

export const shareProfile = (username: string) => shareLink(profileHref(username), `@${username} on Outstagram`);
