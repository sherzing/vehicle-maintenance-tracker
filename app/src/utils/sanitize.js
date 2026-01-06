import DOMPurify from 'dompurify';

/**
 * Sanitize user-generated text content to prevent XSS attacks
 * @param {string|null|undefined} text - Text to sanitize
 * @returns {string} Sanitized text safe for rendering
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Configure DOMPurify to strip all HTML tags and only return text
  const clean = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep the text content
  });

  return clean;
}

/**
 * Sanitize user-generated HTML content to prevent XSS attacks
 * Allows safe HTML tags for formatting (if needed in the future)
 * @param {string|null|undefined} html - HTML to sanitize
 * @returns {string} Sanitized HTML safe for rendering
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Allow only safe HTML tags for basic formatting
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
  });

  return clean;
}
