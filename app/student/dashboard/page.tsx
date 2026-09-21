import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-session";
import StudentNav from "@/components/student-nav";
import {
    getStudent,
    getVisits,
    getStudentDental,
    formatDate,
    initialsOf,
} from "@/lib/student-data";

export default async function StudentDashboardPage() {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const student = await getStudent(Number(session.userId));
    if (!student) redirect("/student/login");

    const visits = await getVisits(student.student_id);
    const dental = await getStudentDental(student.student_id);

    const fullName = `${student.first_name} ${student.last_name}`;
    const allDates = [
        ...visits.map((v) => v.visit_date),
        ...dental.map((r) => r.visit_date),
    ].filter(Boolean);
    const lastVisit = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    const latestBP = visits.find((v) => v.blood_pressure)?.blood_pressure;

    const stats = [
        { label: "Total Visits", value: String(visits.length), big: true },
        { label: "Dental Visits", value: String(dental.length), big: true },
        { label: "Last Visit", value: lastVisit ? formatDate(lastVisit, "short") : "—" },
        { label: "Latest Blood Pressure", value: latestBP || "—" },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <StudentNav fullName={fullName} initials={initialsOf(student.first_name, student.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-6">
                {/* Welcome banner */}
                <div className="rounded-xl bg-[#15664f] p-6 text-white shadow-sm">
                    <p className="text-sm text-white/90">Welcome back,</p>
                    <p className="mt-2 text-4xl font-bold">{student.first_name}!</p>


                </div>

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((s) => (
                        <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-600">{s.label}</p>
                            <p
                                className={
                                    s.big
                                        ? "mt-2 text-3xl font-semibold text-[#15664f]"
                                        : "mt-2 text-lg font-semibold text-gray-900"
                                }
                            >
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Recent Visits */}
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Visits</h2>
                        <a href="/student/visits" className="text-sm font-medium text-[#15664f] hover:underline">
                            View all
                        </a>
                    </div>

                    {visits.length === 0 ? (
                        <p className="text-sm text-gray-500">No clinic visits recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {visits.slice(0, 3).map((v) => (
                                <div key={v.record_id} className="rounded-lg border border-gray-100 p-4">
                                    <p className="font-semibold text-gray-900">{formatDate(v.visit_date)}</p>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {v.complaint}
                                        {v.attending_staff && ` · Seen by ${v.attending_staff}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Recent Dental Visits */}
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Dental Visits</h2>
                        <a href="/student/dental" className="text-sm font-medium text-[#15664f] hover:underline">
                            View all
                        </a>
                    </div>

                    {dental.length === 0 ? (
                        <p className="text-sm text-gray-500">No dental visits recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {dental.slice(0, 3).map((r) => (
                                <div key={r.dental_id} className="rounded-lg border border-gray-100 p-4">
                                    <p className="font-semibold text-gray-900">{formatDate(r.visit_date)}</p>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {r.procedure_name}
                                        {r.tooth && ` · Tooth ${r.tooth}`}
                                        {r.dentist_name && ` · Dentist: ${r.dentist_name}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <p className="text-center text-xs text-gray-500">
                    Your records are private and only visible to you and authorized clinic staff.
                </p>
            </main>
        </div>
    );
}