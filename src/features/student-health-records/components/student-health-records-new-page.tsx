import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import RecordForm, { type PersonOption } from "./record-form";

type Props = {
    searchParams: Promise<{ student?: string }>;
};

export default async function NewHealthRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect("/dashboard/student-health-records");

    const { student = "" } = await searchParams;

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    const localPart = session.username.split("@")[0];
    const staffName = localPart.charAt(0).toUpperCase() + localPart.slice(1);

    // Galing sa health record ng estudyante: doon babalik. Kung hindi, sa dashboard.
    const backHref = student
        ? `/dashboard/student-health-records?student=${encodeURIComponent(student)}`
        : "/dashboard";
    const backLabel = student ? "Back to Health Record" : "Back to Dashboard";

    // Para sa "Search by name or number" na dropdown.
    const [students, employees] = await Promise.all([
        prisma.$queryRaw<PersonOption[]>`
      SELECT student_number AS number, last_name || ', ' || first_name AS name
      FROM students WHERE archived_at IS NULL
      ORDER BY last_name, first_name
    `,
        prisma.$queryRaw<PersonOption[]>`
      SELECT employee_number AS number, last_name || ', ' || first_name AS name
      FROM employees WHERE archived_at IS NULL
      ORDER BY last_name, first_name
    `,
    ]);

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
            </Link>

            <div className="flex items-center gap-3">
                <Stethoscope className="h-10 w-10 shrink-0 text-[#15664f]" />
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Log Clinic Visit</h1>
                    <p className="text-sm text-gray-600">Record a new clinic visit for a student or employee.</p>
                </div>
            </div>

            <RecordForm
                studentNumber={student}
                today={today}
                staffName={staffName}
                cancelHref={backHref}
                students={students}
                employees={employees}
            />
        </main>
    );
}