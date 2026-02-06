/**
 * XSS Protection utilities using DOMPurify
 * Sanitizes user-generated content before rendering
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - Potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Sanitize text content (strips all HTML)
 * @param dirty - Potentially unsafe text
 * @returns Plain text with HTML stripped
 */
export const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize user input for display in IELTS writing context
 * Preserves formatting but removes malicious content
 * @param input - User's writing input
 * @returns Sanitized string preserving newlines and basic formatting
 */
export const sanitizeUserWriting = (input: string): string => {
  // For writing text, we want to preserve newlines but sanitize HTML
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

/**
 * Sanitize feedback text from AI
 * Allows some formatting for better readability
 * @param feedback - AI-generated feedback
 * @returns Sanitized feedback
 */
export const sanitizeFeedback = (feedback: string): string => {
  return DOMPurify.sanitize(feedback, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Create a safe HTML element from sanitized content
 * @param content - Content to render
 * @returns Object with __html property for dangerouslySetInnerHTML
 */
export const createSafeMarkup = (content: string): { __html: string } => {
  return { __html: sanitizeHtml(content) };
};

/**
 * Escape HTML special characters for safe display
 * @param text - Text to escape
 * @returns Escaped text
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Sanitize object properties recursively
 * Useful for sanitizing API responses
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized: any = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeText(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? sanitizeText(item) : 
          typeof item === 'object' ? sanitizeObject(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized as T;
};
