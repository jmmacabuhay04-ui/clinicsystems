export const STAFF_ROLES = ["admin", "doctor", "dentist", "nurse"] as const;

export const ROLE_LABELS: Record<string, string> = {
    admin: "Administrator",
    doctor: "Doctor",
    dentist: "Dentist",
    nurse: "Nurse",
};

/** Nurses and doctors maintain clinic records: create, edit, archive. */
export function canManageRecords(role: string) {
    return role === "nurse" || role === "doctor";
}

/** Dentists and nurses maintain dental records. */
export function canManageDental(role: string) {
    return role === "dentist" || role === "nurse";
}

/** Only nurses create and edit student accounts. */
export function canManageStudents(role: string) {
    return role === "nurse";
}

/** Admins manage staff accounts. */
export function canManageAccounts(role: string) {
    return role === "ittech" || role === "admin";
}
/** Everyone else can read records but not change them. */
export function isViewOnly(role: string) {
    return !canManageRecords(role);
}
/** Admins and nurses manage clinic personnel records. */
export const canManageStaff = (role: string) => role === "nurse";

export function canManageDentalForm(role: string) {
    return role === "dentist";
}
export function canViewClinicData(role: string) {
    return role !== "ittech";
}
export const canCreateAccounts = (role: string) => role === "admin" || role === "ittech";

export const canViewStaff = (role: string) => role === "admin" || role === "nurse";