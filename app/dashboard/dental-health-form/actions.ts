"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageDentalForm } from "@/lib/permissions";
import { ALL_TEETH, OCCLUSION, PERIODONTAL, TREATMENT, examinerName } from "./chart-data";

const BASE = "/dashboard/dental-health-form";

export type DentalFormState = { error?: string };

function checkedMap(formData: FormData, prefix: string, items: { key: string }[]) {
    const out: Record<string, boolean> = {};
    for (const item of items) {
        if (formData.get(`${prefix}_${item.key}`) !== null) out[item.key] = true;
    }
    return out;
}

export async function saveDentalHealthForm(
    _prev: DentalFormState,
    formData: FormData
): Promise<DentalFormState> {
    const session = await getSession();
    if (!session) return { error: "Session expired. Please log in again." };
    if (!canManageDentalForm(session.role)) {
        return { error: "Only the dentist can edit the dental health form." };
    }

    const studentNumber = String(formData.get("studentNumber") ?? "").trim();
    if (!studentNumber) return { error: "Missing student." };

    const found = await prisma.$queryRaw<{ student_id: number }[]>`
    SELECT student_id FROM students WHERE student_number = ${studentNumber} LIMIT 1
  `;
    const student = found[0];
    if (!student) return { error: "Student not found." };

    const chart: Record<string, { t: string; e: string }> = {};
    for (const tooth of ALL_TEETH) {
        const t = String(formData.get(`t_${tooth}`) ?? "").trim().toUpperCase();
        const e = String(formData.get(`e_${tooth}`) ?? "").trim().toUpperCase();
        if (t || e) chart[tooth] = { t, e };
    }

    const periodontal = checkedMap(formData, "perio", PERIODONTAL);
    const occlusion = checkedMap(formData, "occ", OCCLUSION);
    const treatment = checkedMap(formData, "tx", TREATMENT);

    const level = String(formData.get("level") ?? "").trim() || null;
    const section = String(formData.get("section") ?? "").trim() || null;
    const sex = String(formData.get("sex") ?? "").trim() || null;
    const remarks = String(formData.get("remarks") ?? "").trim() || null;
    const examDate = String(formData.get("examDate") ?? "").trim() || null;
    const me = await prisma.$queryRaw<{ full_name: string | null; username: string }[]>`
    SELECT full_name, username FROM users WHERE user_id = ${session.userId} LIMIT 1
  `;
    const examinedBy = examinerName(
        me[0]?.full_name ?? null,
        me[0]?.username ?? session.username
    );

    const ageRaw = String(formData.get("age") ?? "").trim();
    let age: number | null = null;
    if (ageRaw) {
        age = Number(ageRaw);
        if (!Number.isFinite(age) || age < 1 || age > 120) {
            return { error: "Age must be a number between 1 and 120." };
        }
    }

    await prisma.$executeRaw`
    INSERT INTO dental_health_forms
      (student_id, level, section, age, sex, chart, periodontal, occlusion,
       treatment, remarks, exam_date, examined_by, updated_by, updated_at)
    VALUES
      (${student.student_id}, ${level}, ${section}, ${age}, ${sex},
       ${JSON.stringify(chart)}::jsonb,
       ${JSON.stringify(periodontal)}::jsonb,
       ${JSON.stringify(occlusion)}::jsonb,
       ${JSON.stringify(treatment)}::jsonb,
       ${remarks}, ${examDate}::date, ${examinedBy},
       ${session.username}, CURRENT_TIMESTAMP)
    ON CONFLICT (student_id) DO UPDATE SET
      level       = EXCLUDED.level,
      section     = EXCLUDED.section,
      age         = EXCLUDED.age,
      sex         = EXCLUDED.sex,
      chart       = EXCLUDED.chart,
      periodontal = EXCLUDED.periodontal,
      occlusion   = EXCLUDED.occlusion,
      treatment   = EXCLUDED.treatment,
      remarks     = EXCLUDED.remarks,
      exam_date   = EXCLUDED.exam_date,
      examined_by = EXCLUDED.examined_by,
      updated_by  = EXCLUDED.updated_by,
      updated_at  = CURRENT_TIMESTAMP
  `;

    revalidatePath(BASE);
    redirect(`${BASE}?student=${encodeURIComponent(studentNumber)}&saved=1`);
}