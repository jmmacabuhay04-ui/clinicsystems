import { redirect } from "next/navigation";
import { CalendarDays, ChevronDown, ClipboardCheck, Stethoscope, UserRound } from "lucide-react";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import EmployeeNav from "@/components/layout/employee-nav";
import { getEmployee, getEmployeeVisits, formatDate, initialsOf } from "@/features/employee-portal/data";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

// Maliit na kahon ng petsa: "OCT" sa itaas, "15" sa ilalim
function DateBlock({ date }: { date: Date }) {
    const d = new Date(date);
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
    return (
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
            <span className="text-[10px] font-bold tracking-wide">{month}</span>
            <span className="text-xl font-bold leading-none">{day}</span>
        </div>
    );
}

export default async function EmployeeVisitsPage() {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employee = await getEmployee(Number(session.employeeId));
    if (!employee) redirect("/employee/login");

    const visits = await getEmployeeVisits(employee.employee_id);
    const fullName = `${employee.first_name} ${employee.last_name}`;

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <EmployeeNav fullName={fullName} initials={initialsOf(employee.first_name, employee.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-4 pb-10 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Stethoscope className="h-10 w-10 shrink-0 text-[#15664f]" />
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">My Visits</h1>
                            <p className="text-sm text-gray-600">Your clinic visits and the care you received.</p>
                        </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#15664f] ring-2 ring-[#cfe5d9]">
                        {visits.length} visit{visits.length === 1 ? "" : "s"}
                    </span>
                </div>

                {visits.length === 0 && (
                    <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-12 text-center">
                        <Stethoscope className="h-12 w-12 text-[#15664f]/30" />
                        <p className="mt-3 font-semibold text-gray-800">No clinic visits yet</p>
                        <p className="mt-1 text-sm text-gray-500">Your visits will appear here after you are seen at the clinic.</p>
                    </div>
                )}

                <div className="space-y-3">
                    {visits.map((v) => (
                        <details key={v.record_id} className={`${card} group overflow-hidden`}>
                            <summary className="flex cursor-pointer list-none items-center gap-4 p-4 hover:bg-[#f6faf8] md:p-5 [&::-webkit-details-marker]:hidden">
                                <DateBlock date={v.visit_date} />
                                <div className="min-w-0 flex-1">
                                    <p className="break-words font-semibold capitalize text-gray-900">{v.complaint}</p>
                                    <p className="text-sm text-gray-600">{formatDate(v.visit_date)}</p>
                                    {v.attending_staff && (
                                        <p className="break-words text-xs text-gray-500">Seen by {v.attending_staff}</p>
                                    )}
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
                                        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-[#15664f]" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-600">Complaint</p>
                                            <p className="break-words font-semibold capitalize text-gray-900">{v.complaint || "—"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-lg bg-[#f6faf8] p-3">
                                        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#15664f]" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-600">Attending Staff</p>
                                            <p className="break-words font-semibold text-gray-900">{v.attending_staff || "—"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-lg bg-[#f6faf8] p-3">
                                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#15664f]" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-600">Visit Date</p>
                                            <p className="font-semibold text-gray-900">{formatDate(v.visit_date, "short")}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-200 p-4">
                                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <ClipboardCheck className="h-4 w-4 text-[#15664f]" />
                                        Action Taken
                                    </p>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{v.action_taken || "—"}</p>
                                </div>
                            </div>
                        </details>
                    ))}
                </div>
            </main>
        </div>
    );
}