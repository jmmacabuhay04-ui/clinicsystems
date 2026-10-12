import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-session";
import StudentNav from "@/components/student-nav";
import { getStudent, getVisits, formatDate, show, initialsOf } from "@/lib/student-data";

export default async function StudentVitalsPage() {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const student = await getStudent(Number(session.userId));
    if (!student) redirect("/student/login");

    const visits = await getVisits(student.student_id);
    const fullName = `${student.first_name} ${student.last_name}`;

    const withVitals = visits.filter(
        (v) =>
            v.height_cm !== null ||
            v.weight_kg !== null ||
            v.heart_rate !== null ||
            v.blood_pressure !== null ||
            v.temperature !== null
    );

    const latest = withVitals[0];

    const cards = [
        { label: "Height", value: show(latest?.height_cm, " cm") },
        { label: "Weight", value: show(latest?.weight_kg, " kg") },
        { label: "Heart Rate", value: show(latest?.heart_rate, " bpm") },
        { label: "Blood Pressure", value: show(latest?.blood_pressure) },
        { label: "Temperature", value: show(latest?.temperature, "°C") },
        { label: "Recorded On", value: latest ? formatDate(latest.visit_date, "short") : "—" },
    ];

    return (
        <div className="min-h-screen bg-[#f6f7f6]">
            <StudentNav fullName={fullName} initials={initialsOf(student.first_name, student.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">


                <section>
                    <h1 className="mb-3 text-xl font-semibold text-gray-900">Latest Vital Signs</h1>
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {cards.map((c) => (
                            <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <p className="text-sm text-gray-500">{c.label}</p>
                                <p className="mt-2 text-lg font-semibold text-gray-900">{c.value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Vital Signs History</h2>
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        {withVitals.length === 0 ? (
                            <p className="p-8 text-center text-sm text-gray-500">No vital signs recorded yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-700">
                                        <tr>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                            <th className="px-4 py-3 font-medium">Height</th>
                                            <th className="px-4 py-3 font-medium">Weight</th>
                                            <th className="px-4 py-3 font-medium">Heart Rate</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Blood Pressure</th>
                                            <th className="px-4 py-3 font-medium">Temp.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {withVitals.map((v) => (
                                            <tr key={v.record_id} className="border-t border-gray-100">
                                                <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                                                    {formatDate(v.visit_date, "short")}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">{show(v.height_cm, " cm")}</td>
                                                <td className="px-4 py-3 text-gray-700">{show(v.weight_kg, " kg")}</td>
                                                <td className="px-4 py-3 text-gray-700">{show(v.heart_rate, " bpm")}</td>
                                                <td className="px-4 py-3 text-gray-700">{show(v.blood_pressure)}</td>
                                                <td className="px-4 py-3 text-gray-700">{show(v.temperature, "°C")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}