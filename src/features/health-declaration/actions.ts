"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import { SYMPTOMS } from "./form-data";

const BASE = "/dashboard/health-declaration";

export type DeclarationState = { error?: string };

export async function saveHealthDeclaration(
    _prev: DeclarationState,
    formData: FormData
): Promise<DeclarationState> {
    const session = await getSession();
    if (!session) return { error: "Session expired. Please sign in again." };
    if (!canManageRecords(session.role)) {
        return { error: "You do not have permission to edit this form." };
    }

    const get = (key: string) => String(formData.get(key) ?? "").trim();

    const studentNumber = get("studentNumber");
    if (!studentNumber) return { error: "Missing student." };

    const found = await prisma.$queryRaw<{ student_id: number }[]>`
    SELECT student_id FROM students WHERE student_number = ${studentNumber} LIMIT 1
  `;
    const student = found[0];
    if (!student) return { error: "Student not found." };

    const symptoms: Record<string, boolean> = {};
    for (const item of SYMPTOMS) {
        if (formData.get(`sym_${item.key}`) !== null) symptoms[item.key] = true;
    }

    const nullable = (key: string) => get(key) || null;
    const checked = (key: string) => formData.get(key) !== null;

    try {
        await prisma.$executeRaw`
      INSERT INTO health_declarations
        (student_id, school_year, grade_section, residence_address,
         emergency_name, emergency_relationship, emergency_numbers,
         going_home, going_home_other, symptoms, symptom_notes,
         vaccination_submitted, medical_cert_submitted, medicines,
         certified_by, declaration_date, updated_by, updated_at)
      VALUES
        (${student.student_id}, ${nullable("schoolYear")}, ${nullable("gradeSection")},
         ${nullable("residenceAddress")}, ${nullable("emergencyName")},
         ${nullable("emergencyRelationship")}, ${nullable("emergencyNumbers")},
         ${nullable("goingHome")}, ${nullable("goingHomeOther")},
         ${JSON.stringify(symptoms)}::jsonb, ${nullable("symptomNotes")},
         ${checked("vaccinationSubmitted")}, ${checked("medicalCertSubmitted")},
         ${nullable("medicines")}, ${nullable("certifiedBy")},
         ${nullable("declarationDate")}::date, ${session.username}, CURRENT_TIMESTAMP)
      ON CONFLICT (student_id) DO UPDATE SET
        school_year = EXCLUDED.school_year,
        grade_section = EXCLUDED.grade_section,
        residence_address = EXCLUDED.residence_address,
        emergency_name = EXCLUDED.emergency_name,
        emergency_relationship = EXCLUDED.emergency_relationship,
        emergency_numbers = EXCLUDED.emergency_numbers,
        going_home = EXCLUDED.going_home,
        going_home_other = EXCLUDED.going_home_other,
        symptoms = EXCLUDED.symptoms,
        symptom_notes = EXCLUDED.symptom_notes,
        vaccination_submitted = EXCLUDED.vaccination_submitted,
        medical_cert_submitted = EXCLUDED.medical_cert_submitted,
        medicines = EXCLUDED.medicines,
        certified_by = EXCLUDED.certified_by,
        declaration_date = EXCLUDED.declaration_date,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `;
    } catch (err) {
        console.error("Save health declaration error:", err);
        return { error: "Could not save the form. Please try again." };
    }

    revalidatePath(BASE);
    redirect(`${BASE}?student=${encodeURIComponent(studentNumber)}&saved=1`);
}