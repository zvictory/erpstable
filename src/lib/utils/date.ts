/**
 * Shared date utilities to replace scattered getTodayString() functions
 */

/**
 * Get current date as Date object
 */
export const getToday = (): Date => new Date();

/**
 * Format date to dd/mm/yyyy for display
 */
export const formatDateDisplay = (date: Date | null): string => {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Parse dd/mm/yyyy string to Date
 */
export const parseDateInput = (dateStr: string): Date | null => {
  const [day, month, year] = dateStr.split('/').map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Add days to a date (for terms calculations)
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
