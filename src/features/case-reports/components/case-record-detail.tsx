import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardCheck, ClipboardList, NotebookPen, Pencil, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ConfirmLink from "@/components/shared/confirm-link";

// "Case Report Record": kapareho ng itsura ng Dental Visit Record
// (header + Edit Record, card ng pasyente na may petsa, at dalawang card ng detalye).

type DetailRow = {
    case_id: number;
    case_number: string;
    report_date: Date;
    report_time: string | null;
    complaint: string;
    action_taken: string | null;
    staff_name: string | null;
    status: string;
    notes: string | null;
    patient_type: "student" | "employee";
    patient_number: string;
    last_name: string;
    first_name: string;
    avatar: string | null;
    from_visit: boolean;
};

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

const STATUS: Record<string, { label: string; pill: string; dot: string }> = {
    pending: { label: "Pending", pill: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
    referred: { label: "Referred", pill: "bg-red-100 text-red-700", dot: "bg-red-500" },
    resolved: { label: "Resolved", pill: "bg-green-100 text-green-700", dot: "bg-green-500" },
};

function orDash(value: string | null | undefined) {
    return value === null || value === undefined || value.trim() === "" ? "—" : value;
}

function to12Hour(value: string | null) {
    if (!value) return "";
    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h)) return "";
    const suffix = h >= 12 ? "PM" : "AM";
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

export default async function CaseRecordDetail({
    caseId,
    canEdit,
    backHref = "/dashboard",
}: {
    caseId: number;
    canEdit: boolean;
    backHref?: string;
}) {
    const rows = await prisma.$queryRaw<DetailRow[]>`
    SELECT c.case_id, c.case_number, c.report_date, to_char(c.report_time, 'HH24:MI') AS report_time,
           c.complaint, c.action_taken, c.staff_name, c.status, c.notes,
           CASE WHEN c.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
           COALESCE(s.student_number, e.employee_number) AS patient_number,
           COALESCE(s.last_name, e.last_name) AS last_name,
           COALESCE(s.first_name, e.first_name) AS first_name,
           COALESCE(s.avatar, e.avatar) AS avatar,
           (EXISTS (SELECT 1 FROM health_records h
                    WHERE c.student_id IS NOT NULL AND h.student_id = c.student_id
                      AND h.visit_date = c.report_date
                      AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))
            OR EXISTS (SELECT 1 FROM employee_health_records h
                    WHERE c.employee_id IS NOT NULL AND h.employee_id = c.employee_id
                      AND h.visit_date = c.report_date
                      AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))) AS from_visit
    FROM health_case_reports c
    LEFT JOIN students s ON s.student_id = c.student_id
    LEFT JOIN employees e ON e.employee_id = c.employee_id
    WHERE c.case_id = ${caseId} AND c.archived_at IS NULL
    LIMIT 1
  `;
    const c = rows[0];

    const backLink = (
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            {backHref === "/dashboard" ? "Back to dashboard" : "Back to reports"}
        </Link>
    );

    if (!c) {
        return (
            <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
                {backLink}
                <div className="rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-10 text-center text-sm text-gray-600">
                    This case report could not be found. It may have been archived.
                </div>
            </main>
        );
    }

    const isEmployee = c.patient_type === "employee";
    const fullName = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown";
    const initials = fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    const longDate = new Date(c.report_date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
    const time = to12Hour(c.report_time);
    const num = c.case_number.split("-").pop() ?? c.case_number;
    const reportId = `${c.from_visit ? "V" : "C"}-${num}`;
    const status = STATUS[c.status] ?? { label: c.status, pill: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {backLink}

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Case Report Record</h1>
                    <p className="text-sm text-gray-600">Details of this case report.</p>
                </div>
                {canEdit && (
                    <div className="flex w-full gap-2 sm:w-auto">
                        <ConfirmLink
                            href={`/dashboard/health-case-reports/edit?case=${c.case_id}`}
                            title="Edit case report"
                            message={`Edit case ${reportId} (${c.complaint}) of ${fullName}?`}
                            confirmLabel="Edit"
                            icon={<Pencil className="h-5 w-5" />}
                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] sm:flex-none"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Record
                        </ConfirmLink>
                    </div>
                )}
            </div>

            {/* Patient */}
            <section className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center`}>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    {c.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full border-2 border-white object-cover shadow" />
                    ) : (
                        <span
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white text-lg font-bold shadow ${isEmployee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                                }`}
                        >
                            {initials}
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="break-words text-lg font-semibold leading-tight text-gray-900">{fullName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${isEmployee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                                    }`}
                            >
                                {isEmployee ? "Employee" : "Student"}
                            </span>
                            <span className="whitespace-nowrap text-sm text-gray-600">{c.patient_number}</span>
                        </div>
                    </div>
                </div>
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#eef6f2] px-3 py-2 text-sm font-medium text-gray-800 sm:w-auto sm:shrink-0">
                    <CalendarDays className="h-4 w-4 shrink-0 text-[#15664f]" />
                    {longDate}
                    {time ? ` · ${time}` : ""}
                </span>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* Case details */}
                <section className={card}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                                <ClipboardCheck className="h-5 w-5" />
                            </span>
                            <h2 className="text-lg font-semibold text-gray-900">Case Details</h2>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${c.from_visit ? "bg-[#e3f1ea] text-[#15664f]" : "bg-blue-50 text-blue-700"
                                }`}
                        >
                            {reportId}
                        </span>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">Diagnosis</p>
                                <p className="mt-1 break-words text-xl font-bold capitalize text-gray-900">{c.complaint}</p>
                            </div>
                            <span
                                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${status.pill}`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                {status.label}
                            </span>
                        </div>

                        <div className="rounded-lg bg-[#f6faf8] p-4">
                            <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">Treatment / Action Taken</p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">
                                {c.action_taken?.trim() ? c.action_taken : <span className="italic text-gray-600">No action recorded.</span>}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                <UserRound className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm text-gray-600">Attending Staff</p>
                                <p className="text-sm font-semibold text-gray-900">{orDash(c.staff_name)}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Notes */}
                <section className={card}>
                    <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                            <ClipboardList className="h-5 w-5" />
                        </span>
                        <h2 className="text-lg font-semibold text-gray-900">Symptoms / Notes</h2>
                    </div>
                    <div className="p-5">
                        <div className="rounded-lg bg-[#f6faf8] p-4">
                            <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gray-600">
                                <NotebookPen className="h-3.5 w-3.5" />
                                Notes
                            </p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">
                                {c.notes?.trim() ? c.notes : <span className="italic text-gray-600">No notes recorded.</span>}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}