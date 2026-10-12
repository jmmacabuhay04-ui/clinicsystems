import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, ArrowLeft, Briefcase, ClipboardPlus, GraduationCap, Pencil, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageDental } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import ConfirmLink from "@/components/confirm-link";
import { archiveDental } from "./actions";

const BASE = "/dashboard/dental-records";

type DentalRow = {
    dental_id: number;
    visit_date: Date;
    procedure_name: string;
    tooth: string | null;
    dentist_name: string | null;
    status: string;
    patient_type: "student" | "employee";
    patient_number: string;
    last_name: string;
    first_name: string;
};

type Props = {
    searchParams: Promise<{ q?: string; student?: string; employee?: string; view?: string }>;
};

function fmt(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}
function orDash(value: string | null | undefined) {
    return value === null || value === undefined || value.trim() === "" ? "—" : value;
}

function RecordTable({
    title,
    icon,
    numberLabel,
    rows,
    canEdit,
    subtitle,
}: {
    title: string;
    icon: React.ReactNode;
    numberLabel: string;
    rows: DentalRow[];
    canEdit: boolean;
    subtitle?: string;
}) {
    return (
        <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#15664f]">
                    {icon}
                    {title} ({rows.length})
                </h2>
                {subtitle && <p className="text-sm text-gray-900">{subtitle}</p>}
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {rows.length === 0 ? (
                    <p className="p-8 text-center text-md text-gray-700">No records found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#EEEEEE] text-[#15664f]">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">{numberLabel}</th>
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium">Procedure</th>
                                    <th className="px-4 py-3 font-medium">Tooth</th>
                                    <th className="px-4 py-3 font-medium">Dentist</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((d) => (
                                    <tr key={d.dental_id} className="border-t border-gray-100">
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                                            {fmt(d.visit_date)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                            {d.patient_number}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900">
                                            {d.last_name}, {d.first_name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900">{d.procedure_name}</td>
                                        <td className="px-4 py-3 text-gray-700">{orDash(d.tooth)}</td>
                                        <td className="px-4 py-3 text-gray-700">{orDash(d.dentist_name)}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${d.status === "follow-up"
                                                    ? "bg-amber-300 text-white"
                                                    : "bg-[#15664f]  text-white"
                                                    }`}
                                            >
                                                {d.status === "follow-up" ? "Follow-up" : "Completed"}
                                            </span>
                                        </td>
                                        {canEdit && (
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <ConfirmLink
                                                        href={`${BASE}/edit?record=${d.dental_id}`}
                                                        title="Edit dental record"
                                                        message={`Edit this dental record (${d.procedure_name}) of ${d.first_name} ${d.last_name}?`}
                                                        confirmLabel="Edit"
                                                        icon={<Pencil className="h-5 w-5" />}
                                                        className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Edit
                                                    </ConfirmLink>
                                                    <form action={archiveDental}>
                                                        <input type="hidden" name="dentalId" value={d.dental_id} />
                                                        <ConfirmButton
                                                            title="Archive dental record"
                                                            confirmLabel="Archive"
                                                            message={`Archive this dental record (${d.procedure_name}) of ${d.first_name} ${d.last_name}? It will move to Archive Records.`}
                                                            className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                                                        >
                                                            <Archive className="h-3.5 w-3.5" />
                                                            Archive
                                                        </ConfirmButton>
                                                    </form>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}

export default async function DentalRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageDental(session.role);

    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const like = `%${q}%`;

    // ?student=<no> or ?employee=<no> with ?view=history (from the dashboard
    // View button) shows only that one person's dental records.
    const patientKind = params.student ? "student" : params.employee ? "employee" : "";
    const patientNumber = (params.student || params.employee || "").trim();
    const historyOnly = (params.view ?? "") === "history" && patientNumber !== "";

    const records = await prisma.$queryRaw<DentalRow[]>`
    SELECT d.dental_id, d.visit_date, d.procedure_name, d.tooth, d.dentist_name, d.status,
           CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
           COALESCE(s.student_number, e.employee_number) AS patient_number,
           COALESCE(s.last_name, e.last_name) AS last_name,
           COALESCE(s.first_name, e.first_name) AS first_name
    FROM dental_records d
    LEFT JOIN students s ON s.student_id = d.student_id
    LEFT JOIN employees e ON e.employee_id = d.employee_id
    WHERE d.archived_at IS NULL
      AND (${q}::text = ''
        OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
        OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
        OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
        OR d.procedure_name ILIKE ${like})
      AND (${patientNumber}::text = ''
        OR COALESCE(s.student_number, e.employee_number) = ${patientNumber})
      AND (${patientKind}::text = ''
        OR CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END = ${patientKind})
    ORDER BY d.visit_date DESC, d.dental_id DESC
    LIMIT 300
  `;

    const studentRows = records.filter((r) => r.patient_type === "student");
    const employeeRows = records.filter((r) => r.patient_type === "employee");

    const patientName = records[0]
        ? `${records[0].last_name}, ${records[0].first_name} (${records[0].patient_number})`
        : patientNumber;

    return (
        <main className="space-y-8 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-[#15664f]">Dental Records</h1>
                </div>

                {canEdit ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="Add dental record"
                        message="Add a new dental record for a student or employee?"
                        confirmLabel="Continue"
                        icon={<ClipboardPlus className="h-5 w-5" />}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                    >
                        <ClipboardPlus className="h-4 w-4" />
                        Add Dental Record
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            {historyOnly && (
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                </Link>
            )}

            {!historyOnly && (
                <form method="get" action={BASE} className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        name="q"
                        defaultValue={q}
                        autoComplete="off"
                        placeholder="Search by name, ID number, or procedure..."
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                    />
                </form>
            )}

            {(!historyOnly || patientKind === "student") && (
                <RecordTable
                    title="Student Dental Records"
                    icon={<GraduationCap className="h-5 w-5 text-[#15664f]" />}
                    numberLabel="Student No."
                    rows={studentRows}
                    canEdit={canEdit}
                    subtitle={historyOnly ? patientName : undefined}
                />
            )}

            {(!historyOnly || patientKind === "employee") && (
                <RecordTable
                    title="Employee Dental Records"
                    icon={<Briefcase className="h-5 w-5 text-[#15664f]" />}
                    numberLabel="Employee No."
                    rows={employeeRows}
                    canEdit={canEdit}
                    subtitle={historyOnly ? patientName : undefined}
                />
            )}
        </main>
    );
}