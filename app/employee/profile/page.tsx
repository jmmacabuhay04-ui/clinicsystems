import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/employee-session";
import { getEmployee, formatDate, initialsOf } from "@/lib/employee-data";
import EmployeeNav from "@/components/employee-nav";
import ConfirmSubmit from "@/components/confirm-submit";
import { requestPasswordChange } from "./actions";

type Props = { searchParams: Promise<{ requested?: string }> };

export default async function EmployeeProfilePage({ searchParams }: Props) {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employee = await getEmployee(session.employeeId);
    if (!employee) redirect("/employee/login");

    const { requested } = await searchParams;
    const fullName = `${employee.first_name} ${employee.last_name}`;

    const pendingRows = await prisma.$queryRaw<{ created_at: Date }[]>`
        SELECT created_at FROM portal_password_requests
        WHERE employee_id = ${employee.employee_id} AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const pending = pendingRows[0];

    const rows = [
        { label: "Employee Number", value: employee.employee_number },
        { label: "Last Name", value: employee.last_name },
        { label: "First Name", value: employee.first_name },
        { label: "Middle Name", value: employee.middle_name || "—" },
        { label: "Department", value: employee.department || "—" },
        { label: "Position", value: employee.position || "—" },
        { label: "Date of Birth", value: formatDate(employee.date_of_birth) },
        { label: "Gender", value: employee.gender || "—" },
        { label: "Contact Number", value: employee.contact_number || "—" },
        { label: "Email Address", value: employee.email || "—" },

    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <EmployeeNav fullName={fullName} initials={initialsOf(employee.first_name, employee.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-6">
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#15664f] text-xl font-semibold text-white">
                        {initialsOf(employee.first_name, employee.last_name)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-semibold text-gray-900">{fullName}</p>
                        <p className="text-sm text-gray-600">{employee.employee_number}</p>
                    </div>
                </div>

                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
                    {rows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-4 px-6 py-4">
                            <span className="text-sm text-gray-600">{row.label}</span>
                            <span className="text-right text-sm font-semibold text-gray-900">{row.value}</span>
                        </div>
                    ))}
                </div>

                {/* Password change request */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Password</h2>

                    {requested === "1" && (
                        <p className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                            Request sent to the clinic nurse.
                        </p>
                    )}

                    {pending ? (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            You requested a password change on {formatDate(pending.created_at)}. Please visit the
                            clinic nurse to receive your new password.
                        </p>
                    ) : (
                        <form action={requestPasswordChange} className="mt-3 space-y-3">
                            <p className="text-sm text-gray-600">
                                Forgot your password or want a new one? Send a request to the clinic nurse.
                            </p>
                            <textarea
                                name="note"
                                rows={2}
                                maxLength={300}
                                placeholder="Reason (optional)"
                                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                            />
                            <ConfirmSubmit
                                title="Request password change?"
                                message="The clinic nurse will be notified. Visit the clinic to receive your new password."
                                confirmLabel="Send request"
                                className="rounded-lg bg-[#15664f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10523f]"
                            >
                                Request Password Change
                            </ConfirmSubmit>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}