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

/**
 * Validates phone number input (digits and spaces only)
 * @param text - Input text to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(text: string): boolean {
  if (!text) return true;
  return /^[0-9\s]*$/.test(text);
}

/**
 * Validates numeric input (digits only)
 * @param text - Input text to validate
 * @returns true if valid, false otherwise
 */
export function isValidNumericInput(text: string): boolean {
  if (!text) return true;
  return /^[0-9]*$/.test(text);
}

/**
 * Gets minimum date for date inputs (today's date)
 * @returns Today's date in YYYY-MM-DD format
 */
export function getMinDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
