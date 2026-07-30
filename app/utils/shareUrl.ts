export function generateShareText(
  transactions: number | string,
  persona: string,
  vibePercentage: number | string,
  topVibe: string
): string {
  return `Check out my Stellar Wrapped 2026! ${transactions} transactions, ${persona} persona, ${vibePercentage}% ${topVibe}! 🎉 #StellarWrapped`;
}

export function generatePlatformShareUrl(platform: string, url: string, text: string): string {
  switch (platform.toLowerCase()) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    default:
      return "";
  }
}
