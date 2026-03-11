/**
 * Removes images and videos from markdown/HTML content before passing to LLM.
 * Strips: markdown images, <img>, <video>, <iframe> (common embed wrapper).
 */
export function removeMedia(content: string): string {
  return content
    // Markdown images: ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
    // HTML img tags
    .replace(/<img\b[^>]*\/?>/gi, "")
    // HTML video tags (including content between open/close)
    .replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, "")
    // HTML iframe tags (YouTube embeds etc.)
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    // Collapse multiple blank lines left behind
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
