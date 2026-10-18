import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import StudentForm, { type StudentValues } from "../student-form";

const BASE = "/dashboard/students";

type Row = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
    date_of_birth: Date | null;
    gender: string | null;
    contact_number: string | null;
    email: string | null;
};

type Props = {
    searchParams: Promise<{ student?: string }>;
};

export default async function EditStudentPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageStudents(session.role)) redirect(BASE);

    const { student: studentNumber = "" } = await searchParams;
    if (!studentNumber) notFound();

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           grade_level, program, date_of_birth, gender, contact_number, email
    FROM students
    WHERE student_number = ${studentNumber} AND archived_at IS NULL
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: StudentValues = {
        studentId: row.student_id,
        studentNumber: row.student_number,
        lastName: row.last_name,
        firstName: row.first_name,
        middleName: row.middle_name ?? "",
        gradeLevel: row.grade_level ?? "",
        program: row.program ?? "",
        dateOfBirth: row.date_of_birth
            ? new Date(row.date_of_birth).toISOString().slice(0, 10)
            : "",
        gender: row.gender ?? "",
        contactNumber: row.contact_number ?? "",
        email: row.email ?? "",
    };

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to students
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-[#15664f]">Edit Student</h1>
                <p className="mt-1 text-gray-600">
                    {row.last_name}, {row.first_name} · {row.student_number}
                </p>
            </div>

            <StudentForm mode="edit" student={values} cancelHref={BASE} />
        </main>
    );
}