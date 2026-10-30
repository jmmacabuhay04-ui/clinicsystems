// "Log Clinic Visit" page na ginagamit ng dalawang URL:
//   /dashboard/student-health-records/new   (Student)
//   /dashboard/employee-health-records/new  (Employee)
// Magkaiba ang URL para tama ang naka-highlight sa sidebar.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import RecordForm, { type PersonOption, type PersonType } from "./record-form";
import { staffDisplayName } from "@/lib/display-name";

const BASES: Record<PersonType, string> = {
    student: "/dashboard/student-health-records",
    employee: "/dashboard/employee-health-records",
};

type Props = {
    type: PersonType;
    /** Student o employee number na naka-preset (galing sa ?student= o ?employee=). */
    person: string;
};

export default async function LogVisitPage({ type, person }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const base = BASES[type];
    if (!canManageRecords(session.role)) redirect(base);

    const now = new Date();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);
    const nowTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(now);

    // Attending staff = Display Name sa Settings (hal. "Mclife"); kung wala pa, galing sa email
    const me = await prisma.user
        .findUnique({ where: { user_id: session.userId }, select: { full_name: true } })
        .catch(() => null);
    const staffName = staffDisplayName(me?.full_name, String(session.username ?? ""), String(session.role ?? ""));

    // Galing sa health record ng isang tao: babalik doon. Kung hindi: babalik sa Dashboard.
    const backHref = person ? `${base}?${type}=${encodeURIComponent(person)}` : "/dashboard";
    const backLabel = person ? "Back to Health Record" : "Back to Dashboard";

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
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Log Clinic Visit</h1>
                    <p className="text-sm text-gray-600">Record a new clinic visit for a student or employee.</p>
                </div>
            </div>

            <RecordForm
                key={type}
                defaultType={type}
                studentNumber={person}
                today={today}
                nowTime={nowTime}
                staffName={staffName}
                cancelHref={backHref}
                students={students}
                employees={employees}
            />
        </main>
    );
}