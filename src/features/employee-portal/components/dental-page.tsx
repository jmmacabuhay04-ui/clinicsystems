import { redirect } from "next/navigation";
import { CheckCircle2, ChevronDown, Clock, NotebookPen, UserRound } from "lucide-react";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import EmployeeNav from "@/components/layout/employee-nav";
import { getEmployee, getEmployeeDental, formatDate, initialsOf } from "@/features/employee-portal/data";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

function ToothIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M7 3c-2.2 0-4 1.8-4 4.2 0 2 .8 3.3 1.5 4.6.6 1.2.9 2.6 1.1 4.2.3 2.4.8 5 2.4 5 1.3 0 1.6-1.8 2-3.6.3-1.4.8-2.4 2-2.4s1.7 1 2 2.4c.4 1.8.7 3.6 2 3.6 1.6 0 2.1-2.6 2.4-5 .2-1.6.5-3 1.1-4.2.7-1.3 1.5-2.6 1.5-4.6C21 4.8 19.2 3 17 3c-1.9 0-2.9 1-5 1S8.9 3 7 3z" />
        </svg>
    );
}

// Maliit na kahon ng petsa: "OCT" sa itaas, "15" sa ilalim
function DateBlock({ date }: { date: Date }) {
    const d = new Date(date);
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
    return (
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <span className="text-[10px] font-bold tracking-wide">{month}</span>
            <span className="text-xl font-bold leading-none">{day}</span>
        </div>
    );
}

export default async function EmployeeDentalPage() {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employee = await getEmployee(Number(session.employeeId));
    if (!employee) redirect("/employee/login");

    const records = await getEmployeeDental(employee.employee_id);
    const fullName = `${employee.first_name} ${employee.last_name}`;

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <EmployeeNav fullName={fullName} initials={initialsOf(employee.first_name, employee.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-4 pb-10 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <ToothIcon className="h-10 w-10 shrink-0 text-[#15664f]" />
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Dental Records</h1>
                            <p className="text-sm text-gray-600">Your dental procedures and the dentist&apos;s notes.</p>
                        </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#15664f] ring-2 ring-[#cfe5d9]">
                        {records.length} record{records.length === 1 ? "" : "s"}
                    </span>
                </div>

                {records.length === 0 && (
                    <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-12 text-center">
                        <ToothIcon className="h-12 w-12 text-[#15664f]/30" />
                        <p className="mt-3 font-semibold text-gray-800">No dental visits yet</p>
                        <p className="mt-1 text-sm text-gray-500">Your dental records will appear here after your visit.</p>
                    </div>
                )}

                <div className="space-y-3">
                    {records.map((r) => {
                        const followUp = r.status === "follow-up";
                        return (
                            <details key={r.dental_id} className={`${card} group overflow-hidden`}>
                                <summary className="flex cursor-pointer list-none items-center gap-4 p-4 hover:bg-[#f6faf8] md:p-5 [&::-webkit-details-marker]:hidden">
                                    <DateBlock date={r.visit_date} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="break-words font-semibold capitalize text-gray-900">{r.procedure_name}</p>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${followUp ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
                                                    }`}
                                            >
                                                {followUp ? "Follow-up" : "Completed"}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{formatDate(r.visit_date)}</p>
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
                                            <ToothIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#15664f]" />
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-600">Tooth</p>
                                                <p className="break-words font-semibold text-gray-900">{r.tooth || "—"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 rounded-lg bg-[#f6faf8] p-3">
                                            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#15664f]" />
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-600">Attending Dentist</p>
                                                <p className="break-words font-semibold text-gray-900">{r.dentist_name || "—"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 rounded-lg bg-[#f6faf8] p-3">
                                            {followUp ? (
                                                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                            ) : (
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-600">Status</p>
                                                <p className="font-semibold text-gray-900">{followUp ? "Follow-up" : "Completed"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            <NotebookPen className="h-4 w-4 text-[#15664f]" />
                                            Notes
                                        </p>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{r.notes || "—"}</p>
                                    </div>
                                </div>
                            </details>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}