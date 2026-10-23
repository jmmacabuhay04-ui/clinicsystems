import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import StudentForm from "./student-form";
import type { StudentValues } from "./student-form";

const BASE = "/dashboard/students";

const empty: StudentValues = {
    studentNumber: "",
    lastName: "",
    firstName: "",
    middleName: "",
    gradeLevel: "",
    program: "",
    dateOfBirth: "",
    gender: "",
};

export default async function NewStudentPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    return (
        <main className="min-w-0 space-y-6 p-4 pb-0 md:p-8 md:pb-0">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to students
            </Link>
            <div className="flex items-center gap-3">
                <UserPlus className="h-10 w-10 shrink-0 text-[#15664f]" />
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Add Student</h1>
                    <p className="text-sm text-gray-600">Register a new student and create their portal login.</p>
                </div>
            </div>

            <StudentForm mode="create" student={empty} cancelHref={BASE} />
        </main>
    );
}