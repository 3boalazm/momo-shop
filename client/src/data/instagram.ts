/**
 * Instagram feed posts shown in the "Follow the Culture" section on the home page.
 *
 * Until a live Instagram Graph API token is wired, edit this list manually:
 * paste each post's image URL and the link to the post. When you're ready to go
 * live with the real API, swap the `INSTAGRAM_POSTS` consumer for a fetch.
 *
 * Tip: right-click an Instagram image → "Copy image address" for the `image`,
 * and copy the post URL for `link`.
 */
export interface InstagramPost {
  image: string;
  link: string;
  caption?: string;
}

export const INSTAGRAM_HANDLE = "@elancollective";
export const INSTAGRAM_URL = "https://instagram.com/elancollective";

/**
 * Replace these with real post images + links.
 * Falls back gracefully: if empty, the home section hides itself.
 */
export const INSTAGRAM_POSTS: InstagramPost[] = [];
