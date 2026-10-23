// Mga type na ginagamit ng buong students feature.

/** Isang row sa listahan ng students (students page). */
export type StudentListRow = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
    /** Profile picture (data URL); wala sa ibang query kaya optional. */
    avatar?: string | null;
};

/** Buong detalye ng isang student (edit page). */
export type StudentDetailRow = StudentListRow & {
    date_of_birth: Date | null;
    gender: string | null;
    contact_number: string | null;
    email: string | null;
};

/** Na-validate na data na isusulat sa database. */
export type StudentInput = {
    studentNumber: string;
    lastName: string;
    firstName: string;
    middleName: string | null;
    gradeLevel: string | null;
    program: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    contactNumber: string | null;
    email: string | null;
};

/** State na ibinabalik ng create/update action sa form. */
export type StudentState = {
    error?: string;
    values?: Record<string, string>;
};

/** Ang naka-login na staff, ayon sa kailangan ng service. */
export type Actor = {
    userId: number;
    role: string;
    name: string;
};

/** Search at filters sa Students list. Empty string = walang filter. */
export type StudentFilters = {
    q: string;
    grade: string;
    program: string;
};