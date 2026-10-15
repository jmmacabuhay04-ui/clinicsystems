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

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table.
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-t md:border-gray-100 md:py-0";
const td =
    "flex items-start justify-between gap-3 px-4 py-1.5 text-right before:shrink-0 before:text-left before:text-xs before:font-semibold before:uppercase before:text-gray-500 before:content-[attr(data-label)] md:table-cell md:py-3 md:text-left md:before:hidden";

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
        <main className="min-w-0 space-y-6 p-4 md:p-8">
            <div>
                <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Password Requests</h1>
                <p className="mt-1 text-sm text-gray-700 md:text-base">
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
                    <p className="p-8 text-center text-sm text-gray-700">No pending requests.</p>
                ) : (
                    <div className="p-3 md:overflow-x-auto md:p-0">
                        <table className="block w-full text-left text-sm md:table">
                            <thead className="hidden bg-[#EEEEEE] text-[#15664f] md:table-header-group">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">ID Number</th>
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium">Reason</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Requested</th>
                                    <th className="px-4 py-3 font-medium">New Password</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group">
                                {requests.map((r) => (
                                    <tr key={r.request_id} className={`${tr} align-middle`}>
                                        <td data-label="Type" className={td}>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.patient_type === "Student"
                                                    ? "bg-[#dff1ea] text-[#15664f]"
                                                    : "bg-amber-100 text-amber-800"
                                                    }`}
                                            >
                                                {r.patient_type}
                                            </span>
                                        </td>
                                        <td data-label="ID Number" className={`${td} font-semibold text-gray-900`}>
                                            {r.id_number}
                                        </td>
                                        <td data-label="Name" className={`${td} text-gray-900`}>
                                            {r.last_name}, {r.first_name}
                                        </td>
                                        <td data-label="Reason" className={`${td} text-gray-700`}>
                                            {r.note || "—"}
                                        </td>
                                        <td data-label="Requested" className={`${td} text-gray-500 md:whitespace-nowrap`}>
                                            {fmt(r.created_at)}
                                        </td>
                                        <td className="block border-t border-gray-100 px-4 pb-2 pt-3 md:table-cell md:whitespace-nowrap md:border-0 md:py-3">
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                                <form
                                                    action={setPasswordFromRequest}
                                                    className="flex w-full items-center gap-2 md:w-auto"
                                                >
                                                    <input type="hidden" name="requestId" value={r.request_id} />
                                                    <div className="min-w-0 flex-1 md:w-44 md:flex-none">
                                                        <PasswordInput
                                                            name="password"
                                                            placeholder="At least 8 characters"
                                                            autoComplete="new-password"
                                                            minLength={8}
                                                            required
                                                            className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-base text-gray-900 outline-none focus:border-[#15664f] md:text-sm"
                                                        />
                                                    </div>
                                                    <ConfirmSubmit
                                                        title="Set new password?"
                                                        message={`Change the portal password of ${r.first_name} ${r.last_name} (${r.id_number})? Their old password will stop working.`}
                                                        confirmLabel="Set Password"
                                                        className="h-9 shrink-0 whitespace-nowrap rounded-lg bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
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
                                                        className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
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