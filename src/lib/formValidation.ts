/**
 * Form validation utilities
 * Clean, reusable validation functions
 */

/**
 * Validates and formats alphabetic text with proper capitalization
 * @param text - Input text to validate and format
 * @returns Formatted text with first letter of each word capitalized
 */
export function validateAlphabeticText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
    .join(' ');
}

/**
 * Checks if input contains only alphabetic characters and spaces
 * @param text - Input text to validate
 * @returns true if valid, false otherwise
 */
export function isValidAlphabeticInput(text: string): boolean {
  if (!text) return true;
  return /^[A-Za-z\s]*$/.test(text);
}

/**
 * Validates and formats alphanumeric text with proper capitalization
 * @param text - Input text to validate and format
 * @returns Formatted text with first letter of each word capitalized
 */
export function validateAlphanumericText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
    .join(' ');
}

/**
 * Checks if input contains only alphanumeric characters and spaces
 * @param text - Input text to validate
 * @returns true if valid, false otherwise
 */
export function isValidAlphanumericInput(text: string): boolean {
  if (!text) return true;
  return /^[A-Za-z0-9\s]*$/.test(text);
}
