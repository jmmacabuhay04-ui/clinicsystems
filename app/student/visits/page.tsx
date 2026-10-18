import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-session";
import StudentNav from "@/components/student-nav";
import { getStudent, getVisits, formatDate, initialsOf } from "@/lib/student-data";

export default async function StudentVisitsPage() {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const student = await getStudent(Number(session.userId));
    if (!student) redirect("/student/login");

    const visits = await getVisits(student.student_id);
    const fullName = `${student.first_name} ${student.last_name}`;

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <StudentNav fullName={fullName} initials={initialsOf(student.first_name, student.last_name)} />

            <main className="mx-auto max-w-5xl space-y-4 p-6">
                <h1 className="text-2xl font-semibold text-gray-900">My Visits ({visits.length})</h1>

                {visits.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                        <p className="text-gray-500">No clinic visits recorded yet.</p>
                    </div>
                )}

                {visits.map((v) => (
                    <details key={v.record_id} className="group rounded-xl border border-gray-200 bg-white shadow-sm">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5">
                            <div>
                                <p className="font-semibold text-gray-900">{v.complaint}</p>
                                <p className="text-sm text-gray-600">{formatDate(v.visit_date)}</p>
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
                                    <p className="text-xs text-gray-600">Complaint</p>
                                    <p className="mt-0.5 font-semibold text-gray-900">{v.complaint || "—"}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs text-gray-600">Attending Staff</p>
                                    <p className="mt-0.5 font-semibold text-gray-900">{v.attending_staff || "—"}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs text-gray-600">Visit Date</p>
                                    <p className="mt-0.5 font-semibold text-gray-900">
                                        {formatDate(v.visit_date, "short")}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Action Taken
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                                    {v.action_taken || "—"}
                                </p>
                            </div>
                        </div>
                    </details>
                ))}
            </main>
        </div>
    );
}