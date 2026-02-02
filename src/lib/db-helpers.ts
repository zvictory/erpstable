/**
 * Database Helper Functions
 * Utilities for handling data serialization and timestamp normalization
 */

/**
 * Sanitizes data to ensure all timestamp fields are finite numbers or null
 * Prevents React serialization errors when timestamps contain NaN values
 *
 * This is a defensive measure to handle cases where database timestamp fields
 * might contain invalid values during parsing.
 */
export function sanitizeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeTimestamps(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if this is a timestamp field
      if (key.includes('At') || key.includes('_at')) {
        // Timestamp field - ensure it's a valid number or null
        if (typeof value === 'number' && isFinite(value)) {
          sanitized[key] = value;
        } else if (value instanceof Date) {
          sanitized[key] = value.getTime();
        } else {
          // Invalid timestamp - convert to null
          sanitized[key] = null;
        }
      } else if (typeof value === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeTimestamps(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return obj;
}
