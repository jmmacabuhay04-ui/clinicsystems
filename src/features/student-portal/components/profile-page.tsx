import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, IdCard, LockKeyhole, Phone, Send, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student-session";
import StudentNav from "@/components/layout/student-nav";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import FlashMessage from "@/components/shared/flash-message";
import PortalAvatarForm from "@/components/shared/portal-avatar-form";
import { getStudent, formatDate, show, initialsOf } from "@/features/student-portal/data";
import { requestPasswordChange } from "@/features/student-portal/profile-actions";
import { saveStudentAvatar, removeStudentAvatar } from "@/features/student-portal/avatar-actions";

type Props = { searchParams: Promise<{ requested?: string }> };

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

type Field = { label: string; value: string };

function InfoCard({ icon, title, fields }: { icon: React.ReactNode; title: string; fields: Field[] }) {
    return (
        <section className={`${card} min-w-0 overflow-hidden`}>
            <div className="flex items-center gap-3 p-5 pb-4">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <dl className="divide-y divide-gray-100 border-t border-gray-100">
                {fields.map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-4 px-5 py-3">
                        <dt className="shrink-0 text-sm text-gray-600">{f.label}</dt>
                        <dd className="min-w-0 break-words text-right text-sm font-semibold text-gray-900">{f.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

export default async function StudentProfilePage({ searchParams }: Props) {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const student = await getStudent(Number(session.userId));
    if (!student) redirect("/student/login");

    const { requested } = await searchParams;
    const fullName = `${student.first_name} ${student.last_name}`;
    const initials = initialsOf(student.first_name, student.last_name);

    const pendingRows = await prisma.$queryRaw<{ created_at: Date }[]>`
        SELECT created_at FROM portal_password_requests
        WHERE student_id = ${student.student_id} AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const pending = pendingRows[0];

    const schoolFields: Field[] = [
        { label: "Student Number", value: student.student_number },
        { label: "Grade/Level", value: show(student.grade_level) },
        { label: "Program", value: show(student.program) },
    ];

    const personalFields: Field[] = [
        { label: "Last Name", value: student.last_name },
        { label: "First Name", value: student.first_name },
        { label: "Middle Name", value: show(student.middle_name) },
        { label: "Date of Birth", value: formatDate(student.date_of_birth) },
        { label: "Gender", value: show(student.gender) },
    ];

    const contactFields: Field[] = [
        { label: "Contact Number", value: student.contact_number || "—" },
        { label: "Email Address", value: student.email || "—" },
    ];

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <StudentNav fullName={fullName} initials={initials} />

            <main className="mx-auto max-w-5xl space-y-6 p-4 pb-10 md:p-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">My Profile</h1>
                        <p className="text-sm text-gray-600">Your personal details on file at the clinic.</p>
                    </div>
                </div>

                {/* Profile picture (i-click ang bilog para lumabas ang camera) */}
                <PortalAvatarForm
                    current={student.avatar}
                    initials={initials}
                    fullName={fullName}
                    subtitle={student.student_number}
                    saveAction={saveStudentAvatar}
                    removeAction={removeStudentAvatar}
                />

                <div className="grid gap-6 lg:grid-cols-2">
                    <InfoCard icon={<UserRound className="h-5 w-5" />} title="Personal Information" fields={personalFields} />
                    <div className="space-y-6">
                        <InfoCard icon={<IdCard className="h-5 w-5" />} title="School Information" fields={schoolFields} />
                        <InfoCard icon={<Phone className="h-5 w-5" />} title="Contact" fields={contactFields} />
                    </div>
                </div>

                <p className="text-center text-sm text-gray-600">
                    See something wrong? Ask the clinic nurse to update your details.
                </p>

                {/* Password change request */}
                <section className={`${card} p-5 md:p-6`}>
                    <div className="flex items-start gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Password</h2>
                            <p className="text-sm text-gray-600">
                                Change your password yourself. Only you will know the new one.
                            </p>
                        </div>
                    </div>

                    {/* Sariling pagpapalit: kailangan ang kasalukuyang password, hindi makikita ng nurse */}
                    <Link
                        href="/student/change-password"
                        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] sm:w-auto"
                    >
                        <LockKeyhole className="h-4 w-4" />
                        Change My Password
                    </Link>

                    <div className="mt-6 border-t border-gray-100 pt-5">
                        <p className="text-sm font-semibold text-gray-900">Forgot your password?</p>
                        <p className="text-sm text-gray-600">
                            Send a request to the clinic nurse, then visit the clinic with your ID.
                        </p>
                    </div>

                    {requested === "1" && (
                        <div className="mt-4">
                            <FlashMessage clearParam="requested">Request sent to the clinic nurse.</FlashMessage>
                        </div>
                    )}

                    {pending ? (
                        <div className="mt-4 flex items-start gap-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <p>
                                You requested a password change on{" "}
                                <span className="font-semibold">{formatDate(pending.created_at)}</span>. Please visit the
                                clinic nurse to receive your new password.
                            </p>
                        </div>
                    ) : (
                        <form action={requestPasswordChange} className="mt-4 space-y-3">
                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-gray-800">Reason (optional)</span>
                                <textarea
                                    name="note"
                                    rows={3}
                                    maxLength={300}
                                    placeholder="e.g. I forgot my password"
                                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                                />
                            </label>
                            <ConfirmSubmit
                                title="Request password change?"
                                message="The clinic nurse will be notified. Visit the clinic to receive your new password."
                                confirmLabel="Send request"
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#15664f] bg-white px-5 text-sm font-semibold text-[#15664f] hover:bg-[#eef6f2] sm:w-auto"
                            >
                                <Send className="h-4 w-4" />
                                Request Password Change
                            </ConfirmSubmit>
                        </form>
                    )}
                </section>
            </main>
        </div>
    );
}