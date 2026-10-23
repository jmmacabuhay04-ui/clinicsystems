import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import StudentHealthFormEditor, { type HealthFormValues } from "./form-editor";

const BASE = "/dashboard/student-health-form";

type StudentRow = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    date_of_birth: Date | null;
    gender: string | null;
};

type FormRow = Record<string, unknown>;

type FamilyMap = Record<string, { answer?: string; relation?: string }>;
type PsychMap = Record<string, { answer?: string; details?: string }>;
type RosMap = Record<string, { answer?: string; age?: string }>;

type Props = {
    searchParams: Promise<{ student?: string }>;
};

function dateStr(value: unknown) {
    if (!value) return "";
    return new Date(value as string).toISOString().slice(0, 10);
}

function text(value: unknown) {
    return value === null || value === undefined ? "" : String(value);
}

export default async function EditStudentHealthFormPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    const { student: studentNumber = "" } = await searchParams;
    if (!studentNumber) notFound();

    const students = await prisma.$queryRaw<StudentRow[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           date_of_birth, gender
    FROM students
    WHERE student_number = ${studentNumber}
    LIMIT 1
  `;
    const student = students[0];
    if (!student) notFound();

    const rows = await prisma.$queryRaw<FormRow[]>`
    SELECT * FROM student_health_forms WHERE student_id = ${student.student_id} LIMIT 1
  `;
    const form = rows[0];

    const other = (form?.other_medical ?? {}) as Record<string, string>;

    const t: Record<string, string> = {
        sex: text(form?.sex) || student.gender || "",
        dateOfBirth: dateStr(form?.date_of_birth ?? student.date_of_birth),
        birthplace: text(form?.birthplace),
        nationality: text(form?.nationality),
        religion: text(form?.religion),
        address: text(form?.address),
        contactNumber: text(form?.contact_number),
        fatherName: text(form?.father_name),
        fatherOccupation: text(form?.father_occupation),
        fatherContact: text(form?.father_contact),
        motherName: text(form?.mother_name),
        motherOccupation: text(form?.mother_occupation),
        motherContact: text(form?.mother_contact),
        guardianName: text(form?.guardian_name),
        guardianOccupation: text(form?.guardian_occupation),
        guardianContact: text(form?.guardian_contact),
        hospitalChoice: text(form?.hospital_choice),
        hospitalAddress: text(form?.hospital_address),
        hospitalContact: text(form?.hospital_contact),
        doctorName: text(form?.doctor_name),
        emergencyPerson: text(form?.emergency_person),
        emergencyContact: text(form?.emergency_contact),
        emergencyRelation: text(form?.emergency_relation),
        emergencyAddress: text(form?.emergency_address),
        pastOthers: text(form?.past_others),
        consentName: text(form?.consent_name),
        consentRelationship: text(form?.consent_relationship),
        consentDate: dateStr(form?.consent_date),
        ...other,
    };

    const middle = student.middle_name ? ` ${student.middle_name}` : "";

    const values: HealthFormValues = {
        studentNumber: student.student_number,
        studentName: `${student.first_name}${middle} ${student.last_name}`,
        text: t,
        past: (form?.past_history ?? {}) as Record<string, string>,
        family: (form?.family_history ?? {}) as FamilyMap,
        psych: (form?.psychological ?? {}) as PsychMap,
        ros: (form?.review_of_system ?? {}) as RosMap,
    };

    const backHref = `${BASE}?student=${encodeURIComponent(student.student_number)}`;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Student Health Form
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Student&apos;s Health Record</h1>
                <p className="mt-1 text-gray-600">
                    {student.last_name}, {student.first_name} · {student.student_number}
                </p>
            </div>

            <StudentHealthFormEditor values={values} cancelHref={backHref} />
        </main>
    );
}