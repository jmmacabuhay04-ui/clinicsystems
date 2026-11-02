import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import DentalForm, { type DentalValues, type PersonOption } from "./dental-form";
import { prisma } from "@/lib/prisma";
import { examinerName } from "@/features/dental-health-form/chart-data";

const BASE = "/dashboard/dental-records";

/**
 * Dentist at Nurse LANG ang puwedeng gumawa, mag-edit, mag-archive o magbura
 * ng dental record. Hindi kasama ang Doctor. Sinusuri dito mismo (hindi lang
 * sa permissions) para siguradong hindi makakalusot.
 */
function isDentalEditor(role: unknown) {
    const r = String(role ?? "").trim().toLowerCase();
    return r === "dentist" || r === "nurse";
}


type Props = {
    /** Galing sa ⋮ ng Dental Records: naka-pili na ang pasyente (?student= o ?employee=) */
    searchParams: Promise<{ student?: string; employee?: string }>;
};

export default async function NewDentalRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!isDentalEditor(session.role)) redirect(BASE);

    const params = await searchParams;
    const presetEmployee = (params.employee ?? "").trim().slice(0, 20);
    const presetStudent = (params.student ?? "").trim().slice(0, 20);

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
        patientType: presetEmployee ? "employee" : "student",
        patientNumber: presetEmployee || presetStudent,
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
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Add Dental Record</h1>
                    <p className="text-sm text-gray-600">Record a dental procedure for a student or employee.</p>
                </div>
            </div>

            <DentalForm mode="create" record={empty} cancelHref={BASE} students={students} employees={employees} />
        </main>
    );
}