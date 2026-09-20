import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import HealthDeclarationEditor, { type DeclarationValues } from "../form-editor";

const BASE = "/dashboard/health-declaration";

type StudentRow = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
};

type FormRow = Record<string, unknown>;

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

export default async function EditHealthDeclarationPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    const { student: studentNumber = "" } = await searchParams;
    if (!studentNumber) notFound();

    const students = await prisma.$queryRaw<StudentRow[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           grade_level, program
    FROM students
    WHERE student_number = ${studentNumber}
    LIMIT 1
  `;
    const student = students[0];
    if (!student) notFound();

    const rows = await prisma.$queryRaw<FormRow[]>`
    SELECT * FROM health_declarations WHERE student_id = ${student.student_id} LIMIT 1
  `;
    const form = rows[0];

    const fallbackSection = [student.grade_level, student.program]
        .filter(Boolean)
        .join(" - ");

    const t: Record<string, string> = {
        schoolYear: text(form?.school_year),
        gradeSection: text(form?.grade_section) || fallbackSection,
        residenceAddress: text(form?.residence_address),
        emergencyName: text(form?.emergency_name),
        emergencyRelationship: text(form?.emergency_relationship),
        emergencyNumbers: text(form?.emergency_numbers),
        goingHome: text(form?.going_home),
        goingHomeOther: text(form?.going_home_other),
        symptomNotes: text(form?.symptom_notes),
        medicines: text(form?.medicines),
        certifiedBy: text(form?.certified_by),
        declarationDate: dateStr(form?.declaration_date) || new Date().toISOString().slice(0, 10),
    };

    const middle = student.middle_name ? ` ${student.middle_name}` : "";

    const values: DeclarationValues = {
        studentNumber: student.student_number,
        studentName: `${student.first_name}${middle} ${student.last_name}`,
        text: t,
        symptoms: (form?.symptoms ?? {}) as Record<string, boolean>,
        vaccinationSubmitted: Boolean(form?.vaccination_submitted),
        medicalCertSubmitted: Boolean(form?.medical_cert_submitted),
    };

    const backHref = `${BASE}?student=${encodeURIComponent(student.student_number)}`;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Health Declaration
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                    Student Information and Health Status Declaration
                </h1>
                <p className="mt-1 text-gray-600">
                    {student.last_name}, {student.first_name} · {student.student_number}
                </p>
            </div>

            <HealthDeclarationEditor values={values} cancelHref={backHref} />
        </main>
    );
}