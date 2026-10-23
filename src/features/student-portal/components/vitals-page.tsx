import { redirect } from "next/navigation";
import { Activity, CalendarDays, HeartPulse, Ruler, Thermometer, Weight } from "lucide-react";
import { getStudentSession } from "@/lib/auth/student-session";
import StudentNav from "@/components/layout/student-nav";
import { getStudent, getVisits, formatDate, show, initialsOf } from "@/features/student-portal/data";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

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
        { label: "Height", value: show(latest?.height_cm, " cm"), icon: Ruler, tint: "bg-[#eef6f2] text-[#15664f]" },
        { label: "Weight", value: show(latest?.weight_kg, " kg"), icon: Weight, tint: "bg-amber-100 text-amber-700" },
        { label: "Heart Rate", value: show(latest?.heart_rate, " bpm"), icon: HeartPulse, tint: "bg-rose-50 text-rose-600" },
        { label: "Blood Pressure", value: show(latest?.blood_pressure), icon: Activity, tint: "bg-blue-50 text-blue-700" },
        { label: "Temperature", value: show(latest?.temperature, "°C"), icon: Thermometer, tint: "bg-orange-50 text-orange-600" },
        {
            label: "Recorded On",
            value: latest ? formatDate(latest.visit_date, "short") : "—",
            icon: CalendarDays,
            tint: "bg-violet-50 text-violet-700",
        },
    ];

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <StudentNav fullName={fullName} initials={initialsOf(student.first_name, student.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-4 pb-10 md:p-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <HeartPulse className="h-10 w-10 shrink-0 text-[#15664f]" />
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Vital Signs</h1>
                        <p className="text-sm text-gray-600">Your latest measurements and their history.</p>
                    </div>
                </div>

                {/* Latest */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-gray-900">Latest Vital Signs</h2>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                        {cards.map((c) => {
                            const Icon = c.icon;
                            return (
                                <div key={c.label} className={`${card} flex min-w-0 items-center gap-3 p-4`}>
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${c.tint}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs text-gray-600 md:text-sm">{c.label}</p>
                                        <p className="truncate text-lg font-bold text-gray-900">{c.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* History */}
                <section className={`${card} min-w-0 overflow-hidden`}>
                    <div className="flex items-center justify-between gap-3 p-5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                                <Activity className="h-5 w-5" />
                            </span>
                            <h2 className="text-lg font-semibold text-gray-900">Vital Signs History</h2>
                        </div>
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-xs font-semibold text-[#15664f]">
                            {withVitals.length} record{withVitals.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    {withVitals.length === 0 ? (
                        <div className="flex flex-col items-center border-t border-gray-100 p-10 text-center">
                            <HeartPulse className="h-12 w-12 text-[#15664f]/30" />
                            <p className="mt-3 font-semibold text-gray-800">No vital signs recorded yet</p>
                            <p className="mt-1 text-sm text-gray-500">They will appear here once taken during a clinic visit.</p>
                        </div>
                    ) : (
                        <>
                            {/* MOBILE: card list */}
                            <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                                {withVitals.map((v) => (
                                    <li key={v.record_id} className="rounded-lg border border-gray-200 p-3">
                                        <p className="text-sm font-semibold text-gray-900">{formatDate(v.visit_date, "short")}</p>
                                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                                            <dt className="text-gray-500">Height</dt>
                                            <dd className="text-right text-gray-900">{show(v.height_cm, " cm")}</dd>
                                            <dt className="text-gray-500">Weight</dt>
                                            <dd className="text-right text-gray-900">{show(v.weight_kg, " kg")}</dd>
                                            <dt className="text-gray-500">Heart Rate</dt>
                                            <dd className="text-right text-gray-900">{show(v.heart_rate, " bpm")}</dd>
                                            <dt className="text-gray-500">Blood Pressure</dt>
                                            <dd className="text-right text-gray-900">{show(v.blood_pressure)}</dd>
                                            <dt className="text-gray-500">Temperature</dt>
                                            <dd className="text-right text-gray-900">{show(v.temperature, "°C")}</dd>
                                        </dl>
                                    </li>
                                ))}
                            </ul>

                            {/* DESKTOP: table */}
                            <div className="hidden border-t border-gray-100 md:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#f6faf8] text-xs uppercase tracking-wide text-gray-600">
                                        <tr>
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
                                            <th className="px-4 py-3 font-semibold">Height</th>
                                            <th className="px-4 py-3 font-semibold">Weight</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold">Heart Rate</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-semibold">Blood Pressure</th>
                                            <th className="px-4 py-3 font-semibold">Temp.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {withVitals.map((v) => (
                                            <tr key={v.record_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                                <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
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
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}