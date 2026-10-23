import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { canManageDental } from "@/lib/permissions";
import DentalForm, { type DentalValues, type PersonOption } from "./dental-form";
import { prisma } from "@/lib/prisma";
import { examinerName } from "@/features/dental-health-form/chart-data";

const BASE = "/dashboard/dental-records";

export default async function NewDentalRecordPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageDental(session.role)) redirect(BASE);

    const me = await prisma.$queryRaw<{ full_name: string | null; username: string }[]>`
    SELECT full_name, username FROM users WHERE user_id = ${session.userId} LIMIT 1
  `;
    // Fall back through every source so the field is never blank: the
    // formatted name, then the raw name, then the login name.
    const onDuty =
        examinerName(me[0]?.full_name ?? null, me[0]?.username ?? session.username) ||
        me[0]?.full_name ||
        me[0]?.username ||
        String(session.username ?? "");

    const empty: DentalValues = {
        patientType: "student",
        patientNumber: "",
        visitDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()),
        procedure: "",
        tooth: "",
        dentistName: onDuty,
        status: "completed",
        notes: "",
    };

    // Para sa "Search by name or number" na dropdown
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
                href="/dashboard"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
            </Link>
            <div className="flex items-center gap-3">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-10 w-10 shrink-0 text-[#15664f]"
                    aria-hidden="true"
                >
                    <path d="M7 3c-2.2 0-4 1.8-4 4.2 0 2 .8 3.3 1.5 4.6.6 1.2.9 2.6 1.1 4.2.3 2.4.8 5 2.4 5 1.3 0 1.6-1.8 2-3.6.3-1.4.8-2.4 2-2.4s1.7 1 2 2.4c.4 1.8.7 3.6 2 3.6 1.6 0 2.1-2.6 2.4-5 .2-1.6.5-3 1.1-4.2.7-1.3 1.5-2.6 1.5-4.6C21 4.8 19.2 3 17 3c-1.9 0-2.9 1-5 1S8.9 3 7 3z" />
                </svg>
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Add Dental Record</h1>
                    <p className="text-sm text-gray-600">Record a dental procedure for a student or employee.</p>
                </div>
            </div>

            <DentalForm mode="create" record={empty} cancelHref={BASE} students={students} employees={employees} />
        </main>
    );
}