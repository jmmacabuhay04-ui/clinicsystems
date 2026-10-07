
import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/employee-session";
import {
    getEmployee,
    getEmployeeVisits,
    formatDate,
    initialsOf,
    show,
} from "@/lib/employee-data";
import EmployeeNav from "@/components/employee-nav";

export default async function EmployeeVitalsPage() {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employee = await getEmployee(Number(session.employeeId));
    if (!employee) redirect("/employee/login");

    const visits = await getEmployeeVisits(session.employeeId);
    const fullName = `${employee.first_name} ${employee.last_name}`;

    return (
        <div className="min-h-screen bg-gray-50">
            <EmployeeNav
                fullName={fullName}
                initials={initialsOf(employee.first_name, employee.last_name)}
            />

            <main className="mx-auto max-w-5xl space-y-6 p-6">
                <h1 className="text-2xl font-semibold text-gray-900">Vitals History</h1>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {visits.length === 0 ? (
                        <p className="p-12 text-center text-sm text-gray-500">
                            Wala pang naitalang vital signs.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Height</th>
                                        <th className="px-4 py-3 font-medium">Weight</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Heart Rate</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Blood Pressure</th>
                                        <th className="px-4 py-3 font-medium">Temperature</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visits.map((visit) => (
                                        <tr key={visit.record_id} className="border-t border-gray-100">
                                            <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                                {formatDate(visit.visit_date, "short")}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">{show(visit.height_cm, " cm")}</td>
                                            <td className="px-4 py-3 text-gray-900">{show(visit.weight_kg, " kg")}</td>
                                            <td className="px-4 py-3 text-gray-900">{show(visit.heart_rate, " bpm")}</td>
                                            <td className="px-4 py-3 text-gray-900">{show(visit.blood_pressure)}</td>
                                            <td className="px-4 py-3 text-gray-900">{show(visit.temperature, " °C")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
