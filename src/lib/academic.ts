// Academic Head: read-only access sa student health records ng sariling category.
// Ang category ay hango sa students.grade_level (free text, hal. "Grade 7", "FOURTH YEAR").

export const ACADEMIC_CATEGORIES = ["elementary", "junior_high", "senior_high", "college"] as const;
export type AcademicCategory = (typeof ACADEMIC_CATEGORIES)[number];

export const ACADEMIC_CATEGORY_LABELS: Record<AcademicCategory, string> = {
    elementary: "Elementary School",
    junior_high: "Junior High School",
    senior_high: "Senior High School",
    college: "College Department",
};

export function isAcademicCategory(value: unknown): value is AcademicCategory {
    return typeof value === "string" && (ACADEMIC_CATEGORIES as readonly string[]).includes(value);
}

/** Kinukuha ang category mula sa grade_level. Null kapag hindi matukoy. */
export function categoryOfGrade(gradeLevel: string | null | undefined): AcademicCategory | null {
    const g = String(gradeLevel ?? "").trim().toLowerCase();
    if (!g) return null;
    // Grade: "Grade 7" o "7" lang, parehong tanggap
    const grade = g.match(/^(grade\s*)?(\d+)$/);
    if (grade) {
        const n = Number(grade[2]);
        if (n >= 1 && n <= 6) return "elementary";
        if (n >= 7 && n <= 10) return "junior_high";
        if (n === 11 || n === 12) return "senior_high";
        return null;
    }
    // College: "FIRST YEAR" hanggang "FOURTH YEAR" (o "first" / "fourth" lang)
    if (/year|first|second|third|fourth/.test(g)) return "college";
    return null;
}

/** Para sa SQL: mga regex na katumbas ng categoryOfGrade. */
export const CATEGORY_REGEX: Record<AcademicCategory, string> = {
    elementary: "^\\s*(grade\\s*)?[1-6]\\s*$",
    junior_high: "^\\s*(grade\\s*)?(7|8|9|10)\\s*$",
    senior_high: "^\\s*(grade\\s*)?(11|12)\\s*$",
    college: "year|first|second|third|fourth",
};