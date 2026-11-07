import { redirect } from "next/navigation";
import { CalendarDays, ChevronRight, FileText, Lock, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student-session";
import StudentNav from "@/components/layout/student-nav";
import CaseReportTable from "@/features/case-reports/components/case-report-table";
import {
    getStudent,
    getVisits,
    getStudentDental,
    formatDate,
    initialsOf,
} from "@/features/student-portal/data";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

function ToothIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M7 3c-2.2 0-4 1.8-4 4.2 0 2 .8 3.3 1.5 4.6.6 1.2.9 2.6 1.1 4.2.3 2.4.8 5 2.4 5 1.3 0 1.6-1.8 2-3.6.3-1.4.8-2.4 2-2.4s1.7 1 2 2.4c.4 1.8.7 3.6 2 3.6 1.6 0 2.1-2.6 2.4-5 .2-1.6.5-3 1.1-4.2.7-1.3 1.5-2.6 1.5-4.6C21 4.8 19.2 3 17 3c-1.9 0-2.9 1-5 1S8.9 3 7 3z" />
        </svg>
    );
}

// Maliit na kahon ng petsa: "OCT" sa itaas, "15" sa ilalim
function DateBlock({ date, tint }: { date: Date; tint: string }) {
    const d = new Date(date);
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
    return (
        <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg ${tint}`}>
            <span className="text-sm font-semibold tracking-wide">{month}</span>
            <span className="text-xl font-bold leading-none">{day}</span>
        </div>
    );
}

function SectionHeader({
    title,
    href,
}: {
    title: string;
    href: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 p-5 pb-4">
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <a
                href={href}
                className="inline-flex items-center gap-0.5 text-sm font-semibold text-[#15664f] hover:underline"
            >
                View all
                <ChevronRight className="h-4 w-4" />
            </a>
        </div>
    );
}

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
    // Bilang ng health case reports (kapalit ng Latest Blood Pressure)
    const caseRows = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM health_case_reports
      WHERE student_id = ${student.student_id} AND archived_at IS NULL
    `;
    const caseCount = caseRows[0]?.total ?? 0;

    const dateToday = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date());
    const weekdayToday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Manila" }).format(new Date());
    const hour =
        Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date())) % 24;
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

    const subline = [student.student_number, student.program, student.grade_level].filter(Boolean).join(" · ");

    const stats = [
        { label: "Clinic Visits", value: String(visits.length), icon: <Stethoscope className="h-5 w-5" />, bar: "bg-[#15664f]", tint: "bg-[#15664f]/10 text-[#15664f]" },
        { label: "Dental Visits", value: String(dental.length), icon: <ToothIcon className="h-5 w-5" />, bar: "bg-[#f2b705]", tint: "bg-[#f2b705]/15 text-[#a67c00]" },
        { label: "Case Reports", value: String(caseCount), icon: <FileText className="h-5 w-5" />, bar: "bg-blue-500", tint: "bg-blue-50 text-blue-700" },
        { label: "Last Visit", value: lastVisit ? formatDate(lastVisit, "short") : "—", icon: <CalendarDays className="h-5 w-5" />, bar: "bg-[#15664f]", tint: "bg-[#15664f]/10 text-[#15664f]", small: true },
    ];

    return (
        <div className="min-h-screen bg-[#e7f3e2]">
            <StudentNav fullName={fullName} initials={initialsOf(student.first_name, student.last_name)} />

            <main className="mx-auto max-w-5xl space-y-6 p-4 pb-10 md:p-6">
                {/* Welcome banner: kapareho ng nurse dashboard (madilim na green, larawan ng BCAS sa kanan, logo at quote) */}
                <section
                    className="relative overflow-hidden rounded-2xl bg-[#10523f] px-5 py-3.5 text-white shadow-lg shadow-[#15664f]/20 sm:px-6 sm:py-4"
                    style={{
                        backgroundImage:
                            "linear-gradient(90deg, rgba(16,82,63,1) 0%, rgba(16,82,63,0.97) 40%, rgba(21,102,79,0.35) 70%, rgba(21,102,79,0.05) 100%), url('/banner.jpg')",
                        backgroundSize: "100% 100%, 62% auto",
                        backgroundPosition: "center, right 50%",
                        backgroundRepeat: "no-repeat",
                    }}
                >
                    {/* Kanan: BCAS logo (malaking screen lang) */}
                    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-36 items-center justify-center lg:flex">
                        <span className="relative drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/bcas.jpg" alt="" className="block h-20 w-20 rounded-full bg-white object-cover [clip-path:circle(49%)]" />
                        </span>
                    </div>

                    <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:gap-10 lg:pr-40">
                        {/* Kaliwa: pagbati, pangalan at petsa */}
                        <div className="min-w-0 md:w-80 md:shrink-0">
                            <p className="text-lg font-semibold text-white md:text-xl">{greeting},</p>
                            <h1 className="break-words text-2xl font-bold leading-tight text-amber-300 md:text-3xl">{fullName}!</h1>
                            {subline && <p className="mt-0.5 break-words text-sm text-white/85">{subline}</p>}
                            <p className="mt-2 flex items-center gap-2 text-base text-white/90">
                                <CalendarDays className="h-5 w-5" strokeWidth={1.8} />
                                <span className="font-semibold text-white">{dateToday}</span>
                                <span className="text-white/85">· {weekdayToday}</span>
                            </p>
                        </div>

                        {/* Gitna: quote na may dilaw na guhit sa ilalim */}
                        <div className="hidden text-lg italic leading-snug text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.45)] md:block">
                            <p>
                                <span className="text-amber-300">&ldquo;</span>A healthy student
                                <br />
                                <span className="pl-4">is a successful learner.</span>
                                <span className="text-amber-300">&rdquo;</span>
                            </p>
                            <svg aria-hidden viewBox="0 0 200 14" className="ml-8 mt-1 h-3 w-48">
                                <path d="M2 10 C 60 2, 140 2, 198 7" fill="none" stroke="#f2c94c" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                </section>

                {/* Stat cards */}
                <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                    {stats.map((s) => (
                        // Kapareho ng ibang page: puting card, may kulay na guhit sa itaas
                        <div key={s.label} className="relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-[#dcebe3] bg-white p-3 shadow-sm sm:p-4">
                            <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${s.bar}`} />
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${s.tint}`}>
                                {s.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-600">{s.label}</p>
                                <p
                                    className={`truncate font-bold text-gray-900 ${s.small ? "text-base md:text-lg" : "text-2xl"}`}
                                >
                                    {s.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Visits, Dental at Case Reports: isa-isang hanay; pahalang ang mga record sa loob */}
                <div className="space-y-6">
                    {/* Recent Visits */}
                    <section className={`${card} min-w-0 overflow-hidden`}>
                        <SectionHeader title="Recent Visits" href="/student/visits" />
                        {visits.length === 0 ? (
                            <div className="flex flex-col items-center border-t border-gray-100 p-8 text-center">
                                <Stethoscope className="h-10 w-10 text-[#15664f]/30" />
                                <p className="mt-2 text-sm text-gray-600">No clinic visits recorded yet.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 border-t border-gray-100">
                                {visits.slice(0, 3).map((v) => (
                                    <li key={v.record_id} className="flex items-center gap-4 px-5 py-3">
                                        <DateBlock date={v.visit_date} tint="bg-[#eef6f2] text-[#15664f]" />
                                        {/* Pahalang: complaint | petsa | staff */}
                                        <div className="grid min-w-0 flex-1 gap-0.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-4">
                                            <p className="break-words font-semibold capitalize text-gray-900">{v.complaint}</p>
                                            <p className="text-sm text-gray-600">{formatDate(v.visit_date)}</p>
                                            <p className="break-words text-sm text-gray-600">{v.attending_staff ? `Seen by ${v.attending_staff}` : "—"}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Recent Dental Visits */}
                    <section className={`${card} min-w-0 overflow-hidden`}>
                        <SectionHeader title="Recent Dental Visits" href="/student/dental" />
                        {dental.length === 0 ? (
                            <div className="flex flex-col items-center border-t border-gray-100 p-8 text-center">
                                <ToothIcon className="h-10 w-10 text-[#15664f]/30" />
                                <p className="mt-2 text-sm text-gray-600">No dental visits recorded yet.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 border-t border-gray-100">
                                {dental.slice(0, 3).map((r) => (
                                    <li key={r.dental_id} className="flex items-center gap-4 px-5 py-3">
                                        <DateBlock date={r.visit_date} tint="bg-[#fdf3cf] text-[#8a6500]" />
                                        {/* Pahalang: procedure | petsa | dentist */}
                                        <div className="grid min-w-0 flex-1 gap-0.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-4">
                                            <p className="break-words font-semibold capitalize text-gray-900">{r.procedure_name}</p>
                                            <p className="text-sm text-gray-600">{formatDate(r.visit_date)}</p>
                                            <p className="break-words text-sm text-gray-600">{r.dentist_name ? `Dentist: ${r.dentist_name}` : "—"}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Recent Case Reports */}
                    <CaseReportTable patientType="student" patientId={student.student_id} limit={3} viewAllHref="/student/case-reports" />
                </div>

                <p className="flex items-center justify-center gap-1.5 text-center text-sm text-gray-600">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    Your records are private and only visible to you and authorized clinic staff.
                </p>
            </main>
        </div>
    );
}