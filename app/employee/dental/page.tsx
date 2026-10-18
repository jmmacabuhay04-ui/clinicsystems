import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/employee-session";
import { getEmployee, getEmployeeDental, formatDate, initialsOf } from "@/lib/employee-data";
import EmployeeNav from "@/components/employee-nav";

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


            <main className="mx-auto max-w-5xl space-y-4 p-6">
                <h1 className="text-2xl font-semibold text-[#15664f]">Dental Records ({records.length})</h1>

                {records.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                        <p className="text-gray-700">No dental visits recorded yet.</p>
                    </div>
                )}

                {records.map((r) => (
                    <details key={r.dental_id} className="group rounded-xl border border-gray-200 bg-white shadow-sm">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5">
                            <div>
                                <p className="font-semibold text-gray-900">{r.procedure_name}</p>
                                <p className="text-sm text-gray-700">{formatDate(r.visit_date)}</p>
                            </div>
                            <span className="text-sm font-medium text-[#15664f] group-open:hidden">
                                View details
                            </span>
                            <span className="hidden text-sm font-medium text-gray-500 group-open:inline">
                                Hide
                            </span>
                        </summary>

                        <div className="space-y-4 border-t border-gray-100 p-5">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs text-gray-600">Tooth</p>
                                    <p className="mt-0.5 font-semibold text-gray-900">{r.tooth || "—"}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs text-gray-600">Attending Dentist</p>
                                    <p className="mt-0.5 font-semibold text-gray-900">{r.dentist_name || "—"}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs text-gray-600">Status</p>
                                    <p className="mt-0.5 font-semibold text-gray-900">
                                        {r.status === "follow-up" ? "Follow-up" : "Completed"}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{r.notes || "—"}</p>
                            </div>
                        </div>
                    </details>
                ))}
            </main>
        </div>
    );
}