import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import WeekPicker from "./week-picker";

type CaseRow = {
    record_id: number;
    visit_date: Date;
    complaint: string;
    attending_staff: string | null;
    student_number: string;
    last_name: string;
    first_name: string;
};

type Props = {
    searchParams: Promise<{ week?: string }>;
};

const WARNING_THRESHOLD = 10;
const DANGER_THRESHOLD = 20;

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function keyOf(d: Date) {
    return d.toISOString().slice(0, 10);
}

function addDays(key: string, n: number) {
    const d = new Date(`${key}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return keyOf(d);
}

function mondayOf(key: string) {
    const d = new Date(`${key}T00:00:00Z`);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return keyOf(d);
}

function label(start: string, end: string) {
    const s = new Date(`${start}T00:00:00Z`);
    const e = new Date(`${end}T00:00:00Z`);
    const month = s.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    const endMonth = e.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    const sameMonth = month === endMonth;
    return sameMonth
        ? `${month} ${s.getUTCDate()}-${e.getUTCDate()}, ${e.getUTCFullYear()}`
        : `${month} ${s.getUTCDate()} - ${endMonth} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
}

function formatDay(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}

export default async function IllnessAlertsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const params = await searchParams;

    const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const thisMonday = mondayOf(todayKey);

    const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "")
        ? mondayOf(params.week!)
        : thisMonday;
    const weekEnd = addDays(weekStart, 4);

    const weeks = Array.from({ length: 8 }, (_, i) => {
        const start = addDays(thisMonday, -7 * i);
        return { value: start, label: label(start, addDays(start, 4)) };
    });

    const [studentRows, cases] = await Promise.all([
        prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM students WHERE archived_at IS NULL
    `,
        prisma.$queryRaw<CaseRow[]>`
      SELECT r.record_id, r.visit_date, r.complaint, r.attending_staff,
             s.student_number, s.last_name, s.first_name
      FROM health_records r
      JOIN students s ON s.student_id = r.student_id
      WHERE r.archived_at IS NULL
        AND r.visit_date BETWEEN CAST(${weekStart} AS DATE) AND CAST(${weekEnd} AS DATE)
      ORDER BY r.visit_date, r.record_id
    `,
    ]);

    const totalStudents = Number(studentRows[0]?.total ?? 0);
    const totalCases = cases.length;
    const infectionRate = totalStudents > 0 ? (totalCases / totalStudents) * 100 : 0;

    const breakdownMap = new Map<string, number>();
    for (const c of cases) {
        breakdownMap.set(c.complaint, (breakdownMap.get(c.complaint) ?? 0) + 1);
    }
    const breakdown = [...breakdownMap.entries()]
        .map(([illness, count]) => ({ illness, count }))
        .sort((a, b) => b.count - a.count);

    const daily = dayNames.map((name, i) => {
        const key = addDays(weekStart, i);
        const count = cases.filter((c) => keyOf(new Date(c.visit_date)) === key).length;
        return { name, count };
    });
    const maxDaily = Math.max(1, ...daily.map((d) => d.count));

    const level =
        infectionRate >= DANGER_THRESHOLD
            ? "outbreak"
            : infectionRate >= WARNING_THRESHOLD
                ? "warning"
                : "safe";

    const levels = {
        safe: {
            key: "safe",
            tab: "Safe Week",
            mode: "Face-to-Face",
            title: "Safe Week - Face-to-Face Classes Continue",
            note: "Illness rates are within normal range. Standard health protocols apply.",
            banner: "border-green-200 bg-green-50 text-green-800",
            icon: CheckCircle2,
            iconColor: "text-green-600",
        },
        warning: {
            key: "warning",
            tab: "Warning Week",
            mode: "Blended",
            title: "Warning Week - Blended Classes Recommended",
            note: "Illness rates are rising. Increase health monitoring and limit large gatherings.",
            banner: "border-amber-200 bg-amber-50 text-amber-800",
            icon: AlertTriangle,
            iconColor: "text-amber-600",
        },
        outbreak: {
            key: "outbreak",
            tab: "Outbreak Week",
            mode: "Online Classes",
            title: "Outbreak Week - Online Classes Recommended",
            note: "Illness rates exceeded the danger threshold. Consider suspending face-to-face classes.",
            banner: "border-red-200 bg-red-50 text-red-800",
            icon: ShieldAlert,
            iconColor: "text-red-600",
        },
    } as const;

    const current = levels[level];
    const Icon = current.icon;

    const stats = [
        { label: "Total Cases This Week", value: String(totalCases) },
        { label: "Infection Rate (%)", value: `${infectionRate.toFixed(1)}%` },
        { label: "Top Illness", value: breakdown[0]?.illness ?? "—" },
        { label: "Recommended Mode", value: current.mode },
    ];

    return (
        <main className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <h1 className="text-3xl font-semibold text-gray-900">Weekly Illness Alert Dashboard</h1>
                <WeekPicker weeks={weeks} current={weekStart} />
            </div>

            <div className="flex flex-wrap gap-3">
                {(["safe", "warning", "outbreak"] as const).map((key) => {
                    const active = level === key;
                    return (
                        <span
                            key={key}
                            className={`rounded-lg px-4 py-2 text-sm font-medium ${active
                                ? "bg-[#15664f] text-white"
                                : "border border-gray-200 bg-white text-gray-600"
                                }`}
                        >
                            {levels[key].tab}
                        </span>
                    );
                })}
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((s) => (
                    <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-600">{s.label}</p>
                        <p className="mt-2 break-words text-2xl font-semibold text-gray-900">{s.value}</p>
                    </div>
                ))}
            </section>

            <section className={`flex items-start gap-3 rounded-xl border p-4 ${current.banner}`}>
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${current.iconColor}`} />
                <div>
                    <p className="font-semibold">{current.title}</p>
                    <p className="mt-1 text-sm">{current.note}</p>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Illness Breakdown</h2>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        {breakdown.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-500">No cases this week.</p>
                        ) : (
                            <div className="space-y-5">
                                {breakdown.map((b) => {
                                    const pct = totalStudents > 0 ? (b.count / totalStudents) * 100 : 0;
                                    const barWidth = totalCases > 0 ? (b.count / totalCases) * 100 : 0;
                                    return (
                                        <div key={b.illness}>
                                            <div className="flex items-center justify-between gap-4 text-sm">
                                                <span className="font-medium text-gray-900">{b.illness}</span>
                                                <span className="shrink-0 text-gray-600">
                                                    {b.count} case{b.count === 1 ? "" : "s"} ({pct.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className="h-full rounded-full bg-[#15664f]"
                                                    style={{ width: `${barWidth}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Warning Threshold</span>
                                <span className="font-medium text-amber-600">{WARNING_THRESHOLD}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Danger Threshold</span>
                                <span className="font-medium text-red-600">{DANGER_THRESHOLD}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Daily Case Trend</h2>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex h-64 items-end gap-4">
                            {daily.map((d) => (
                                <div key={d.name} className="flex flex-1 flex-col items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">{d.count}</span>
                                    <div
                                        className="w-full rounded-t bg-[#15664f]"
                                        style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: "2px" }}
                                    />
                                    <span className="text-sm text-gray-600">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Weekly Case Log ({cases.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {cases.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No cases recorded this week.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Student Number</th>
                                        <th className="px-4 py-3 font-medium">Student</th>
                                        <th className="px-4 py-3 font-medium">Illness</th>
                                        <th className="px-4 py-3 font-medium">Attending Staff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cases.map((c) => (
                                        <tr key={c.record_id} className="border-t border-gray-100">
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {formatDay(c.visit_date)}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{c.student_number}</td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {c.last_name}, {c.first_name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">{c.complaint}</td>
                                            <td className="px-4 py-3 text-gray-700">{c.attending_staff ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}