import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/employee-session";
import CaseReportTable from "@/components/case-report-table";
import {
    getEmployee,
    getEmployeeVisits,
    getEmployeeDental,
    formatDate,
    initialsOf,
} from "@/lib/employee-data";
import EmployeeNav from "@/components/employee-nav";

export default async function EmployeeDashboardPage() {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employee = await getEmployee(session.employeeId);
    if (!employee) redirect("/employee/login");

    const visits = await getEmployeeVisits(employee.employee_id);
    const dental = await getEmployeeDental(employee.employee_id);

    const fullName = `${employee.first_name} ${employee.last_name}`;
    const latestBP = visits.find((v) => v.blood_pressure)?.blood_pressure;

    const allDates = [
        ...visits.map((v) => v.visit_date),
        ...dental.map((r) => r.visit_date),
    ].filter(Boolean);
    const lastVisit = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    const stats = [
        { label: "Total Visits", value: String(visits.length), big: true },
        { label: "Dental Visits", value: String(dental.length), big: true },
        { label: "Last Visit", value: lastVisit ? formatDate(lastVisit, "short") : "—" },
        { label: "Latest Blood Pressure", value: latestBP || "—" },
    ];

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <EmployeeNav fullName={fullName} initials={initialsOf(employee.first_name, employee.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-6">
                {/* Welcome banner */}
                <div className="rounded-xl bg-[#14532d] p-6 text-white shadow-sm">
                    <p className="text-lg text-white/200">Welcome back,</p>
                    <p className="mt-2 text-4xl font-bold">{employee.first_name}!</p>

                </div>

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((s) => (
                        <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <p className="text-sm font-medium text-[#14532d]">{s.label}</p>
                            <p
                                className={
                                    s.big
                                        ? "mt-2 text-3xl font-semibold text-[#14532D]"
                                        : "mt-2 text-lg font-semibold text-[#14532D]"
                                }
                            >
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Recent Visits */}
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[#15664f]">Recent Visits</h2>
                        <a href="/employee/visits" className="text-sm font-medium text-[#15664f] hover:underline">
                            View all
                        </a>
                    </div>

                    {visits.length === 0 ? (
                        <p className="text-sm text-gray-700">No clinic visits recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {visits.slice(0, 3).map((v) => (
                                <div key={v.record_id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                                    <p className="font-semibold text-gray-700">{formatDate(v.visit_date)}</p>
                                    <p className="mt-1 text-sm text-gray-700">
                                        {v.complaint}
                                        {v.attending_staff && ` · Seen by ${v.attending_staff}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>


                {/* Recent Dental Visits */}
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[#15664f]">Recent Dental Visits</h2>
                        <a href="/employee/dental" className="text-sm font-medium text-[#15664f] hover:underline">
                            View all
                        </a>
                    </div>

                    {dental.length === 0 ? (
                        <p className="text-sm text-gray-700">No dental visits recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {dental.slice(0, 3).map((r) => (
                                <div key={r.dental_id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                                    <p className="font-semibold text-gray-700">{formatDate(r.visit_date)}</p>
                                    <p className="mt-1 text-sm text-gray-700">
                                        {r.procedure_name}
                                        {r.tooth && ` · Tooth ${r.tooth}`}
                                        {r.dentist_name && ` · Dentist: ${r.dentist_name}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
                <CaseReportTable patientType="employee" patientId={employee.employee_id} />
                <p className="text-center text-xs text-gray-600">
                    Your records are private and only visible to you and authorized clinic staff.
                </p>
            </main>
        </div>
    );
}