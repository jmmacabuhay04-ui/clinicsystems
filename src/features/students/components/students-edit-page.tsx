import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getActiveStudent } from "../service";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canManageStudents } from "@/lib/permissions";
import StudentForm, { type StudentValues } from "./student-form";

const BASE = "/dashboard/students";

type Props = {
    searchParams: Promise<{ student?: string }>;
};

export default async function EditStudentPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageStudents(session.role)) redirect(BASE);

    const { student: studentNumber = "" } = await searchParams;
    if (!studentNumber) notFound();

    const row = await getActiveStudent(studentNumber);
    if (!row) notFound();

    // Profile picture (hiwalay na query para hindi na galawin ang repository)
    const avatarRows = await prisma.$queryRaw<{ avatar: string | null }[]>`
        SELECT avatar FROM students WHERE student_id = ${row.student_id} LIMIT 1
    `;
    const avatar = avatarRows[0]?.avatar ?? null;

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
        <main className="min-w-0 space-y-6 p-4 pb-0 md:p-8 md:pb-0">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to students
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Edit Student</h1>
                        <p className="text-sm text-gray-600">Update the student&apos;s details and portal login.</p>
                    </div>
                </div>
                {/* Kung sino ang ine-edit */}
                <div className="flex items-center gap-3 rounded-xl border-2 border-[#cfe5d9] bg-white px-3 py-2 shadow-sm">
                    {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#15664f]/30" />
                    ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#15664f] text-sm font-semibold text-white">
                            {`${row.first_name[0] ?? ""}${row.last_name[0] ?? ""}`.toUpperCase()}
                        </span>
                    )}
                    <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-semibold text-gray-900">
                            {row.last_name}, {row.first_name}
                        </p>
                        <p className="text-sm text-gray-600">{row.student_number}</p>
                    </div>
                </div>
            </div>

            <StudentForm mode="edit" student={values} cancelHref={BASE} avatar={avatar} />
        </main>
    );
}