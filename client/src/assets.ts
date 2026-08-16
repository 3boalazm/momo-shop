// Asset URLs - tied to webdev project lifecycle
// These URLs persist as long as the website exists and will NOT expire

export const ASSETS = {
  // Hero & Brand
  heroBanner: {
    original: "/images/hero-banner.png",
    compressed: "/images/hero-banner.webp",
  },

  // Product Images
  products: {
    tee: {
      original: "https://d2xsxph8kpxj0f.cloudfront.net/310519663767986939/SipvdNwWkdPZPvtzwSvRNT/product-tee-oFaQNAb9QPv6jirFzJkYse.png",
      compressed: "https://d2xsxph8kpxj0f.cloudfront.net/310519663767986939/SipvdNwWkdPZPvtzwSvRNT/product-tee-b6uhAxsz2QRty7rmhTaLxT.webp",
    },
    denim: {
      original: "https://d2xsxph8kpxj0f.cloudfront.net/310519663767986939/SipvdNwWkdPZPvtzwSvRNT/product-denim-WqoVUfQ4UtBfovwd6V3tRz.png",
      compressed: "https://d2xsxph8kpxj0f.cloudfront.net/310519663767986939/SipvdNwWkdPZPvtzwSvRNT/product-denim-f2JhV7QLZv9ivNm9UEWNqs.webp",
    },
    hoodie: {
      original: "https://d2xsxph8kpxj0f.cloudfront.net/310519663767986939/SipvdNwWkdPZPvtzwSvRNT/product-hoodie-NTXHpJKWnjxxy9SNMZAH8U.png",
      compressed: "https://d2xsxph8kpxj0f.cloudfront.net/310519663767986939/SipvdNwWkdPZPvtzwSvRNT/product-hoodie-8dmnhtum3PLcJt8nF9h4db.webp",
    },
  },
};

// Helper to get the best image URL for a given context
export function getImageUrl(
  asset: { original: string; compressed: string },
  format: "original" | "compressed" = "compressed"
): string {
  return asset[format];
}
