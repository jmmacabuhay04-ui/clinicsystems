import { prisma } from "@/lib/prisma";
import { isAcademicHead } from "@/lib/permissions";
import { CATEGORY_REGEX, isAcademicCategory } from "@/lib/academic";

/**
 * Academic Head: regex ng grade_level ng sariling category, para i-limit ang student data.
 * - Ibang role: null (walang limit, lahat ng data).
 * - Academic Head na walang category: regex na walang tutugma (walang makikita).
 * Gamitin sa SQL: (${regex}::text IS NULL OR s.grade_level ~* ${regex})
 */
export async function academicGradeRegex(session: { userId: unknown; role: string }): Promise<string | null> {
    if (!isAcademicHead(session.role)) return null;
    const me = await prisma.user.findUnique({
        where: { user_id: Number(session.userId) },
        select: { academic_category: true },
    });
    const cat = me?.academic_category;
    return isAcademicCategory(cat) ? CATEGORY_REGEX[cat] : "a^";
}