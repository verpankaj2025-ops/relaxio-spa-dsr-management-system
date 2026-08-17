/**
 * Utility functions for request parameter validation, XSS sanitization, and error formatting.
 */

export function sanitizeInput(input: any): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function isNonEmptyString(val: any): boolean {
  return typeof val === 'string' && val.trim().length > 0;
}

export function isValidEmail(email: any): boolean {
  if (!isNonEmptyString(email)) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim().toLowerCase());
}

export function isValidPhoneNumber(phone: any): boolean {
  if (!phone) return false;
  const str = String(phone).replace(/[\s\-\+\(\)]/g, '');
  return str.length >= 7 && str.length <= 15 && /^\d+$/.test(str);
}

export function isValidDateString(dateStr: any): boolean {
  if (!isNonEmptyString(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function sendValidationError(res: any, errors: string[] | string) {
  const errorMsg = Array.isArray(errors) ? errors.join('; ') : errors;
  return res.status(400).json({
    error: 'Validation Error',
    details: errorMsg,
    statusCode: 400,
  });
}

export function sendInternalError(res: any, error: any, customMsg = 'Internal Server Error') {
  // Log full error server-side but do not expose stack or internal messages to clients
  console.error('API Error:', error);
  return res.status(500).json({
    error: customMsg,
    statusCode: 500,
  });
}

