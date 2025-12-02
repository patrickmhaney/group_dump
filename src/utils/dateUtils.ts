/**
 * Date utility functions to ensure consistent date handling across components
 */

/**
 * Format a date string (YYYY-MM-DD) for display, avoiding timezone issues
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export const formatDateDisplay = (dateString: string): string => {
  // Parse date string as YYYY-MM-DD and treat it as local date to avoid timezone shifts
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Create a date string in YYYY-MM-DD format from a Date object
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};