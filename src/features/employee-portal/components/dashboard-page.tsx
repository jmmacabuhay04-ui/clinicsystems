import { redirect } from "next/navigation";
import { CalendarDays, ChevronRight, FileText, Lock, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import EmployeeNav from "@/components/layout/employee-nav";
import CaseReportTable from "@/features/case-reports/components/case-report-table";
import {
    getEmployee,
    getEmployeeVisits,
    getEmployeeDental,
    formatDate,
    initialsOf,
} from "@/features/employee-portal/data";

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
function DateBlock({ date, tint }: { date: Date; tint: string }) {
    const d = new Date(date);
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
    return (
        <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg ${tint}`}>
            <span className="text-[10px] font-bold tracking-wide">{month}</span>
            <span className="text-xl font-bold leading-none">{day}</span>
        </div>
    );
}

function SectionHeader({
    icon,
    title,
    href,
}: {
    icon: React.ReactNode;
    title: string;
    href: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 p-5 pb-4">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                    {icon}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <a
                href={href}
                className="inline-flex items-center gap-0.5 text-sm font-semibold text-[#15664f] hover:underline"
            >
                View all
                <ChevronRight className="h-4 w-4" />
            </a>
        </div>
    );
}

export default async function EmployeeDashboardPage() {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employee = await getEmployee(session.employeeId);
    if (!employee) redirect("/employee/login");

    const visits = await getEmployeeVisits(employee.employee_id);
    const dental = await getEmployeeDental(employee.employee_id);

    const fullName = `${employee.first_name} ${employee.last_name}`;
    const allDates = [
        ...visits.map((v) => v.visit_date),
        ...dental.map((r) => r.visit_date),
    ].filter(Boolean);
    const lastVisit = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    // Bilang ng health case reports (kapalit ng Latest Blood Pressure)
    const caseRows = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM health_case_reports
      WHERE employee_id = ${employee.employee_id} AND archived_at IS NULL
    `;
    const caseCount = caseRows[0]?.total ?? 0;

    const todayText = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date());

    const subline = [employee.employee_number, employee.position, employee.department].filter(Boolean).join(" · ");

    const stats = [
        { label: "Clinic Visits", value: String(visits.length), icon: <Stethoscope className="h-5 w-5" />, tint: "bg-[#eef6f2] text-[#15664f]" },
        { label: "Dental Visits", value: String(dental.length), icon: <ToothIcon className="h-5 w-5" />, tint: "bg-cyan-50 text-cyan-700" },
        { label: "Case Reports", value: String(caseCount), icon: <FileText className="h-5 w-5" />, tint: "bg-amber-100 text-amber-700" },
        { label: "Last Visit", value: lastVisit ? formatDate(lastVisit, "short") : "—", icon: <CalendarDays className="h-5 w-5" />, tint: "bg-rose-50 text-rose-600", small: true },
    ];

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <EmployeeNav fullName={fullName} initials={initialsOf(employee.first_name, employee.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-4 pb-10 md:p-6">
                {/* Welcome banner */}
                <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#15664f] to-[#0f4d3b] p-6 text-white shadow-lg shadow-[#15664f]/20 md:p-8">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/5" />

                    {/* Phone: nasa ilalim ang petsa. sm pataas: nasa kanan */}
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center md:gap-5">
                        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-5">
                            {employee.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={employee.avatar}
                                    alt=""
                                    className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-amber-300 md:h-20 md:w-20"
                                />
                            ) : (
                                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-300 text-2xl font-bold text-gray-900 ring-4 ring-white/25 md:h-20 md:w-20">
                                    {initialsOf(employee.first_name, employee.last_name)}
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-white/80 md:text-base">Welcome back,</p>
                                <p className="break-words text-2xl font-bold sm:text-3xl md:text-4xl">{employee.first_name}!</p>
                                {subline && <p className="mt-1 text-sm text-white/80">{subline}</p>}
                            </div>
                        </div>
                        <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium sm:text-sm">
                            <CalendarDays className="h-4 w-4" />
                            {todayText}
                        </span>
                    </div>
                </section>

                {/* Stat cards */}
                <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                    {stats.map((s) => (
                        <div key={s.label} className={`${card} flex min-w-0 items-center gap-3 p-4 md:p-5`}>
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${s.tint}`}>
                                {s.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-600 md:text-sm">{s.label}</p>
                                <p
                                    className={`truncate font-bold text-gray-900 ${s.small ? "text-base md:text-lg" : "text-2xl"}`}
                                >
                                    {s.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Visits */}
                    <section className={`${card} min-w-0 self-start overflow-hidden`}>
                        <SectionHeader icon={<Stethoscope className="h-5 w-5" />} title="Recent Visits" href="/employee/visits" />
                        {visits.length === 0 ? (
                            <div className="flex flex-col items-center border-t border-gray-100 p-8 text-center">
                                <Stethoscope className="h-10 w-10 text-[#15664f]/30" />
                                <p className="mt-2 text-sm text-gray-500">No clinic visits recorded yet.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 border-t border-gray-100">
                                {visits.slice(0, 3).map((v) => (
                                    <li key={v.record_id} className="flex items-center gap-4 px-5 py-4">
                                        <DateBlock date={v.visit_date} tint="bg-[#eef6f2] text-[#15664f]" />
                                        <div className="min-w-0 flex-1">
                                            <p className="break-words font-semibold capitalize text-gray-900">{v.complaint}</p>
                                            <p className="text-xs text-gray-500">{formatDate(v.visit_date)}</p>
                                            {v.attending_staff && (
                                                <p className="mt-0.5 break-words text-sm text-gray-600">Seen by {v.attending_staff}</p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Recent Dental Visits */}
                    <section className={`${card} min-w-0 self-start overflow-hidden`}>
                        <SectionHeader icon={<ToothIcon className="h-5 w-5" />} title="Recent Dental Visits" href="/employee/dental" />
                        {dental.length === 0 ? (
                            <div className="flex flex-col items-center border-t border-gray-100 p-8 text-center">
                                <ToothIcon className="h-10 w-10 text-[#15664f]/30" />
                                <p className="mt-2 text-sm text-gray-500">No dental visits recorded yet.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 border-t border-gray-100">
                                {dental.slice(0, 3).map((r) => (
                                    <li key={r.dental_id} className="flex items-center gap-4 px-5 py-4">
                                        <DateBlock date={r.visit_date} tint="bg-cyan-50 text-cyan-700" />
                                        <div className="min-w-0 flex-1">
                                            <p className="break-words font-semibold capitalize text-gray-900">{r.procedure_name}</p>
                                            <p className="text-xs text-gray-500">{formatDate(r.visit_date)}</p>
                                            {r.dentist_name && (
                                                <p className="break-words text-sm text-gray-600">Dentist: {r.dentist_name}</p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                <CaseReportTable patientType="employee" patientId={employee.employee_id} limit={3} viewAllHref="/employee/case-reports" />

                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-600">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    Your records are private and only visible to you and authorized clinic staff.
                </p>
            </main>
        </div>
    );
}