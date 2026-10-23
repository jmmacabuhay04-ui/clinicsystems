// Validation ng student form. Walang database dito.
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import type { StudentInput } from "./types";

/** Kinukuha ang lahat ng text field ng form (trimmed). */
export function collect(formData: FormData) {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && !key.startsWith("$")) values[key] = value.trim();
    }
    return values;
}

function checkPassword(values: Record<string, string>): string | null {
    const password = values["password"] ?? "";

    const strength = validatePasswordStrength(password);
    if (strength) return strength;

    if ("confirmPassword" in values && values["confirmPassword"] !== password) {
        return "Password and Confirm Password do not match.";
    }

    return null;
}

/** Ibinabalik ang error message, o null kung valid. */
export function validateStudent(values: Record<string, string>, requirePassword: boolean) {
    const get = (key: string) => values[key] ?? "";

    if (!get("studentNumber") || !get("lastName") || !get("firstName")) {
        return "Student number, last name, and first name are required.";
    }
    if (get("studentNumber").length > 20) return "Student number is too long.";

    if (requirePassword || get("password")) {
        const passwordError = checkPassword(values);
        if (passwordError) return passwordError;
    }

    if (get("dateOfBirth") && !/^\d{4}-\d{2}-\d{2}$/.test(get("dateOfBirth"))) {
        return "Enter a valid date of birth.";
    }
    if (get("gender") && get("gender") !== "Male" && get("gender") !== "Female") {
        return "Select a valid gender.";
    }

    // Contact details are optional, but must be well formed when supplied.
    const contact = get("contactNumber").replace(/[\s-]/g, "");
    if (contact && !/^09\d{9}$/.test(contact)) {
        return "Contact number must be 11 digits starting with 09, e.g. 09171234567.";
    }
    if (get("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get("email"))) {
        return "Enter a valid email address.";
    }

    return null;
}

/** Ginagawang malinis na StudentInput ang raw form values. */
export function toStudentInput(values: Record<string, string>): StudentInput {
    const get = (key: string) => values[key] ?? "";
    const contact = get("contactNumber").replace(/[\s-]/g, "");
    const email = get("email").toLowerCase();

    return {
        studentNumber: get("studentNumber"),
        lastName: get("lastName"),
        firstName: get("firstName"),
        middleName: get("middleName") || null,
        gradeLevel: get("gradeLevel") || null,
        program: get("program") || null,
        dateOfBirth: get("dateOfBirth") || null,
        gender: get("gender") || null,
        contactNumber: contact || null,
        email: email || null,
    };
}
