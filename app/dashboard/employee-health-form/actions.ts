"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import {
    ALL_ROS_KEYS,
    FAMILY_HISTORY,
    OTHER_FIELDS,
    PAST_HISTORY,
    PHYSICAL_EXAM_KEYS,
    PSYCHOLOGICAL,
} from "./form-data";

const BASE = "/dashboard/employee-health-form";

export type HealthFormState = { error?: string };

export async function saveEmployeeHealthForm(
    _prev: HealthFormState,
    formData: FormData
): Promise<HealthFormState> {
    const session = await getSession();
    if (!session) return { error: "Session expired. Please sign in again." };
    if (!canManageRecords(session.role)) {
        return { error: "You do not have permission to edit this form." };
    }

    const get = (key: string) => String(formData.get(key) ?? "").trim();

    const employeeNumber = get("employeeNumber");
    if (!employeeNumber) return { error: "Missing employee." };

    const found = await prisma.$queryRaw<{ employee_id: number }[]>`
    SELECT employee_id FROM employees WHERE employee_number = ${employeeNumber} LIMIT 1
  `;
    const employee = found[0];
    if (!employee) return { error: "Employee not found." };

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
      INSERT INTO employee_health_forms
        (employee_id, sex, date_of_birth, birthplace, nationality, religion,
         address, contact_number,
         father_name, father_occupation, father_contact,
         mother_name, mother_occupation, mother_contact,
         hospital_choice, hospital_address, hospital_contact, doctor_name,
         emergency_person, emergency_contact, emergency_relation, emergency_address,
         past_history, past_others, family_history, psychological,
         other_medical, review_of_system,
         consent_name, consent_date,
         updated_by, updated_at)
      VALUES
        (${employee.employee_id}, ${nullable("sex")}, ${nullable("dateOfBirth")}::date,
         ${nullable("birthplace")}, ${nullable("nationality")}, ${nullable("religion")},
         ${nullable("address")}, ${nullable("contactNumber")},
         ${nullable("fatherName")}, ${nullable("fatherOccupation")}, ${nullable("fatherContact")},
         ${nullable("motherName")}, ${nullable("motherOccupation")}, ${nullable("motherContact")},
         ${nullable("hospitalChoice")}, ${nullable("hospitalAddress")},
         ${nullable("hospitalContact")}, ${nullable("doctorName")},
         ${nullable("emergencyPerson")}, ${nullable("emergencyContact")},
         ${nullable("emergencyRelation")}, ${nullable("emergencyAddress")},
         ${JSON.stringify(past)}::jsonb, ${nullable("pastOthers")},
         ${JSON.stringify(family)}::jsonb, ${JSON.stringify(psychological)}::jsonb,
         ${JSON.stringify(otherMedical)}::jsonb, ${JSON.stringify(ros)}::jsonb,
         ${nullable("consentName")}, ${nullable("consentDate")}::date,
         ${session.username}, CURRENT_TIMESTAMP)
      ON CONFLICT (employee_id) DO UPDATE SET
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
        consent_date = EXCLUDED.consent_date,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `;
    } catch (err) {
        console.error("Save employee health form error:", err);
        return { error: "Could not save the form. Please try again." };
    }

    revalidatePath(BASE);
    redirect(`${BASE}?employee=${encodeURIComponent(employeeNumber)}&saved=1`);
}

export async function addPhysicalExam(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const get = (key: string) => String(formData.get(key) ?? "").trim();

    const employeeNumber = get("employeeNumber");
    const examDate = get("examDate");
    if (!employeeNumber || !examDate) return;

    const rows = await prisma.$queryRaw<{ employee_id: number }[]>`
    SELECT employee_id FROM employees WHERE employee_number = ${employeeNumber} LIMIT 1
  `;
    const employeeId = rows[0]?.employee_id;
    if (!employeeId) return;

    const findings: Record<string, string> = {};
    for (const key of PHYSICAL_EXAM_KEYS) {
        const value = get(`pe_${key}`);
        if (value) findings[key] = value;
    }

    await prisma.$executeRaw`
    INSERT INTO employee_physical_exams
      (employee_id, exam_date, findings, physician_signature, recorded_by)
    VALUES
      (${employeeId}, ${examDate}::date, ${JSON.stringify(findings)}::jsonb,
       ${get("physicianSignature") || null}, ${session.username})
  `;

    revalidatePath(BASE);
}

export async function deletePhysicalExam(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const examId = Number(formData.get("examId"));
    if (!examId) return;

    await prisma.$executeRaw`
    DELETE FROM employee_physical_exams WHERE exam_id = ${examId}
  `;

    revalidatePath(BASE);
}

export async function addLabExam(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const get = (key: string) => String(formData.get(key) ?? "").trim();

    const employeeNumber = get("employeeNumber");
    const examDate = get("examDate");
    if (!employeeNumber || !examDate) return;

    const rows = await prisma.$queryRaw<{ employee_id: number }[]>`
    SELECT employee_id FROM employees WHERE employee_number = ${employeeNumber} LIMIT 1
  `;
    const employeeId = rows[0]?.employee_id;
    if (!employeeId) return;

    await prisma.$executeRaw`
    INSERT INTO employee_lab_exams
      (employee_id, exam_date, findings, recommendations, physician_signature, recorded_by)
    VALUES
      (${employeeId}, ${examDate}::date, ${get("findings") || null},
       ${get("recommendations") || null}, ${get("physicianSignature") || null},
       ${session.username})
  `;

    revalidatePath(BASE);
}

export async function deleteLabExam(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const labId = Number(formData.get("labId"));
    if (!labId) return;

    await prisma.$executeRaw`
    DELETE FROM employee_lab_exams WHERE lab_id = ${labId}
  `;

    revalidatePath(BASE);
}