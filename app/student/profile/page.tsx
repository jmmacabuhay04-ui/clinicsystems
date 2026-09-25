import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";
import StudentNav from "@/components/student-nav";
import ConfirmSubmit from "@/components/confirm-submit";
import { getStudent, formatDate, show, initialsOf } from "@/lib/student-data";
import { requestPasswordChange } from "./actions";

type Props = { searchParams: Promise<{ requested?: string }> };

export default async function StudentProfilePage({ searchParams }: Props) {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const student = await getStudent(Number(session.userId));
    if (!student) redirect("/student/login");

    const { requested } = await searchParams;
    const fullName = `${student.first_name} ${student.last_name}`;

    const pendingRows = await prisma.$queryRaw<{ created_at: Date }[]>`
        SELECT created_at FROM portal_password_requests
        WHERE student_id = ${student.student_id} AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const pending = pendingRows[0];

    const fields = [
        { label: "Student Number", value: student.student_number },
        { label: "Last Name", value: student.last_name },
        { label: "First Name", value: student.first_name },
        { label: "Middle Name", value: show(student.middle_name) },
        { label: "Grade/Level", value: show(student.grade_level) },
        { label: "Program", value: show(student.program) },
        { label: "Date of Birth", value: formatDate(student.date_of_birth) },
        { label: "Gender", value: show(student.gender) },
        { label: "Contact Number", value: student.contact_number || "—" },
        { label: "Email Address", value: student.email || "—" },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <StudentNav fullName={fullName} initials={initialsOf(student.first_name, student.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-6">
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#15664f] text-xl font-semibold text-white">
                        {initialsOf(student.first_name, student.last_name)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-semibold text-gray-900">{fullName}</p>
                        <p className="text-sm text-gray-600">{student.student_number}</p>
                    </div>
                </div>

                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
                    {fields.map((f) => (
                        <div key={f.label} className="flex items-center justify-between gap-4 px-6 py-4">
                            <span className="text-sm text-gray-600">{f.label}</span>
                            <span className="text-right text-sm font-semibold text-gray-900">{f.value}</span>
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