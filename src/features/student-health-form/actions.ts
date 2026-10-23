"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import {
    ALL_ROS_KEYS,
    FAMILY_HISTORY,
    OTHER_FIELDS,
    PAST_HISTORY,
    PSYCHOLOGICAL,
} from "./form-data";

const BASE = "/dashboard/student-health-form";

export type HealthFormState = { error?: string };

export async function saveStudentHealthForm(
    _prev: HealthFormState,
    formData: FormData
): Promise<HealthFormState> {
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

    const past: Record<string, string> = {};
    for (const item of PAST_HISTORY) {
        const answer = get(`past_${item.key}`);
        if (answer) past[item.key] = answer;
    }

    const family: Record<string, { answer: string; relation: string }> = {};
    for (const item of FAMILY_HISTORY) {
        const answer = get(`fam_${item.key}`);
        const relation = get(`famrel_${item.key}`);
        if (answer || relation) family[item.key] = { answer, relation };
    }

    const psychological: Record<string, { answer: string; details: string }> = {};
    for (const item of PSYCHOLOGICAL) {
        const answer = get(`psy_${item.key}`);
        const details = get(`psydet_${item.key}`);
        if (answer || details) psychological[item.key] = { answer, details };
    }

    const ros: Record<string, { answer: string; age: string }> = {};
    for (const key of ALL_ROS_KEYS) {
        const answer = get(`ros_${key}`);
        const age = get(`rosage_${key}`);
        if (answer || age) ros[key] = { answer, age };
    }

    const otherMedical: Record<string, string> = {};
    for (const key of OTHER_FIELDS) {
        const value = get(key);
        if (value) otherMedical[key] = value;
    }

    const nullable = (key: string) => get(key) || null;

    try {
        await prisma.$executeRaw`
      INSERT INTO student_health_forms
        (student_id, sex, date_of_birth, birthplace, nationality, religion,
         address, contact_number,
         father_name, father_occupation, father_contact,
         mother_name, mother_occupation, mother_contact,
         guardian_name, guardian_occupation, guardian_contact,
         hospital_choice, hospital_address, hospital_contact, doctor_name,
         emergency_person, emergency_contact, emergency_relation, emergency_address,
         past_history, past_others, family_history, psychological,
         other_medical, review_of_system,
         consent_name, consent_relationship, consent_date,
         updated_by, updated_at)
      VALUES
        (${student.student_id}, ${nullable("sex")}, ${nullable("dateOfBirth")}::date,
         ${nullable("birthplace")}, ${nullable("nationality")}, ${nullable("religion")},
         ${nullable("address")}, ${nullable("contactNumber")},
         ${nullable("fatherName")}, ${nullable("fatherOccupation")}, ${nullable("fatherContact")},
         ${nullable("motherName")}, ${nullable("motherOccupation")}, ${nullable("motherContact")},
         ${nullable("guardianName")}, ${nullable("guardianOccupation")}, ${nullable("guardianContact")},
         ${nullable("hospitalChoice")}, ${nullable("hospitalAddress")},
         ${nullable("hospitalContact")}, ${nullable("doctorName")},
         ${nullable("emergencyPerson")}, ${nullable("emergencyContact")},
         ${nullable("emergencyRelation")}, ${nullable("emergencyAddress")},
         ${JSON.stringify(past)}::jsonb, ${nullable("pastOthers")},
         ${JSON.stringify(family)}::jsonb, ${JSON.stringify(psychological)}::jsonb,
         ${JSON.stringify(otherMedical)}::jsonb, ${JSON.stringify(ros)}::jsonb,
         ${nullable("consentName")}, ${nullable("consentRelationship")},
         ${nullable("consentDate")}::date,
         ${session.username}, CURRENT_TIMESTAMP)
      ON CONFLICT (student_id) DO UPDATE SET
        sex = EXCLUDED.sex,
        date_of_birth = EXCLUDED.date_of_birth,
        birthplace = EXCLUDED.birthplace,
        nationality = EXCLUDED.nationality,
        religion = EXCLUDED.religion,
        address = EXCLUDED.address,
        contact_number = EXCLUDED.contact_number,
        father_name = EXCLUDED.father_name,
        father_occupation = EXCLUDED.father_occupation,
        father_contact = EXCLUDED.father_contact,
        mother_name = EXCLUDED.mother_name,
        mother_occupation = EXCLUDED.mother_occupation,
        mother_contact = EXCLUDED.mother_contact,
        guardian_name = EXCLUDED.guardian_name,
        guardian_occupation = EXCLUDED.guardian_occupation,
        guardian_contact = EXCLUDED.guardian_contact,
        hospital_choice = EXCLUDED.hospital_choice,
        hospital_address = EXCLUDED.hospital_address,
        hospital_contact = EXCLUDED.hospital_contact,
        doctor_name = EXCLUDED.doctor_name,
        emergency_person = EXCLUDED.emergency_person,
        emergency_contact = EXCLUDED.emergency_contact,
        emergency_relation = EXCLUDED.emergency_relation,
        emergency_address = EXCLUDED.emergency_address,
        past_history = EXCLUDED.past_history,
        past_others = EXCLUDED.past_others,
        family_history = EXCLUDED.family_history,
        psychological = EXCLUDED.psychological,
        other_medical = EXCLUDED.other_medical,
        review_of_system = EXCLUDED.review_of_system,
        consent_name = EXCLUDED.consent_name,
        consent_relationship = EXCLUDED.consent_relationship,
        consent_date = EXCLUDED.consent_date,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `;
    } catch (err) {
        console.error("Save student health form error:", err);
        return { error: "Could not save the form. Please try again." };
    }

    revalidatePath(BASE);
    redirect(`${BASE}?student=${encodeURIComponent(studentNumber)}&saved=1`);
}