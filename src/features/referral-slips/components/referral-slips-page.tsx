import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, CalendarDays, Check, CheckCircle2, ClipboardList, Clock, DoorOpen, FileText, Files, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageReferrals } from "@/lib/permissions";
import ConfirmButton from "@/components/shared/confirm-button";
import ReferralForm, { type StudentOption } from "./referral-form";
import { archiveSlip, markReceived } from "@/features/referral-slips/actions";

type SlipRow = {
    slip_id: number;
    slip_type: string;
    student_number: string;
    last_name: string;
    first_name: string;
    program: string | null;
    grade_level: string | null;
    section: string | null;
    teacher_name: string | null;
    reason: string;
    status: string;
    slip_date: Date;
    time_issued: string;
};

type Props = {
    searchParams: Promise<{ tab?: string }>;
};

const BASE = "/dashboard/referral-slips";

const tabs = [
    { key: "teacher", label: "Teacher Referrals", icon: GraduationCap },
    { key: "gate", label: "Gate Passes", icon: DoorOpen },
    { key: "all", label: "All Slips", icon: Files },
];

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

const statusStyles: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
    received: { label: "Received", className: "bg-green-100 text-green-700" },
};

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table.
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:border-gray-100 md:py-0 md:last:border-0 md:hover:bg-[#f6faf8]";
const td =
    "flex items-start justify-between gap-3 px-3 py-1.5 text-right before:shrink-0 before:text-left before:text-sm before:font-semibold before:uppercase before:text-gray-600 before:content-[attr(data-label)] md:table-cell md:px-4 md:py-3.5 md:text-left md:align-middle md:before:hidden";

function to12Hour(value: string) {
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

export default async function ReferralSlipsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageReferrals(session.role);

    const params = await searchParams;
    const tab = tabs.some((t) => t.key === params.tab) ? params.tab! : "teacher";

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const timeNow = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Manila",
    }).format(new Date());

    const [students, slips] = await Promise.all([
        prisma.$queryRaw<StudentOption[]>`
        SELECT student_number, last_name, first_name, program, grade_level
        FROM students
        WHERE archived_at IS NULL
        ORDER BY last_name, first_name
        `,
        prisma.$queryRaw<SlipRow[]>`
        SELECT r.slip_id, r.slip_type, s.student_number, s.last_name, s.first_name,
                s.program, s.grade_level, r.section, r.teacher_name, r.reason,
                r.status, r.slip_date, r.time_issued
        FROM referral_slips r
        JOIN students s ON s.student_id = r.student_id
        WHERE r.archived_at IS NULL
            AND (${tab} = 'all' OR r.slip_type = ${tab})
            AND (${tab} = 'all' OR r.slip_date = CAST(${today} AS DATE))
        ORDER BY r.slip_date DESC, r.time_issued DESC, r.slip_id DESC
        `,
    ]);

    const longToday = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date());

    const pendingCount = slips.filter((s) => s.status === "pending").length;
    const receivedCount = slips.filter((s) => s.status === "received").length;
    const stats = [
        { label: tab === "all" ? "Total Slips" : "Issued Today", value: slips.length, icon: ClipboardList, tint: "bg-[#eef6f2] text-[#15664f]" },
        { label: "Pending", value: pendingCount, icon: Clock, tint: "bg-amber-100 text-amber-700" },
        { label: "Received", value: receivedCount, icon: CheckCircle2, tint: "bg-green-100 text-green-700" },
    ];

    const listTitle =
        tab === "all"
            ? "All Slips"
            : tab === "gate"
                ? "Today's Gate Passes"
                : "Today's Teacher Referrals";

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Referral Slips</h1>
                        <p className="text-sm text-gray-600">Issue teacher referrals and gate passes, and track their status.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm">
                        <CalendarDays className="h-4 w-4 text-[#15664f]" />
                        {longToday}
                    </span>
                    {!canEdit && (
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">View only</span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <nav className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border-2 border-[#cfe5d9] bg-white p-1 shadow-sm">
                {tabs.map((t) => {
                    const active = tab === t.key;
                    const Icon = t.icon;
                    return (
                        <Link
                            key={t.key}
                            href={`${BASE}?tab=${t.key}`}
                            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${active ? "bg-[#15664f] text-white shadow-sm" : "text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {t.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-3">
                {stats.map((st) => {
                    const Icon = st.icon;
                    return (
                        <div key={st.label} className={`${card} flex items-center gap-4 p-5`}>
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${st.tint}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">{st.label}</p>
                                <p className="text-2xl font-bold text-gray-900">{st.value}</p>
                            </div>
                        </div>
                    );
                })}
            </section>

            <div className={`grid gap-6 ${canEdit && tab !== "all" ? "xl:grid-cols-2" : ""}`}>
                {canEdit && tab !== "all" && (
                    <section className={`${card} min-w-0 self-start p-5 md:p-6`}>
                        <div className="mb-5 flex items-start gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {tab === "gate" ? "Issue Gate Pass" : "Issue Referral Slip"}
                                </h2>
                                <p className="text-sm text-gray-600">
                                    {tab === "gate" ? "Clinic to Gate" : "Teacher to Clinic"}
                                </p>
                            </div>
                        </div>
                        <ReferralForm
                            slipType={tab === "gate" ? "gate" : "teacher"}
                            students={students}
                            today={today}
                            timeNow={timeNow}
                        />
                    </section>
                )}

                <section className={`${card} min-w-0 self-start overflow-hidden`}>
                    <div className="flex items-center justify-between gap-3 p-5 md:px-6">
                        <h2 className="text-lg font-semibold text-gray-900">{listTitle}</h2>
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                            {slips.length} slip{slips.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    {slips.length === 0 ? (
                        <div className="flex flex-col items-center border-t border-gray-100 p-10 text-center">
                            <FileText className="h-12 w-12 text-[#15664f]/30" />
                            <p className="mt-3 text-base font-semibold text-gray-800">No slips to show</p>
                            <p className="mt-1 text-sm text-gray-600">
                                {canEdit && tab !== "all"
                                    ? "Issued slips for today will appear here."
                                    : "There are no slips in this list yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="border-t border-gray-100 p-3 md:overflow-x-auto md:p-0">
                            <table className="block w-full text-left text-sm md:table">
                                <thead className="hidden bg-[#f6faf8] text-sm uppercase tracking-wide text-gray-600 md:table-header-group">
                                    <tr className="border-b border-gray-200">
                                        <th className="whitespace-nowrap px-4 py-3 font-semibold">Time</th>
                                        <th className="px-4 py-3 font-semibold">Student</th>
                                        <th className="px-4 py-3 font-semibold">
                                            {tab === "gate" ? "Reason" : tab === "all" ? "Teacher / Reason" : "Teacher"}
                                        </th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        {canEdit && <th className="px-4 py-3 font-semibold">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="block md:table-row-group">
                                    {slips.map((s) => {
                                        const badge = statusStyles[s.status] ?? {
                                            label: s.status,
                                            className: "bg-gray-100 text-gray-600",
                                        };
                                        const classInfo = [s.program, s.grade_level, s.section]
                                            .filter(Boolean)
                                            .join(" ");
                                        return (
                                            <tr key={s.slip_id} className={tr}>
                                                <td data-label="Time" className={`${td} text-gray-600 md:whitespace-nowrap`}>
                                                    <div>
                                                        {tab === "all" && (
                                                            <span
                                                                className={`mb-1 inline-block rounded-full px-2 py-0.5 text-sm font-semibold uppercase ${s.slip_type === "gate"
                                                                    ? "bg-amber-300 text-gray-900"
                                                                    : "bg-[#15664f] text-white"
                                                                    }`}
                                                            >
                                                                {s.slip_type === "gate" ? "Gate Pass" : "Referral"}
                                                            </span>
                                                        )}
                                                        {to12Hour(s.time_issued)}
                                                        {tab === "all" && (
                                                            <p className="text-sm text-gray-600">{formatDate(s.slip_date)}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td data-label="Student" className={td}>
                                                    <div className="min-w-0 md:flex md:items-center md:gap-3">
                                                        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f] md:flex">
                                                            {`${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase()}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="break-words font-semibold text-gray-900">
                                                                {s.first_name} {s.last_name}
                                                            </p>
                                                            <p className="text-sm text-gray-600">{classInfo || s.student_number}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td
                                                    data-label={s.slip_type === "gate" ? "Reason" : "Teacher"}
                                                    className={`${td} break-words text-gray-600`}
                                                >
                                                    {s.slip_type === "gate" ? s.reason : (s.teacher_name ?? "—")}
                                                </td>
                                                <td data-label="Status" className={td}>
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                {canEdit && (
                                                    <td data-label="Actions" className={`${td} md:whitespace-nowrap md:pr-0`}>
                                                        <div className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
                                                            {s.status === "pending" && (
                                                                <form action={markReceived}>
                                                                    <input type="hidden" name="slipId" value={s.slip_id} />
                                                                    <button
                                                                        type="submit"
                                                                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                                                    >
                                                                        <Check className="h-3.5 w-3.5" />
                                                                        Received
                                                                    </button>
                                                                </form>
                                                            )}
                                                            <form action={archiveSlip}>
                                                                <input type="hidden" name="slipId" value={s.slip_id} />
                                                                <ConfirmButton
                                                                    title="Archive slip"
                                                                    confirmLabel="Archive"
                                                                    message={`Archive this slip for ${s.first_name} ${s.last_name}?`}
                                                                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                                                                >
                                                                    <Archive className="h-3.5 w-3.5" />
                                                                    Archive
                                                                </ConfirmButton>
                                                            </form>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}