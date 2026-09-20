import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/employee-session";
import { getEmployee, formatDate, initialsOf } from "@/lib/employee-data";
import EmployeeNav from "@/components/employee-nav";

export default async function EmployeeProfilePage() {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employee = await getEmployee(session.employeeId);
    if (!employee) redirect("/employee/login");

    const rows = [
        { label: "Employee Number", value: employee.employee_number },
        { label: "Last Name", value: employee.last_name },
        { label: "First Name", value: employee.first_name },
        { label: "Middle Name", value: employee.middle_name || "—" },
        { label: "Department", value: employee.department || "—" },
        { label: "Position", value: employee.position || "—" },
        { label: "Date of Birth", value: formatDate(employee.date_of_birth) },
        { label: "Gender", value: employee.gender || "—" },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <EmployeeNav />

            <main className="mx-auto max-w-3xl space-y-6 p-6">
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#15664f] text-xl font-bold text-white">
                        {initialsOf(employee.first_name, employee.last_name)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            {employee.first_name} {employee.last_name}
                        </h1>
                        <p className="text-sm text-gray-600">{employee.employee_number}</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <dl>
                        {rows.map((row, index) => (
                            <div
                                key={row.label}
                                className={`flex flex-wrap justify-between gap-2 px-6 py-4 ${index > 0 ? "border-t border-gray-100" : ""
                                    }`}
                            >
                                <dt className="text-sm font-medium text-gray-600">{row.label}</dt>
                                <dd className="text-sm font-semibold text-gray-900">{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <p className="text-center text-xs text-gray-500">
                    View only. Para sa pagtatama ng impormasyon, lapit sa clinic staff.
                </p>
            </main>
        </div>
    );
}