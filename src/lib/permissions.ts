export const STAFF_ROLES = ["admin", "doctor", "dentist", "nurse"] as const;

export const ROLE_LABELS: Record<string, string> = {
    admin: "Administrator",
    doctor: "Doctor",
    dentist: "Dentist",
    nurse: "Nurse",
};

/** "Doctor " / "DOCTOR" -> "doctor", para hindi makalusot dahil sa laki ng letra o espasyo. */
function norm(role: unknown) {
    return String(role ?? "").trim().toLowerCase();
}

/**
 * HEALTH RECORDS (clinic visits, case reports, health forms, illness alerts):
 * Nurse at Doctor lang ang puwedeng gumawa / mag-edit / mag-archive.
 * Hindi kasama ang Dentist.
 */
export function canManageRecords(role: string) {
    const r = norm(role);
    return r === "nurse" || r === "doctor";
}

/** Sino ang makakakita ng health records: Admin (view only), Nurse, Doctor. Hindi ang Dentist. */
export function canViewHealthRecords(role: string) {
    const r = norm(role);
    return r === "admin" || r === "nurse" || r === "doctor";
}

/**
 * DENTAL RECORDS (dental visits, dental health form):
 * Dentist at Nurse lang ang puwedeng gumawa / mag-edit / mag-archive.
 * Hindi kasama ang Doctor.
 */
export function canManageDental(role: string) {
    const r = norm(role);
    return r === "dentist" || r === "nurse";
}

/** Sino ang makakakita ng dental records: Admin (view only), Nurse, Dentist. Hindi ang Doctor. */
export function canViewDental(role: string) {
    const r = norm(role);
    return r === "admin" || r === "nurse" || r === "dentist";
}

/** Visitor log: Nurse, Doctor at Dentist (pare-parehong nasa clinic). */
export function canManageVisitors(role: string) {
    const r = norm(role);
    return r === "nurse" || r === "doctor" || r === "dentist";
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
    return canManageDental(role);
}
export function canViewClinicData(role: string) {
    return role !== "ittech";
}
export const canCreateAccounts = (role: string) => role === "admin" || role === "ittech";

export const canViewStaff = (role: string) => role === "admin" || role === "nurse";
/**
 * Nurses, doctors and dentists issue referral slips.
 *
 * Kept separate from canManageRecords on purpose: a dentist needs to
 * refer a patient out, but should not be able to open or edit clinic
 * visit records and health case reports.
 */
export function canManageReferrals(role: string) {
    const r = norm(role);
    return r === "nurse" || r === "doctor" || r === "dentist";
}