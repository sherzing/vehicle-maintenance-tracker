/**
 * Error handling utilities to prevent information disclosure
 * Sanitizes error messages to avoid leaking sensitive system details
 */

/**
 * Map of known error codes to user-friendly messages
 */
const ERROR_MESSAGES = {
  // Firebase Auth errors
  'auth/user-not-found': 'Invalid email or password.',
  'auth/wrong-password': 'Invalid email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',

  // Firestore errors
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested resource was not found.',
  'already-exists': 'This resource already exists.',
  'resource-exhausted': 'Too many requests. Please try again later.',
  'unauthenticated': 'Please sign in to continue.',
  'unavailable': 'Service temporarily unavailable. Please try again.',
  'deadline-exceeded': 'Request timed out. Please try again.',

  // Custom validation errors
  'invalid-vehicle-id': 'Invalid vehicle identifier.',
  'invalid-usage': 'Please enter a valid usage value.',
  'invalid-date': 'Please enter a valid date.',
  'future-date': 'Date cannot be in the future.',
  'invalid-input': 'Invalid input provided.',
  'rate-limit': 'Too many requests. Please wait before trying again.',
};

/**
 * Generic error messages for different contexts
 */
const GENERIC_MESSAGES = {
  create: 'Unable to create resource. Please try again.',
  update: 'Unable to update resource. Please try again.',
  delete: 'Unable to delete resource. Please try again.',
  fetch: 'Unable to load data. Please try again.',
  default: 'An error occurred. Please try again.',
};

/**
 * Sanitize error message to prevent information disclosure
 * @param {Error|string} error - The error to sanitize
 * @param {string} context - Context of the operation (create, update, delete, fetch)
 * @returns {string} User-friendly error message
 */
export function sanitizeError(error, context = 'default') {
  // Handle null/undefined
  if (!error) {
    return GENERIC_MESSAGES[context] || GENERIC_MESSAGES.default;
  }

  // Extract error code or message
  let errorCode = null;
  let errorMessage = null;

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error.code) {
    errorCode = error.code;
  } else if (error.message) {
    errorMessage = error.message;
  }

  // Check for known error codes
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  // Check for validation errors in message
  if (errorMessage) {
    const lowerMessage = errorMessage.toLowerCase();

    // Check for known patterns
    if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
      return ERROR_MESSAGES['permission-denied'];
    }
    if (lowerMessage.includes('not found')) {
      return ERROR_MESSAGES['not-found'];
    }
    if (lowerMessage.includes('network')) {
      return ERROR_MESSAGES['auth/network-request-failed'];
    }
    if (lowerMessage.includes('rate limit')) {
      return ERROR_MESSAGES['rate-limit'];
    }

    // Check for our custom validation errors
    if (lowerMessage.includes('invalid vehicle id')) {
      return ERROR_MESSAGES['invalid-vehicle-id'];
    }
    if (lowerMessage.includes('invalid usage')) {
      return ERROR_MESSAGES['invalid-usage'];
    }
    if (lowerMessage.includes('invalid date') || lowerMessage.includes('date is invalid')) {
      return ERROR_MESSAGES['invalid-date'];
    }
    if (lowerMessage.includes('date cannot be in the future')) {
      return ERROR_MESSAGES['future-date'];
    }
    if (lowerMessage.includes('please wait')) {
      return errorMessage; // Rate limit messages are already sanitized
    }
    if (lowerMessage.includes('version conflict')) {
      return errorMessage; // Version conflict messages are user-friendly
    }

    // If it's a validation error message we created, pass it through
    if (lowerMessage.startsWith('please ') ||
        lowerMessage.startsWith('invalid ') ||
        lowerMessage.includes('must be') ||
        lowerMessage.includes('cannot be')) {
      return errorMessage;
    }
  }

  // Default to generic message for the context
  return GENERIC_MESSAGES[context] || GENERIC_MESSAGES.default;
}

/**
 * Log error details for debugging (only in development)
 * @param {Error} error - The error to log
 * @param {string} context - Context where error occurred
 */
export function logError(error, context) {
  // Only log detailed errors in development
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  } else {
    // In production, log minimal info
    console.error(`Error in ${context}`);
  }
}

/**
 * Handle error with sanitization and logging
 * @param {Error} error - The error to handle
 * @param {string} context - Context of the operation
 * @returns {string} Sanitized error message
 */
export function handleError(error, context = 'default') {
  logError(error, context);
  return sanitizeError(error, context);
}
