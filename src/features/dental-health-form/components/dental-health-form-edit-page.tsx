import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageDentalForm } from "@/lib/permissions";
import DentalHealthFormEditor, { type DentalFormValues } from "./form-editor";
import { type ChartMap } from "./tooth-grid";
import { examinerName } from "@/features/dental-health-form/chart-data";

const BASE = "/dashboard/dental-health-form";

type StudentRow = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
    date_of_birth: Date | null;
    gender: string | null;
};

type FormRow = {
    level: string | null;
    section: string | null;
    age: number | null;
    sex: string | null;
    chart: ChartMap | null;
    periodontal: Record<string, boolean> | null;
    occlusion: Record<string, boolean> | null;
    treatment: Record<string, boolean> | null;
    remarks: string | null;
    exam_date: Date | null;
    examined_by: string | null;
};

type Props = {
    searchParams: Promise<{ student?: string }>;
};

function ageFrom(dob: Date | null) {
    if (!dob) return "";
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getUTCFullYear() - birth.getUTCFullYear();
    const beforeBirthday =
        now.getUTCMonth() < birth.getUTCMonth() ||
        (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
    if (beforeBirthday) age -= 1;
    return age > 0 && age < 120 ? String(age) : "";
}

export default async function EditDentalHealthFormPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageDentalForm(session.role)) redirect(BASE);

    const { student: studentNumber = "" } = await searchParams;
    if (!studentNumber) notFound();

    const students = await prisma.$queryRaw<StudentRow[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           grade_level, program, date_of_birth, gender
    FROM students
    WHERE student_number = ${studentNumber}
    LIMIT 1
  `;
    const student = students[0];
    if (!student) notFound();

    const forms = await prisma.$queryRaw<FormRow[]>`
    SELECT level, section, age, sex, chart, periodontal, occlusion, treatment,
           remarks, exam_date, examined_by
    FROM dental_health_forms
    WHERE student_id = ${student.student_id}
    LIMIT 1
  `;
    const form = forms[0];

    const me = await prisma.$queryRaw<{ full_name: string | null; username: string }[]>`
    SELECT full_name, username FROM users WHERE user_id = ${session.userId} LIMIT 1
  `;
    const onDuty = examinerName(
        me[0]?.full_name ?? null,
        me[0]?.username ?? session.username
    );

    const middle = student.middle_name ? ` ${student.middle_name}` : "";

    const values: DentalFormValues = {
        studentNumber: student.student_number,
        studentName: `${student.first_name}${middle} ${student.last_name}`,
        dateOfBirth: student.date_of_birth
            ? new Date(student.date_of_birth).toISOString().slice(0, 10)
            : "",
        level: form?.level ?? student.grade_level ?? "",
        section: form?.section ?? student.program ?? "",
        age: form?.age != null ? String(form.age) : ageFrom(student.date_of_birth),
        sex: form?.sex ?? student.gender ?? "",
        chart: form?.chart ?? {},
        periodontal: form?.periodontal ?? {},
        occlusion: form?.occlusion ?? {},
        treatment: form?.treatment ?? {},
        remarks: form?.remarks ?? "",
        examDate: form?.exam_date
            ? new Date(form.exam_date).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        examinedBy: onDuty,
    };

    const backHref = `${BASE}?student=${encodeURIComponent(student.student_number)}`;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dental Health Form
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                    Student&apos;s Dental Health Record
                </h1>
                <p className="mt-1 text-gray-600">
                    {student.last_name}, {student.first_name} · {student.student_number}
                </p>
            </div>

            <DentalHealthFormEditor values={values} cancelHref={backHref} />
        </main>
    );
}