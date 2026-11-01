import { redirect } from "next/navigation";
import { Briefcase, Clock, GraduationCap, KeyRound, MessageSquareText, ShieldAlert, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/permissions";
import ConfirmButton from "@/components/shared/confirm-button";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import PasswordInput from "@/components/shared/password-input";
import FlashMessage from "@/components/shared/flash-message";
import { dismissRequest, setPasswordFromRequest } from "@/features/password-requests/actions";

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

const card = "rounded-2xl border border-[#dcebe3] bg-white shadow-sm shadow-[#15664f]/5";

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
    if (!canManageStudents(session.role) && session.role !== "ittech") redirect("/dashboard");

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

    const studentCount = requests.filter((r) => r.patient_type === "Student").length;
    // Pending = pula (kailangang asikasuhin), Students = green, Employees = dilaw
    const stats = [
        { label: "Students", value: studentCount, icon: GraduationCap, bar: "bg-[#15664f]", tile: "bg-[#15664f]/10 text-[#15664f]" },
        { label: "Employees", value: requests.length - studentCount, icon: Briefcase, bar: "bg-[#f2b705]", tile: "bg-[#f2b705]/15 text-[#a67c00]" },
        { label: "Pending", value: requests.length, icon: Clock, bar: "bg-red-500", tile: "bg-red-50 text-red-600" },
    ];

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="min-w-0">
                <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Password Requests</h1>
                <p className="mt-1 text-sm text-gray-600">Students and employees who asked for a new portal password.</p>
            </div>

            {done === "1" && (
                <FlashMessage clearParam="done">
                    Password updated. Give the new password to the account owner in person.
                </FlashMessage>
            )}
            {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errors[error] ?? "Something went wrong. Please try again."}
                </p>
            )}

            {/* Reminder */}
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <ShieldAlert className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                    <p className="font-semibold text-amber-900">Verify identity in person first</p>
                    <p className="mt-0.5 text-amber-800">
                        Check the person&apos;s school ID before setting a new password, then give the password to them
                        directly. Never send it through chat or text.
                    </p>
                </div>
            </div>

            {/* Stats */}
            {/* Phone: 3 maliliit na card sa iisang hilera. Mas malaking screen: icon sa kaliwa. */}
            <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {stats.map((st) => {
                    const Icon = st.icon;
                    return (
                        <div
                            key={st.label}
                            className="relative flex min-w-0 flex-col items-start gap-2 overflow-hidden rounded-2xl border border-[#dcebe3] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:p-4"
                        >
                            <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${st.bar}`} />
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${st.tile}`}>
                                <Icon className="h-5 w-5" strokeWidth={1.9} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-2xl font-bold leading-tight text-gray-900 sm:text-[1.75rem]">{st.value}</p>
                                <p className="truncate text-sm font-medium text-gray-600">{st.label}</p>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* Requests */}
            {requests.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-[#cfe5d9] bg-white p-10 text-center md:p-16">
                    <p className="text-base font-semibold text-gray-800">No pending requests</p>
                    <p className="mt-1 text-sm text-gray-600">
                        New password requests from the student and employee portals will appear here.
                    </p>
                </div>
            ) : (
                <section className="grid gap-4 xl:grid-cols-2">
                    {requests.map((r) => {
                        const isStudent = r.patient_type === "Student";
                        const initials = `${r.first_name[0] ?? ""}${r.last_name[0] ?? ""}`.toUpperCase();
                        return (
                            <article key={r.request_id} className={`${card} min-w-0 p-5`}>
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isStudent ? "bg-[#15664f] text-white" : "bg-amber-300 text-gray-900"
                                            }`}
                                    >
                                        {initials}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="break-words font-semibold text-gray-900">
                                                {r.last_name}, {r.first_name}
                                            </p>
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset ${isStudent
                                                    ? "bg-emerald-50 text-emerald-800 ring-emerald-600/25"
                                                    : "bg-amber-50 text-amber-800 ring-amber-500/30"
                                                    }`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${isStudent ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                {r.patient_type}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">{r.id_number}</p>
                                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600">
                                            <Clock className="h-4 w-4 shrink-0" />
                                            Requested {fmt(r.created_at)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-[#e3efe8] bg-[#f6faf8] p-3 text-sm">
                                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                        <MessageSquareText className="h-4 w-4 text-[#15664f]" />
                                        Reason
                                    </p>
                                    <p className="mt-0.5 min-w-0 break-words text-gray-600">
                                        {r.note || <span className="italic text-gray-600">No reason given.</span>}
                                    </p>
                                </div>

                                <div className="mt-4 border-t border-gray-100 pt-4">
                                    <p className="mb-1.5 text-sm font-semibold text-gray-800">New Password</p>
                                    {/* Phone: password sa itaas, tapos Set Password at Dismiss magkatabi.
                                        Kasama ang password sa Set Password form gamit ang form="" attribute. */}
                                    <PasswordInput
                                        form={`set-${r.request_id}`}
                                        name="password"
                                        placeholder="At least 8 characters"
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                                    />
                                    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                                        <form action={dismissRequest} className="sm:order-1">
                                            <input type="hidden" name="requestId" value={r.request_id} />
                                            <ConfirmButton
                                                title="Dismiss request"
                                                confirmLabel="Dismiss"
                                                message={`Dismiss the request of ${r.first_name} ${r.last_name}? Their password will not be changed.`}
                                                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <X className="h-4 w-4" />
                                                Dismiss
                                            </ConfirmButton>
                                        </form>
                                        <form id={`set-${r.request_id}`} action={setPasswordFromRequest} className="sm:order-2">
                                            <input type="hidden" name="requestId" value={r.request_id} />
                                            <ConfirmSubmit
                                                title="Set new password?"
                                                message={`Change the portal password of ${r.first_name} ${r.last_name} (${r.id_number})? Their old password will stop working.`}
                                                confirmLabel="Set Password"
                                                className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                                            >
                                                <KeyRound className="h-4 w-4" />
                                                Set Password
                                            </ConfirmSubmit>
                                        </form>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
        </main>
    );
}