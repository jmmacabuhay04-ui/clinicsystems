import Link from "next/link";
import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/employee-session";
import EmployeeNav from "@/components/employee-nav";
import {
    getEmployee,
    getEmployeeVisits,
    formatDate,
    show,
    initialsOf,
} from "@/lib/employee-data";

export default async function EmployeeOverviewPage() {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employee = await getEmployee(Number(session.employeeId));
    if (!employee) redirect("/employee/login");

    const visits = await getEmployeeVisits(employee.employee_id);

    const latestVitals = visits.find(
        (v) =>
            v.height_cm !== null ||
            v.weight_kg !== null ||
            v.heart_rate !== null ||
            v.blood_pressure !== null ||
            v.temperature !== null
    );

    const fullName = `${employee.first_name} ${employee.last_name}`;

    return (
        <div className="min-h-screen bg-[#f6f7f6]">
            <EmployeeNav fullName={fullName} initials={initialsOf(employee.first_name, employee.last_name)} />

            <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
                <section className="rounded-xl bg-[#15664f] p-6 text-white shadow">
                    <p className="text-sm text-white/80">Welcome back,</p>
                    <h1 className="mt-1 text-[50px] font-bold">{employee.first_name}!</h1>

                    <p className="mt-2 text-sm text-white/80">
                        You have {visits.length} clinic visit{visits.length === 1 ? "" : "s"} on record.
                    </p>
                </section>

                <section className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Total Visits</p>
                        <p className="mt-2 text-3xl font-semibold text-[#15664f]">{visits.length}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Last Visit</p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">
                            {visits[0] ? formatDate(visits[0].visit_date, "short") : "—"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">Latest Blood Pressure</p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">
                            {show(latestVitals?.blood_pressure)}
                        </p>
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Visits</h2>
                        <Link href="/employee/visits" className="text-sm font-medium text-[#15664f] hover:underline">
                            View all
                        </Link>
                    </div>

                    {visits.length === 0 ? (
                        <p className="mt-4 text-sm text-gray-500">No clinic visits recorded yet.</p>
                    ) : (
                        <ul className="mt-4 space-y-3">
                            {visits.slice(0, 3).map((v) => (
                                <li key={v.record_id} className="rounded-lg border border-gray-100 p-4">
                                    <p className="font-medium text-gray-900">{formatDate(v.visit_date)}</p>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {v.complaint}
                                        {v.attending_staff && ` · Seen by ${v.attending_staff}`}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <p className="text-center text-xs text-gray-500">
                    Your records are private and only visible to you and authorized clinic staff.
                </p>
            </main>
        </div>
    );
}