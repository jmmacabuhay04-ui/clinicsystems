import { redirect } from "next/navigation";
import { Archive, CalendarDays, Check, CheckCircle2, ClipboardList, Clock, DoorOpen, FileText, Files, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageReferrals } from "@/lib/permissions";
import ConfirmButton from "@/components/shared/confirm-button";
import ReferralForm, { type StudentOption } from "./referral-form";
import PrintSlipButton from "./print-slip-button";
import TabSelect from "@/components/shared/tab-select";
import SlipDatePicker from "./slip-date-picker";
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
    subject: string | null;
    reason: string;
    status: string;
    slip_date: Date;
    time_issued: string;
};

type Props = {
    searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
};

const BASE = "/dashboard/referral-slips";

const tabs = [
    { key: "teacher", label: "Teacher Referrals", icon: GraduationCap },
    { key: "gate", label: "Gate Passes", icon: DoorOpen },
    { key: "all", label: "All Slips", icon: Files },
];

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

const statusStyles: Record<string, { label: string; className: string }> = {
    received: { label: "Received", className: "bg-green-100 text-green-700" },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
};

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
    const isAdmin = session.role.toLowerCase() === "admin";
    const longToday = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date());

    const params = await searchParams;
    // Admin (view only): All Slips lang ang tab. Iba (Nurse, Doctor...): lahat ng tab.
    const visibleTabs = canEdit ? tabs : tabs.filter((t) => t.key === "all");
    const tab = visibleTabs.some((t) => t.key === params.tab) ? params.tab! : visibleTabs[0].key;

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const timeNow = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Manila",
    }).format(new Date());

    // Petsa (kapareho ng picker ng Illness Alerts). Default: ngayong araw.
    // All Slips na walang napiling petsa: lahat ng petsa.
    const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today;
    const hasRange = isDay(params.from) && isDay(params.to);
    let from = hasRange ? params.from! : today;
    let to = hasRange ? params.to! : today;
    if (from > to) [from, to] = [to, from];
    const filterDates = hasRange || tab !== "all";
    const fmt = (v: string, withYear: boolean) =>
        new Date(`${v}T00:00:00Z`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            ...(withYear ? { year: "numeric" } : {}),
            timeZone: "UTC",
        });
    const isToday = filterDates && from === today && to === today;
    const rangeLabel = !filterDates
        ? "All dates"
        : from === to
            ? fmt(from, true)
            : `${fmt(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmt(to, true)}`;

    const [students, slips, countRows] = await Promise.all([
        prisma.$queryRaw<StudentOption[]>`
        SELECT student_number, last_name, first_name, program, grade_level
        FROM students
        WHERE archived_at IS NULL
        ORDER BY last_name, first_name
        `,
        prisma.$queryRaw<SlipRow[]>`
        SELECT r.slip_id, r.slip_type, s.student_number, s.last_name, s.first_name,
                s.program, s.grade_level, r.section, r.teacher_name, r.subject, r.reason,
                r.status, r.slip_date, r.time_issued
        FROM referral_slips r
        JOIN students s ON s.student_id = r.student_id
        WHERE r.archived_at IS NULL
            AND (${tab} = 'all' OR r.slip_type = ${tab})
            AND (${!filterDates} OR r.slip_date BETWEEN CAST(${from} AS DATE) AND CAST(${to} AS DATE))
        ORDER BY r.slip_date DESC, r.time_issued DESC, r.slip_id DESC
        `,
        // Bilang sa bawat tab: Teacher / Gate = ngayong araw, All = lahat
        prisma.$queryRaw<{ teacher: number; gate: number; all: number }[]>`
        SELECT
            COUNT(*) FILTER (WHERE slip_type = 'teacher' AND slip_date = CAST(${today} AS DATE))::int AS teacher,
            COUNT(*) FILTER (WHERE slip_type = 'gate' AND slip_date = CAST(${today} AS DATE))::int AS gate,
            COUNT(*)::int AS "all"
        FROM referral_slips
        WHERE archived_at IS NULL
        `,
    ]);

    const tabCounts: Record<string, number> = {
        teacher: countRows[0]?.teacher ?? 0,
        gate: countRows[0]?.gate ?? 0,
        all: countRows[0]?.all ?? 0,
    };

    const pendingCount = slips.filter((s) => s.status === "pending").length;
    const receivedCount = slips.filter((s) => s.status === "received").length;
    const stats = [
        { label: isToday ? "Issued Today" : tab === "all" ? "Total Slips" : "Issued", value: slips.length, icon: ClipboardList, bar: "bg-[#15664f]", tile: "bg-[#15664f]/10 text-[#15664f]" },
        { label: "Received", value: receivedCount, icon: CheckCircle2, bar: "bg-[#3fae86]", tile: "bg-[#3fae86]/15 text-[#2a8a67]" },
        { label: "Pending", value: pendingCount, icon: Clock, bar: "bg-red-500", tile: "bg-red-50 text-red-600" },
    ];

    const listTitle =
        tab === "all"
            ? "All Slips"
            : `${isToday ? "Today's " : ""}${tab === "gate" ? "Gate Passes" : "Teacher Referrals"}`;

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
                    {/* Admin: petsa ngayong araw (gaya ng dati). Ibang role: date picker na kapareho ng Illness Alerts. */}
                    {isAdmin ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm">
                            <CalendarDays className="h-4 w-4 text-[#15664f]" />
                            {longToday}
                        </span>
                    ) : (
                        <SlipDatePicker
                            from={from}
                            to={to}
                            today={today}
                            label={rangeLabel}
                            basePath={BASE}
                            query={`tab=${tab}`}
                        />
                    )}
                </div>
            </div>

            {/* Tabs */}
            {/* Phone: 3 pantay na tab sa iisang hilera */}
            {/* Dropdown (kapareho ng Reports): Teacher Referrals / Gate Passes / All Slips, may bilang */}
            <TabSelect
                label="Slip type"
                value={tab}
                options={visibleTabs.map((t) => {
                    const Icon = t.icon;
                    return { key: t.key, label: t.label, href: `${BASE}?tab=${t.key}`, count: tabCounts[t.key] ?? 0, icon: <Icon /> };
                })}
            />

            {/* Stats */}
            {/* Phone: 3 maliliit na card sa iisang hilera. Mas malaking screen: icon sa kaliwa. (Kapareho ng Clinic Staff) */}
            <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {stats.map((st) => {
                    const Icon = st.icon;
                    return (
                        <div
                            key={st.label}
                            className="relative flex min-w-0 flex-col items-start gap-2 overflow-hidden rounded-2xl border border-[#dcebe3] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:p-4"
                        >
                            <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${st.bar}`} />
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${st.tile}`}>
                                <Icon className="h-5 w-5" strokeWidth={1.9} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-2xl font-bold leading-tight text-gray-900 sm:text-[1.75rem]">{st.value}</p>
                                <p className="truncate text-sm font-medium text-gray-600">{st.label}</p>
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
                        <>
                            {/* PHONE: siksik na card bawat slip */}
                            {/* Bawat slip ay card (phone at desktop): pangalan at status sa itaas,
                                teacher at reason sa gitna, oras at mga button sa ibaba */}
                            <ul className="space-y-3 border-t border-gray-100 p-3 sm:p-4">
                                {slips.map((s) => {
                                    const badge = statusStyles[s.status] ?? { label: s.status, className: "bg-gray-100 text-gray-600" };
                                    const classInfo = [s.program, s.grade_level, s.section]
                                        .map((v) => (v ?? "").trim())
                                        .filter((v, i, arr) => v && arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i)
                                        .join(" ");
                                    return (
                                        <li key={s.slip_id} className="rounded-xl border border-[#dcebe3] bg-white p-4 shadow-sm">
                                            {/* Itaas: avatar + pangalan, status sa kanan */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f]">
                                                        {`${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase()}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="break-words font-semibold text-gray-900">
                                                            {s.first_name} {s.last_name}
                                                        </p>
                                                        <p className="text-sm text-gray-600">{[s.student_number, classInfo].filter(Boolean).join(" · ")}</p>
                                                    </div>
                                                </div>
                                                <span className={`shrink-0 rounded-full px-3 py-0.5 text-sm font-semibold ${badge.className}`}>
                                                    {badge.label}
                                                </span>
                                            </div>

                                            {/* Gitna: teacher (referral) at reason */}
                                            <div className="mt-3 rounded-lg bg-[#f6faf8] px-3 py-2">
                                                {s.slip_type !== "gate" && (
                                                    <p className="text-sm text-gray-600">
                                                        Teacher: <span className="font-semibold text-gray-900">{s.teacher_name ?? "—"}</span>
                                                        {s.subject ? <span> · {s.subject}</span> : null}
                                                    </p>
                                                )}
                                                <p className="break-words text-sm text-gray-900">{s.reason || "—"}</p>
                                            </div>

                                            {/* Ibaba: oras (at petsa kapag hindi ngayong araw) at mga button */}
                                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                <p className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <Clock className="h-4 w-4" />
                                                    {!isToday ? `${formatDate(s.slip_date)} · ` : ""}
                                                    {to12Hour(s.time_issued)}
                                                </p>
                                                {canEdit && (
                                                    <div className="flex flex-wrap items-center justify-end gap-2">
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
                                                        {/* Teacher Referrals / Gate Passes: Print. All Slips: Archive. */}
                                                        {tab === "all" ? (
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
                                                        ) : (
                                                            <PrintSlipButton
                                                                slip={{
                                                                    slipType: s.slip_type === "gate" ? "gate" : "teacher",
                                                                    studentName: `${s.first_name} ${s.last_name}`,
                                                                    studentNumber: s.student_number,
                                                                    program: s.program ?? "",
                                                                    yearLevel: s.grade_level ?? "",
                                                                    teacherName: s.teacher_name ?? "",
                                                                    subject: s.subject ?? "",
                                                                    reason: s.reason,
                                                                    date: new Date(s.slip_date).toISOString().slice(0, 10),
                                                                    time: String(s.time_issued).slice(0, 5),
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}