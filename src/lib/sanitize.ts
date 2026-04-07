/**
 * HTML sanitizer using DOMPurify when available (browser), regex fallback for SSR.
 */
function regexSanitize(html: string): string {
  if (!html || typeof html !== "string") return ""
  let s = html
  // Remove dangerous tags
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
  s = s.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
  s = s.replace(/<embed\b[^>]*>/gi, "")
  s = s.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "")
  s = s.replace(/<input\b[^>]*>/gi, "")
  s = s.replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, "")
  s = s.replace(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/gi, "")
  s = s.replace(/<meta\b[^>]*>/gi, "")
  s = s.replace(/<link\b[^>]*>/gi, "")
  s = s.replace(/<base\b[^>]*>/gi, "")
  s = s.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
  s = s.replace(/<math\b[^>]*>[\s\S]*?<\/math>/gi, "")
  // Remove event handlers
  s = s.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
  s = s.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "")
  // Remove dangerous URI schemes
  s = s.replace(/javascript:\s*["']?[^"'\s]*["']?/gi, "")
  s = s.replace(/javascript:/gi, "")
  s = s.replace(/vbscript:/gi, "")
  s = s.replace(/data:\s*text\/html/gi, "data:blocked")
  // Remove style-based attacks
  s = s.replace(/expression\s*\(/gi, "")
  s = s.replace(/url\s*\(\s*["']?\s*javascript:/gi, "")
  s = s.replace(/@import\b/gi, "")
  return s.trim()
}

let _dp: { sanitize: (html: string, opts?: object) => string } | null = null
function getDOMPurify() {
  if (_dp) return _dp
  if (typeof window === "undefined") return null
  try {
    const m = require("dompurify")
    _dp = m?.default ?? m
    return _dp?.sanitize ? _dp : null
  } catch {
    return null
  }
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return ""
  if (html.length > 50000) return "" // Prevent DoS via huge HTML
  const dp = getDOMPurify()
  if (dp?.sanitize) {
    return dp.sanitize(html, {
      ALLOWED_TAGS: ["a", "b", "i", "u", "strong", "em", "p", "br", "img", "span", "div", "ul", "ol", "li"],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
      ADD_ATTR: ["target"]
    }).trim()
  }
  return regexSanitize(html)
}
