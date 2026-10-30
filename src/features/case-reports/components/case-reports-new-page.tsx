import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import CaseForm, { type PersonOption } from "./case-form";
import { staffDisplayName } from "@/lib/display-name";

const BASE = "/dashboard/health-case-reports";

export default async function NewCaseReportPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    const date = new Date();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(date);
    // Oras ngayon sa Pilipinas (HH:MM, 24-hour) para sa Report Time
    const nowTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);

    // Attending staff = Display Name sa Settings (hal. "Mclife"); kung wala pa, galing sa email
    const me = await prisma.user
        .findUnique({ where: { user_id: session.userId }, select: { full_name: true } })
        .catch(() => null);
    const staffName = staffDisplayName(me?.full_name, String(session.username ?? ""), String(session.role ?? ""));

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
                href="/dashboard"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>

            <div className="flex items-center gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">New Case Report</h1>
                    <p className="text-sm text-gray-600">Record a health case for a student or employee.</p>
                </div>
            </div>

            <CaseForm
                today={today}
                nowTime={nowTime}
                staffName={staffName}
                cancelHref={BASE}
                students={students}
                employees={employees}
            />
        </main>
    );
}