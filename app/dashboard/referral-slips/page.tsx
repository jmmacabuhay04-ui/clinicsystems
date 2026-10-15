import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageReferrals } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import ReferralForm, { type StudentOption } from "./referral-form";
import { archiveSlip, markReceived } from "./actions";

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
    { key: "teacher", label: "Teacher Referrals" },
    { key: "gate", label: "Gate Passes" },
    { key: "all", label: "All Slips" },
];

const statusStyles: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    received: { label: "Received", className: "bg-green-100 text-green-700" },
};

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table.
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:border-gray-100 md:py-0 md:last:border-0";
const td =
    "flex items-start justify-between gap-3 px-3 py-1.5 text-right before:shrink-0 before:text-left before:text-xs before:font-semibold before:uppercase before:text-gray-500 before:content-[attr(data-label)] md:table-cell md:px-0 md:py-4 md:pr-4 md:text-left md:before:hidden";

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

    const listTitle =
        tab === "all"
            ? "All Slips"
            : tab === "gate"
                ? "Today's Gate Passes"
                : "Today's Teacher Referrals";

    return (
        <main className="min-w-0 space-y-6 p-4 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Referral Slips</h1>
                    <p className="mt-1 text-sm text-gray-700 md:text-base">
                        Manage teacher referrals and gate passes
                    </p>
                </div>
                {!canEdit && (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-gray-200">
                {tabs.map((t) => {
                    const active = tab === t.key;
                    return (
                        <Link
                            key={t.key}
                            href={`${BASE}?tab=${t.key}`}
                            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${active
                                ? "border-[#15664f] text-[#15664f]"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {t.label}
                        </Link>
                    );
                })}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                {canEdit && tab !== "all" && (
                    <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
                        <h2 className="mb-5 text-lg font-semibold text-[#15664f]">
                            {tab === "gate" ? "Issue Gate Pass — Clinic to Gate" : "Issue Referral Slip — Teacher to Clinic"}
                        </h2>
                        <ReferralForm
                            slipType={tab === "gate" ? "gate" : "teacher"}
                            students={students}
                            today={today}
                            timeNow={timeNow}
                        />
                    </section>
                )}

                <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
                    <h2 className="mb-4 text-lg font-semibold text-[#15664f]">
                        {listTitle} ({slips.length})
                    </h2>

                    {slips.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-700">No slips to show.</p>
                    ) : (
                        <div className="md:overflow-x-auto">
                            <table className="block w-full text-left text-sm md:table">
                                <thead className="hidden text-[#15664f] md:table-header-group">
                                    <tr className="border-b border-gray-200">
                                        <th className="whitespace-nowrap pb-3 pr-4 font-medium">Time</th>
                                        <th className="pb-3 pr-4 font-medium">Student</th>
                                        <th className="pb-3 pr-4 font-medium">
                                            {tab === "gate" ? "Reason" : "Teacher"}
                                        </th>
                                        <th className="pb-3 pr-4 font-medium">Status</th>
                                        {canEdit && <th className="pb-3 font-medium">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="block md:table-row-group">
                                    {slips.map((s) => {
                                        const badge = statusStyles[s.status] ?? {
                                            label: s.status,
                                            className: "bg-gray-100 text-gray-700",
                                        };
                                        const classInfo = [s.program, s.grade_level, s.section]
                                            .filter(Boolean)
                                            .join(" ");
                                        return (
                                            <tr key={s.slip_id} className={tr}>
                                                <td data-label="Time" className={`${td} text-gray-700 md:whitespace-nowrap`}>
                                                    <div>
                                                        {to12Hour(s.time_issued)}
                                                        {tab === "all" && (
                                                            <p className="text-xs text-gray-400">{formatDate(s.slip_date)}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td data-label="Student" className={td}>
                                                    <div className="min-w-0">
                                                        <p className="break-words font-semibold text-gray-900">
                                                            {s.first_name} {s.last_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{classInfo || s.student_number}</p>
                                                    </div>
                                                </td>
                                                <td
                                                    data-label={tab === "gate" ? "Reason" : "Teacher"}
                                                    className={`${td} break-words text-gray-700`}
                                                >
                                                    {s.slip_type === "gate" ? s.reason : (s.teacher_name ?? "—")}
                                                </td>
                                                <td data-label="Status" className={td}>
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                {canEdit && (
                                                    <td data-label="Actions" className={`${td} md:whitespace-nowrap md:pr-0`}>
                                                        <div className="flex flex-wrap items-center justify-end gap-3 md:justify-start">
                                                            {s.status === "pending" && (
                                                                <form action={markReceived}>
                                                                    <input type="hidden" name="slipId" value={s.slip_id} />
                                                                    <button
                                                                        type="submit"
                                                                        className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
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
                                                                    className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
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