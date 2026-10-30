import { redirect } from "next/navigation";
import { CalendarDays, ChevronDown, ClipboardCheck, FileText, Hash, NotebookPen, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import EmployeeNav from "@/components/layout/employee-nav";
import { getEmployee, formatDate, initialsOf } from "@/features/employee-portal/data";

// Kapareho ng itsura ng My Visits at Dental: listahan ng card na puwedeng buksan para sa detalye.

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

type CaseRow = {
    case_id: number;
    case_number: string;
    complaint: string;
    report_date: Date;
    staff_name: string | null;
    status: string;
    notes: string | null;
    action_taken: string | null;
};

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    referred: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
};

function StatusPill({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold capitalize ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
                }`}
        >
            {status}
        </span>
    );
}

// Maliit na kahon ng petsa: "OCT" sa itaas, "22" sa ilalim
function DateBlock({ date }: { date: Date }) {
    const d = new Date(date);
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
    return (
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <span className="text-sm font-semibold tracking-wide">{month}</span>
            <span className="text-xl font-bold leading-none">{day}</span>
        </div>
    );
}

export default async function EmployeeCaseReportsPage() {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const person = await getEmployee(Number(session.employeeId));
    if (!person) redirect("/employee/login");

    const fullName = `${person.first_name} ${person.last_name}`;

    const cases = await prisma.$queryRaw<CaseRow[]>`
      SELECT case_id, case_number, complaint, report_date, staff_name, status, notes, action_taken
      FROM health_case_reports
      WHERE employee_id = ${person.employee_id} AND archived_at IS NULL
      ORDER BY report_date DESC, case_id DESC
    `;

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <EmployeeNav fullName={fullName} initials={initialsOf(person.first_name, person.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-4 pb-10 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Case Reports</h1>
                            <p className="text-sm text-gray-600">Health cases recorded for you by the clinic.</p>
                        </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#15664f] ring-2 ring-[#cfe5d9]">
                        {cases.length} case{cases.length === 1 ? "" : "s"}
                    </span>
                </div>

                {cases.length === 0 && (
                    <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-12 text-center">
                        <FileText className="h-12 w-12 text-[#15664f]/30" />
                        <p className="mt-3 font-semibold text-gray-800">No case reports yet</p>
                        <p className="mt-1 text-sm text-gray-600">Health cases recorded by the clinic will appear here.</p>
                    </div>
                )}

                <div className="space-y-3">
                    {cases.map((c) => (
                        <details key={c.case_id} className={`${card} group overflow-hidden`}>
                            <summary className="flex cursor-pointer list-none items-center gap-4 p-4 hover:bg-[#f6faf8] md:p-5 [&::-webkit-details-marker]:hidden">
                                <DateBlock date={c.report_date} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="break-words font-semibold capitalize text-gray-900">{c.complaint}</p>
                                        <StatusPill status={c.status} />
                                    </div>
                                    <p className="text-sm text-gray-600">{formatDate(c.report_date)}</p>
                                    {c.staff_name && <p className="break-words text-sm text-gray-600">Seen by {c.staff_name}</p>}
                                </div>
                                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#15664f]">
                                    <span className="hidden sm:inline group-open:hidden">View details</span>
                                    <span className="hidden sm:group-open:inline">Hide</span>
                                    <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                                </span>
                            </summary>

                            <div className="space-y-4 border-t border-gray-100 p-4 md:p-5">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="flex items-start gap-3 rounded-lg bg-[#f6faf8] p-3">
                                        <Hash className="mt-0.5 h-4 w-4 shrink-0 text-[#15664f]" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-600">Case No.</p>
                                            <p className="font-semibold text-gray-900">{c.case_number}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-lg bg-[#f6faf8] p-3">
                                        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#15664f]" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-600">Attending Staff</p>
                                            <p className="break-words font-semibold text-gray-900">{c.staff_name || "—"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-lg bg-[#f6faf8] p-3">
                                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#15664f]" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-600">Report Date</p>
                                            <p className="font-semibold text-gray-900">{formatDate(c.report_date, "short")}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                                            <ClipboardCheck className="h-4 w-4 text-[#15664f]" />
                                            Action Taken
                                        </p>
                                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-900">{c.action_taken || "—"}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                                            <NotebookPen className="h-4 w-4 text-[#15664f]" />
                                            Notes
                                        </p>
                                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-900">{c.notes || "—"}</p>
                                    </div>
                                </div>
                            </div>
                        </details>
                    ))}
                </div>
            </main>
        </div>
    );
}