// lib/password-policy.ts
// Password complexity policy para sa buong system.
// Use this everywhere a new password is set: student form, employee form,
// student form, employee form, user management, password requests.

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES_TEXT =
    "At least 8 characters, with at least one letter and one number.";
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
        return `Masyadong maikli ang password. ${PASSWORD_RULES_TEXT}`;
    }

    if (value.length > 72) {
        // bcrypt limit
        return "Masyadong mahaba ang password. Hanggang 72 characters lang.";
    }

    if (!/[A-Za-z]/.test(value)) {
        return `Password needs at least one letter. ${PASSWORD_RULES_TEXT}`;
    }

    if (!/[0-9]/.test(value)) {
        return `Password needs at least one number. ${PASSWORD_RULES_TEXT}`;
    }

    if (/\s/.test(value)) {
        return "Password cannot contain spaces.";
    }

    if (BLOCKED_PASSWORDS.has(value.toLowerCase())) {
        return "Masyadong karaniwan ang password na ito. Pumili ng iba.";
    }

    // Lahat ng letra ay pareho (aaaaaaa1) o puro sunod-sunod (12345678abc)
    if (/^(.)\1+[0-9]*$/.test(value)) {
        return "Masyadong simple ang password. Pumili ng iba.";
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
