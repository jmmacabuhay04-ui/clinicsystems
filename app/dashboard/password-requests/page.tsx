import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import ConfirmSubmit from "@/components/confirm-submit";
import PasswordInput from "@/components/password-input";
import { dismissRequest, setPasswordFromRequest } from "./actions";

type RequestRow = {
    request_id: number;
    note: string | null;
    created_at: Date;
    patient_type: "Student" | "Employee";
    id_number: string;
    last_name: string;
    first_name: string;
};

type Props = { searchParams: Promise<{ done?: string; error?: string }> };

function fmt(date: Date) {
    return new Date(date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
    });
}

const errors: Record<string, string> = {
    short: "The new password must be at least 8 characters.",
    missing: "That request was already handled or no longer exists.",
};

export default async function PasswordRequestsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageStudents(session.role)) redirect("/dashboard");

    const { done, error } = await searchParams;

    const requests = await prisma.$queryRaw<RequestRow[]>`
        SELECT r.request_id, r.note, r.created_at,
               CASE WHEN r.student_id IS NOT NULL THEN 'Student' ELSE 'Employee' END AS patient_type,
               COALESCE(s.student_number, e.employee_number) AS id_number,
               COALESCE(s.last_name, e.last_name) AS last_name,
               COALESCE(s.first_name, e.first_name) AS first_name
        FROM portal_password_requests r
        LEFT JOIN students s ON s.student_id = r.student_id
        LEFT JOIN employees e ON e.employee_id = r.employee_id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
    `;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Password Requests</h1>
                <p className="mt-1 text-gray-600">
                    Students and employees who asked for a new portal password. Verify their identity in person
                    before giving the new password.
                </p>
            </div>

            {done === "1" && (
                <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Password updated. Give the new password to the account owner in person.
                </p>
            )}
            {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errors[error] ?? "Something went wrong. Please try again."}
                </p>
            )}

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {requests.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">No pending requests.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">ID Number</th>
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium">Reason</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Requested</th>
                                    <th className="px-4 py-3 font-medium">New Password</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((r) => (
                                    <tr key={r.request_id} className="border-t border-gray-100 align-middle">
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.patient_type === "Student"
                                                    ? "bg-[#dff1ea] text-[#15664f]"
                                                    : "bg-amber-100 text-amber-800"
                                                    }`}
                                            >
                                                {r.patient_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">{r.id_number}</td>
                                        <td className="px-4 py-3 text-gray-900">
                                            {r.last_name}, {r.first_name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{r.note || "—"}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fmt(r.created_at)}</td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <form action={setPasswordFromRequest} className="flex items-center gap-2">
                                                    <input type="hidden" name="requestId" value={r.request_id} />
                                                    <div className="w-44">
                                                        <PasswordInput
                                                            name="password"
                                                            placeholder="At least 8 characters"
                                                            autoComplete="new-password"
                                                            minLength={8}
                                                            required
                                                            className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-[#15664f]"
                                                        />
                                                    </div>
                                                    <ConfirmSubmit
                                                        title="Set new password?"
                                                        message={`Change the portal password of ${r.first_name} ${r.last_name} (${r.id_number})? Their old password will stop working.`}
                                                        confirmLabel="Set Password"
                                                        className="h-9 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                                    >
                                                        Set Password
                                                    </ConfirmSubmit>
                                                </form>
                                                <form action={dismissRequest}>
                                                    <input type="hidden" name="requestId" value={r.request_id} />
                                                    <ConfirmButton
                                                        title="Dismiss request"
                                                        confirmLabel="Dismiss"
                                                        message={`Dismiss the request of ${r.first_name} ${r.last_name}? Their password will not be changed.`}
                                                        className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                        Dismiss
                                                    </ConfirmButton>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}