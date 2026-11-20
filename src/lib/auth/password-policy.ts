// lib/password-policy.ts
// Password complexity policy para sa buong system (server-side, bago i-save sa database).
// Ginagamit saanman may bagong password: Student/Employee account, Manage Accounts,
// Reset Password, Change Password, Walk-in Reset at Password Requests.
// Kapareho ng checklist sa screen: 8 characters, 1 uppercase letter, 1 number.

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES_TEXT =
    "At least 8 characters, with at least 1 uppercase letter and 1 number.";
// Mga password na bawal kahit pumasa sa haba.
const BLOCKED_PASSWORDS = new Set([
    "password",
    "password1",
    "password123",
    "12345678",
    "123456789",
    "1234567890",
    "qwerty123",
    "abc12345",
    "bcasclinic",
    "bcas1234",
    "clinic123",
    "student123",
    "employee123",
    "nurse123",
    "admin123",
    "letmein1",
    "iloveyou",
]);

/**
 * Sinusuri ang lakas ng password.
 * Nagbabalik ng error message (string) kapag mali, o null kapag okay.
 */
export function validatePasswordStrength(password: string): string | null {
    if (!password) return "Password is required.";

    const value = password.trim();

    if (value.length < PASSWORD_MIN_LENGTH) {
        return "Password must be at least 8 characters.";
    }

    if (value.length > 72) {
        // bcrypt limit
        return "Password is too long. Use 72 characters or fewer.";
    }

    if (!/[A-Z]/.test(value)) {
        return "Password needs at least 1 uppercase letter.";
    }

    if (!/[0-9]/.test(value)) {
        return "Password needs at least 1 number.";
    }

    if (/\s/.test(value)) {
        return "Password cannot contain spaces.";
    }

    if (BLOCKED_PASSWORDS.has(value.toLowerCase())) {
        return "This password is too common. Please choose another one.";
    }

    // Lahat ng letra ay pareho (aaaaaaa1) o puro sunod-sunod (12345678abc)
    if (/^(.)\1+[0-9]*$/.test(value)) {
        return "This password is too simple. Please choose another one.";
    }

    return null;
}

/**
 * Password + confirm password sabay na tsek.
 * Nagbabalik ng error message o null.
 */
export function validatePasswordPair(
    password: string,
    confirm: string,
): string | null {
    const strength = validatePasswordStrength(password);
    if (strength) return strength;

    if (password !== confirm) {
        return "Password and Confirm Password do not match.";
    }

    return null;
}