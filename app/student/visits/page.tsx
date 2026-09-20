import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { getStudentSession } from "@/lib/student-session";
import StudentNav from "@/components/student-nav";
import { getStudent, getVisits, formatDate, show, initialsOf } from "@/lib/student-data";

export default async function StudentVisitsPage() {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const student = await getStudent(Number(session.userId));
    if (!student) redirect("/student/login");

    const visits = await getVisits(student.student_id);
    const fullName = `${student.first_name} ${student.last_name}`;

    return (
        <div className="min-h-screen bg-[#f6f7f6]">
            <StudentNav fullName={fullName} initials={initialsOf(student.first_name, student.last_name)} />

            <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    These are read-only records managed by BCAS clinic staff. Visit the clinic to correct any
                    errors.
                </div>

                <h1 className="text-xl font-semibold text-gray-900">
                    All clinic visits ({visits.length} record{visits.length === 1 ? "" : "s"})
                </h1>

                {visits.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                        <p className="font-medium text-gray-700">No clinic visits yet</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Your consultations will appear here after your clinic visit.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visits.map((v) => (
                            <details
                                key={v.record_id}
                                className="group rounded-xl border border-gray-200 bg-white shadow-sm"
                            >
                                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900">{formatDate(v.visit_date)}</p>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {v.complaint}
                                            {v.attending_staff && ` · Seen by ${v.attending_staff}`} · Tap to expand
                                        </p>
                                    </div>
                                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                                </summary>

                                <div className="border-t border-gray-100 px-4 py-4">
                                    <dl className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <dt className="text-xs uppercase tracking-wide text-gray-500">Complaint</dt>
                                            <dd className="mt-1 text-gray-900">{v.complaint}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs uppercase tracking-wide text-gray-500">Action Taken</dt>
                                            <dd className="mt-1 text-gray-900">{show(v.action_taken)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs uppercase tracking-wide text-gray-500">
                                                Attending Staff
                                            </dt>
                                            <dd className="mt-1 text-gray-900">{show(v.attending_staff)}</dd>
                                        </div>
                                    </dl>

                                    <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-5">
                                        {[
                                            { label: "Height", value: show(v.height_cm, " cm") },
                                            { label: "Weight", value: show(v.weight_kg, " kg") },
                                            { label: "Heart Rate", value: show(v.heart_rate, " bpm") },
                                            { label: "Blood Pressure", value: show(v.blood_pressure) },
                                            { label: "Temperature", value: show(v.temperature, "°C") },
                                        ].map((item) => (
                                            <div key={item.label}>
                                                <p className="text-xs text-gray-500">{item.label}</p>
                                                <p className="mt-1 font-medium text-gray-900">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}