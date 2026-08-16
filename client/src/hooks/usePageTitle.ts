import { useEffect } from "react";

/**
 * Sets the document title (and optional meta description) for a page,
 * restoring nothing on unmount — the next page sets its own.
 */
export function usePageTitle(title: string, description?: string) {
  useEffect(() => {
    const full = title ? `${title} · Élan Collective` : "Élan Collective — Urban Streetwear";
    document.title = full;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);
}
