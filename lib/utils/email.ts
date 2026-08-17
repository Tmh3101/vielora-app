export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates whether the given string is a valid email format.
 *
 * @param email - The email string to validate
 * @returns boolean - True if the email is valid, false otherwise
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Alias for isValidEmail
 */
export function validateEmail(email?: string | null): boolean {
  return isValidEmail(email);
}
