import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import StudentForm, { type StudentValues } from "./student-form";

const BASE = "/dashboard/student-health-records";

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
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
            </Link>

            <h1 className="text-3xl font-semibold text-gray-900">Add Student</h1>

            <StudentForm mode="create" student={empty} cancelHref={BASE} />
        </main>
    );
}