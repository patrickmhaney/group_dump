/**
 * Utility functions for managing company/service preselection in localStorage.
 * Used to persist user's company selection from the public landing page
 * through the registration flow and into group creation.
 */

export interface PreselectionData {
  preselectedCompanyId: number;
  preselectedServiceId?: number; // Optional: specific dumpster size selected
  zipCode: string;
  timestamp: number;
}

const STORAGE_KEY = 'groupdump_preselection';
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Save preselection data to localStorage
 */
export function savePreselection(data: Omit<PreselectionData, 'timestamp'>): void {
  const preselection: PreselectionData = {
    ...data,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preselection));
  } catch (error) {
    console.error('Failed to save preselection to localStorage:', error);
  }
}

/**
 * Get preselection data from localStorage
 * Returns null if no data exists or if data is expired (>48 hours old)
 */
export function getPreselection(): PreselectionData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: PreselectionData = JSON.parse(stored);

    // Check if data is expired
    const age = Date.now() - data.timestamp;
    if (age > MAX_AGE_MS) {
      clearPreselection();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to read preselection from localStorage:', error);
    clearPreselection(); // Clear corrupted data
    return null;
  }
}

/**
 * Clear preselection data from localStorage
 */
export function clearPreselection(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear preselection from localStorage:', error);
  }
}

/**
 * Check if preselection data exists and is valid
 */
export function hasValidPreselection(): boolean {
  return getPreselection() !== null;
}
