import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardCheck, NotebookPen, Pencil, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ConfirmLink from "@/components/shared/confirm-link";

type DetailRow = {
    dental_id: number;
    visit_date: Date;
    procedure_name: string;
    tooth: string | null;
    dentist_name: string | null;
    status: string;
    notes: string | null;
    patient_type: "student" | "employee";
    patient_number: string;
    last_name: string;
    first_name: string;
    avatar: string | null;
};

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

// Custom tooth icon (walang tooth icon ang lucide)
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
            <path d="M7 3C5 3 3.5 4.7 3.5 7C3.5 9 4.3 10.4 4.9 12C5.5 13.7 5.5 15.5 6 17.2C6.4 18.7 7.2 21 8.5 21C10 21 10.1 18.4 10.6 16.7C10.8 16 11.2 15.5 12 15.5C12.8 15.5 13.2 16 13.4 16.7C13.9 18.4 14 21 15.5 21C16.8 21 17.6 18.7 18 17.2C18.5 15.5 18.5 13.7 19.1 12C19.7 10.4 20.5 9 20.5 7C20.5 4.7 19 3 17 3C15.3 3 14.4 4 12 4C9.6 4 8.7 3 7 3Z" />
        </svg>
    );
}

/* ---------------- Tooth field -> listahan ng numero ---------------- */

const ALL_FDI = [1, 2, 3, 4].flatMap((q) => [1, 2, 3, 4, 5, 6, 7].map((p) => q * 10 + p));

// Binabasa ang "#11-17, #26" o "Full mouth" at ibinabalik ang mga numero ng ngipin.
function parseTeeth(value: string | null) {
    const found = new Set<number>();
    if (!value) return found;
    if (/full\s*mouth/i.test(value)) return new Set(ALL_FDI);
    for (const token of value.split(",")) {
        const range = token.trim().match(/^#?([1-4][1-7])\s*-\s*#?([1-4][1-7])$/);
        if (range) {
            const a = Number(range[1]);
            const b = Number(range[2]);
            if (Math.floor(a / 10) === Math.floor(b / 10) && a <= b) {
                for (let n = a; n <= b; n++) found.add(n);
            }
            continue;
        }
        for (const m of token.matchAll(/(?<!\d)([1-4][1-7])(?!\d)/g)) found.add(Number(m[1]));
    }
    return found;
}

// Maliit na tooth chart: itaas = 18..11 | 21..28, ibaba = 48..41 | 31..38 (7 bawat quadrant dito)
function ToothChart({ teeth }: { teeth: Set<number> }) {
    const upperRight = [17, 16, 15, 14, 13, 12, 11];
    const upperLeft = [21, 22, 23, 24, 25, 26, 27];
    const lowerRight = [47, 46, 45, 44, 43, 42, 41];
    const lowerLeft = [31, 32, 33, 34, 35, 36, 37];

    const cell = (n: number) => (
        <span
            key={n}
            className={`flex h-7 items-center justify-center rounded text-sm font-semibold sm:h-8 sm:rounded-md sm:text-sm ${teeth.has(n)
                ? "bg-[#15664f] text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-600"
                }`}
        >
            {n}
        </span>
    );

    const row = (right: number[], left: number[]) => (
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_6px_repeat(7,minmax(0,1fr))] gap-0.5 sm:gap-1">
            {right.map(cell)}
            <span className="mx-auto w-px bg-gray-300" />
            {left.map(cell)}
        </div>
    );

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-sm font-semibold uppercase tracking-wide text-gray-600">
                <span>Right</span>
                <span>Upper</span>
                <span>Left</span>
            </div>
            {row(upperRight, upperLeft)}
            <div className="border-t border-dashed border-gray-300" />
            {row(lowerRight, lowerLeft)}
            <div className="flex justify-between text-sm font-semibold uppercase tracking-wide text-gray-600">
                <span>Right</span>
                <span>Lower</span>
                <span>Left</span>
            </div>
        </div>
    );
}

function orDash(value: string | null | undefined) {
    return value === null || value === undefined || value.trim() === "" ? "—" : value;
}

export default async function DentalRecordDetail({
    dentalId,
    canEdit,
    backHref = "/dashboard",
}: {
    dentalId: number;
    canEdit: boolean;
    backHref?: string;
}) {
    const rows = await prisma.$queryRaw<DetailRow[]>`
    SELECT d.dental_id, d.visit_date, d.procedure_name, d.tooth, d.dentist_name, d.status, d.notes,
           CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
           COALESCE(s.student_number, e.employee_number) AS patient_number,
           COALESCE(s.last_name, e.last_name) AS last_name,
           COALESCE(s.first_name, e.first_name) AS first_name,
           COALESCE(s.avatar, e.avatar) AS avatar
    FROM dental_records d
    LEFT JOIN students s ON s.student_id = d.student_id
    LEFT JOIN employees e ON e.employee_id = d.employee_id
    WHERE d.dental_id = ${dentalId} AND d.archived_at IS NULL
    LIMIT 1
  `;
    const d = rows[0];

    const backLink = (
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            {backHref === "/dashboard"
                ? "Back to dashboard"
                : backHref.includes("health-records")
                    ? "Back to health record"
                    : "Back to dental records"}
        </Link>
    );

    if (!d) {
        return (
            <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
                {backLink}
                <div className="rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-10 text-center text-sm text-gray-600">
                    This dental record could not be found. It may have been archived.
                </div>
            </main>
        );
    }

    const isEmployee = d.patient_type === "employee";
    const fullName = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Unknown";
    const initials = fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    const longDate = new Date(d.visit_date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    });
    const followUp = d.status === "follow-up";
    const teeth = parseTeeth(d.tooth);
    const toothParts = (d.tooth ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {backLink}

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Dental Visit Record</h1>
                        <p className="text-sm text-gray-600">Details of this dental visit.</p>
                    </div>
                </div>
                {canEdit && (
                    <div className="flex w-full gap-2 sm:w-auto">
                        <ConfirmLink
                            href={`/dashboard/dental-records/edit?record=${d.dental_id}`}
                            title="Edit dental record"
                            message={`Edit this dental record (${d.procedure_name}) of ${fullName}?`}
                            confirmLabel="Edit"
                            icon={<Pencil className="h-5 w-5" />}
                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] sm:flex-none"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Record
                        </ConfirmLink>
                    </div>
                )}
            </div>

            {/* Patient: sa mobile, nasa ilalim ang petsa para hindi magpatong */}
            <section className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center`}>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    {d.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full border-2 border-white object-cover shadow" />
                    ) : (
                        <span
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white text-lg font-bold shadow ${isEmployee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                                }`}
                        >
                            {initials}
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="break-words text-lg font-semibold leading-tight text-gray-900">{fullName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${isEmployee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                                    }`}
                            >
                                {isEmployee ? "Employee" : "Student"}
                            </span>
                            <span className="whitespace-nowrap text-sm text-gray-600">{d.patient_number}</span>
                        </div>
                    </div>
                </div>
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#eef6f2] px-3 py-2 text-sm font-medium text-gray-800 sm:w-auto sm:shrink-0">
                    <CalendarDays className="h-4 w-4 shrink-0 text-[#15664f]" />
                    {longDate}
                </span>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* Procedure details */}
                <section className={card}>
                    <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                            <ClipboardCheck className="h-5 w-5" />
                        </span>
                        <h2 className="text-lg font-semibold text-gray-900">Procedure Details</h2>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">Procedure</p>
                                <p className="mt-1 break-words text-xl font-bold text-gray-900">{d.procedure_name}</p>
                            </div>
                            <span
                                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${followUp ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
                                    }`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full ${followUp ? "bg-amber-500" : "bg-green-500"}`} />
                                {followUp ? "Follow-up" : "Completed"}
                            </span>
                        </div>

                        <div className="rounded-lg bg-[#f6faf8] p-4">
                            <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gray-600">
                                <NotebookPen className="h-3.5 w-3.5" />
                                Notes
                            </p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">
                                {d.notes?.trim() ? d.notes : <span className="italic text-gray-600">No notes recorded.</span>}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                <UserRound className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm text-gray-600">Dentist</p>
                                <p className="text-sm font-semibold text-gray-900">{orDash(d.dentist_name)}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Teeth */}
                <section className={card}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                                <ToothIcon className="h-5 w-5" />
                            </span>
                            <h2 className="text-lg font-semibold text-gray-900">Teeth Treated</h2>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${teeth.size > 0 ? "bg-[#eef6f2] text-[#15664f]" : "bg-gray-100 text-gray-600"
                                }`}
                        >
                            {teeth.size === ALL_FDI.length ? "Full mouth" : `${teeth.size} ${teeth.size === 1 ? "tooth" : "teeth"}`}
                        </span>
                    </div>
                    <div className="space-y-4 p-4 sm:p-5">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">Tooth</p>
                            {toothParts.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {toothParts.map((t) => (
                                        <span
                                            key={t}
                                            className="rounded-md border border-[#cfe5d9] bg-[#f6faf8] px-2 py-0.5 text-sm font-semibold text-[#15664f]"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-1 text-sm italic text-gray-600">No tooth specified.</p>
                            )}
                        </div>
                        <div className="rounded-lg border border-gray-100 p-2 sm:p-3">
                            <ToothChart teeth={teeth} />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}