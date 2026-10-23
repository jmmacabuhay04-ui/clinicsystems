// Profile view ng isang employee sa Employee Health Records:
// profile card, tabs (Health History / Case Reports / Archive Logs), at visit table.
import Link from "next/link";
import RecordAvatar from "@/components/shared/record-avatar";
import {
    Activity,
    Archive,
    ArrowLeft,
    CalendarDays,
    ClipboardCheck,
    HeartPulse,
    Pencil,
    Plus,
    Ruler,
    Stethoscope,
    Thermometer,
    UserRound,
    Weight,
} from "lucide-react";
import ConfirmButton from "@/components/shared/confirm-button";
import ConfirmLink from "@/components/shared/confirm-link";
import { archiveDental } from "@/features/dental-records/actions";
import { archiveCase } from "@/features/case-reports/case-actions";
import { archiveEmployeeRecord } from "@/features/employee-health-records/record-actions";
import { archiveEmployee } from "@/features/employee-health-records/employee-actions";
import { PAST_HISTORY } from "@/features/employee-health-form/form-data";
import { formatDate, show } from "@/features/student-health-records/format";

const BASE = "/dashboard/employee-health-records";
const CASES = "/dashboard/health-case-reports";
const ARCHIVE = "/dashboard/archive-records";
const GREEN = "#15664f";

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    referred: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
};

export type SelectedEmployee = {
    employee_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    department: string | null;
    position: string | null;
    date_of_birth: Date | null;
    gender: string | null;
    contact_number: string | null;
    email: string | null;
};

export type EmployeeExtras = {
    avatar: string | null;
    address: string | null;
    past_history: Record<string, string> | null;
};

export type RecordRow = {
    record_id: number;
    visit_date: Date;
    complaint: string;
    action_taken: string | null;
    attending_staff: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    heart_rate: number | null;
    blood_pressure: string | null;
    temperature: number | null;
};

export type CaseRow = {
    case_id: number;
    case_number: string;
    complaint: string;
    report_date: Date;
    staff_name: string | null;
    status: string;
    notes: string | null;
};

export type ArchivedItem = {
    key: string;
    kind: "visit" | "case" | "dental";
    date: Date;
    /** Complaint (visit/case) o procedure (dental) */
    complaint: string;
    archived_at: Date;
    caseNumber: string | null;
};

// One row of the merged Visit History table. A clinic visit and a health
// case report are stored in different tables, so they are normalised here
// into a single shape before being sorted together by date.
type VisitItem = {
    key: string;
    kind: "visit" | "case";
    id: number;
    date: Date;
    complaint: string;
    detail: string | null;
    staff: string | null;
    caseNumber: string | null;
    status: string | null;
};

export type RecordTab = "history" | "cases" | "dental" | "archive";

/** Isang dental record ng pasyente (para sa Dental Records tab). */
export type DentalRow = {
    dental_id: number;
    visit_date: Date;
    procedure_name: string;
    tooth: string | null;
    dentist_name: string | null;
    status: string;
};

type Props = {
    employee: SelectedEmployee;
    extras: EmployeeExtras;
    records: RecordRow[];
    cases: CaseRow[];
    archived: ArchivedItem[];
    dental?: DentalRow[];
    /** Puwedeng mag-edit/archive ng dental record (dentist, nurse, admin) */
    canEditDental?: boolean;
    tab: RecordTab;
    historyOnly: boolean;
    /** Galing sa dashboard: ang record na ipapakita lang */
    recordId?: number;
    backHref: string;
    canEdit: boolean;
    canEditEmployee: boolean;
};

// ------------------------------------------------------------------ small parts

function TypeBadges({ v }: { v: VisitItem }) {
    if (v.kind === "visit") {
        return (
            <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                Clinic Visit
            </span>
        );
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap rounded-full bg-[#eef6f2] px-2.5 py-0.5 text-xs font-medium text-[#15664f]">
                Case {v.caseNumber}
            </span>
            <StatusBadge status={v.status} />
        </div>
    );
}

function StatusBadge({ status }: { status: string | null }) {
    return (
        <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status ?? ""] ?? "bg-gray-100 text-gray-700"}`}
        >
            {status}
        </span>
    );
}

function VisitActions({ v, padded }: { v: VisitItem; padded?: boolean }) {
    const py = padded ? "py-1 " : "";
    if (v.kind === "visit") {
        return (
            <>
                <ConfirmLink
                    href={`${BASE}/edit?record=${v.id}`}
                    title="Edit visit record"
                    message={`Edit this visit (${formatDate(v.date)} - ${v.complaint})?`}
                    confirmLabel="Edit"
                    className={`inline-flex items-center gap-1 ${py}font-medium text-[#15664f] hover:underline`}
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                </ConfirmLink>
                <form action={archiveEmployeeRecord}>
                    <input type="hidden" name="recordId" value={v.id} />
                    <ConfirmButton
                        title="Archive visit record"
                        confirmLabel="Archive"
                        message={`Archive this visit (${formatDate(v.date)} - ${v.complaint})? It will move to Archive Records. You can restore it later.`}
                        className={`inline-flex items-center gap-1 ${py}font-medium text-amber-700 hover:underline`}
                    >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                    </ConfirmButton>
                </form>
            </>
        );
    }
    return (
        <ConfirmLink
            href={`${CASES}/edit?case=${v.id}`}
            title="Open case report"
            message={`Open case ${v.caseNumber} (${v.complaint})? You will be taken to Health Case Reports.`}
            confirmLabel="Open"
            className={`inline-flex items-center gap-1 ${py}font-medium text-[#15664f] hover:underline`}
        >
            <Pencil className="h-3.5 w-3.5" />
            Open case
        </ConfirmLink>
    );
}

/** Label sa kaliwa, value sa kanan (gaya ng nasa design). */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-1.5 text-sm">
            <dt className="text-gray-500">{label}</dt>
            <dd className="min-w-0 break-words text-gray-900">{value}</dd>
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
            <h3 className="mb-2 text-base font-semibold text-gray-900">{title}</h3>
            {children}
        </section>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="p-8 text-center text-sm text-gray-500">{children}</p>;
}

// ------------------------------------------------------------------ tables

function VisitTable({ visits, canEdit }: { visits: VisitItem[]; canEdit: boolean }) {
    if (visits.length === 0) return <Empty>No clinic visits recorded yet.</Empty>;

    return (
        <>
            {/* MOBILE: card list */}
            <ul className="space-y-2 p-3 md:hidden">
                {visits.map((v) => (
                    <li key={v.key} className="rounded-lg border border-gray-300 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <TypeBadges v={v} />
                            <span className="text-xs text-gray-600">{formatDate(v.date)}</span>
                        </div>
                        <p className="mt-2 break-words text-sm font-semibold text-gray-900">{v.complaint}</p>
                        <dl className="mt-1 space-y-1">
                            <div className="flex gap-2 text-sm">
                                <dt className="w-20 shrink-0 text-gray-500">Action</dt>
                                <dd className="min-w-0 flex-1 break-words text-gray-900">{v.detail || "—"}</dd>
                            </div>
                            <div className="flex gap-2 text-sm">
                                <dt className="w-20 shrink-0 text-gray-500">Staff</dt>
                                <dd className="min-w-0 flex-1 break-words text-gray-900">{v.staff || "—"}</dd>
                            </div>
                        </dl>
                        {canEdit && (
                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-gray-100 pt-2 text-sm">
                                <VisitActions v={v} padded />
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            {/* DESKTOP: table */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#EEEEEE] text-[#15664f]">
                        <tr>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Complaint</th>
                            <th className="px-4 py-3 font-medium">Action Taken</th>
                            <th className="px-4 py-3 font-medium">Attending Staff</th>
                            {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {visits.map((v) => (
                            <tr key={v.key} className="border-t border-gray-100">
                                <td className="whitespace-nowrap px-4 py-3 text-gray-900">{formatDate(v.date)}</td>
                                <td className="whitespace-nowrap px-4 py-3">
                                    <TypeBadges v={v} />
                                </td>
                                <td className="px-4 py-3 text-gray-900">{v.complaint}</td>
                                <td className="px-4 py-3 text-gray-900">{v.detail || "—"}</td>
                                <td className="px-4 py-3 text-gray-900">{v.staff || "—"}</td>
                                {canEdit && (
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <VisitActions v={v} />
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function CaseTable({ cases, canEdit, archiveReturnTo }: { cases: CaseRow[]; canEdit: boolean; archiveReturnTo: string }) {
    if (cases.length === 0) return <Empty>No health case reports for this employee.</Empty>;

    // Open case + Archive (pagka-archive, diretso sa Archive Logs tab)
    const actions = (c: CaseRow) => (
        <>
            <ConfirmLink
                href={`${CASES}/edit?case=${c.case_id}`}
                title="Open case report"
                message={`Open case ${c.case_number} (${c.complaint})? You will be taken to Health Case Reports.`}
                confirmLabel="Open"
                className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
            >
                <Pencil className="h-3.5 w-3.5" />
                Open case
            </ConfirmLink>
            {canEdit && (
                <form action={archiveCase}>
                    <input type="hidden" name="caseId" value={c.case_id} />
                    <input type="hidden" name="returnTo" value={archiveReturnTo} />
                    <ConfirmButton
                        title="Archive case report"
                        confirmLabel="Archive"
                        message={`Archive case ${c.case_number} (${c.complaint})? It will move to Archive Logs. You can restore it later in Archive Records.`}
                        className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                    >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                    </ConfirmButton>
                </form>
            )}
        </>
    );

    return (
        <>
            {/* MOBILE: card list */}
            <ul className="space-y-2 p-3 md:hidden">
                {cases.map((c) => (
                    <li key={c.case_id} className="rounded-lg border border-gray-300 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-full bg-[#eef6f2] px-2.5 py-0.5 text-xs font-semibold text-[#15664f]">
                                Case {c.case_number}
                            </span>
                            <StatusBadge status={c.status} />
                        </div>
                        <p className="mt-2 break-words text-sm font-semibold text-gray-900">{c.complaint}</p>
                        <p className="mt-0.5 text-xs text-gray-600">
                            {formatDate(c.report_date)} · {c.staff_name || "—"}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-gray-100 pt-2 text-sm">
                            {actions(c)}
                        </div>
                    </li>
                ))}
            </ul>

            {/* DESKTOP: table */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#EEEEEE] text-[#15664f]">
                        <tr>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Complaint</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Staff</th>
                            <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cases.map((c) => (
                            <tr key={c.case_id} className="border-t border-gray-100">
                                <td className="whitespace-nowrap px-4 py-3 text-gray-900">{formatDate(c.report_date)}</td>
                                <td className="px-4 py-3 text-gray-900">{c.complaint}</td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={c.status} />
                                </td>
                                <td className="px-4 py-3 text-gray-900">{c.staff_name || "—"}</td>
                                <td className="whitespace-nowrap px-4 py-3">
                                    <div className="flex items-center gap-3">{actions(c)}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function DentalStatus({ status }: { status: string }) {
    const followUp = status === "follow-up";
    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${followUp ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
                }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${followUp ? "bg-amber-500" : "bg-green-500"}`} />
            {followUp ? "Follow-up" : "Completed"}
        </span>
    );
}

// Lahat ng 28 ngipin: "Full mouth" na lang
function toothText(value: string | null) {
    if (!value || !value.trim()) return "—";
    if (/full\s*mouth/i.test(value) || value.replace(/\s/g, "") === "#11-17,#21-27,#31-37,#41-47") return "Full mouth";
    return value;
}

function DentalTable({ rows, patientParam, canEdit }: { rows: DentalRow[]; patientParam: string; canEdit: boolean }) {
    if (rows.length === 0) return <Empty>No dental records for this employee.</Empty>;

    // Pagkatapos i-archive, babalik dito sa Dental Records tab
    const kindKey = patientParam.split("=")[0];
    const returnTo = `/dashboard/${kindKey}-health-records?${patientParam}&tab=dental`;
    // Pagka-archive: diretso sa Archive Logs tab para makita ang na-archive
    const archiveReturnTo = `/dashboard/${kindKey}-health-records?${patientParam}&tab=archive`;

    const actions = (d: DentalRow) =>
        canEdit ? (
            <>
                <ConfirmLink
                    href={`/dashboard/dental-records/edit?record=${d.dental_id}&back=${encodeURIComponent(returnTo)}`}
                    title="Edit dental record"
                    message={`Edit this dental record (${formatDate(d.visit_date)} - ${d.procedure_name})?`}
                    confirmLabel="Edit"
                    className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                </ConfirmLink>
                <form action={archiveDental}>
                    <input type="hidden" name="dentalId" value={d.dental_id} />
                    <input type="hidden" name="returnTo" value={archiveReturnTo} />
                    <ConfirmButton
                        title="Archive dental record"
                        confirmLabel="Archive"
                        message={`Archive this dental record (${formatDate(d.visit_date)} - ${d.procedure_name})? It will move to Archive Logs. You can restore it later in Archive Records.`}
                        className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                    >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                    </ConfirmButton>
                </form>
            </>
        ) : (
            <span className="text-gray-400">—</span>
        );

    return (
        <>
            {/* MOBILE: card list */}
            <ul className="space-y-2 p-3 md:hidden">
                {rows.map((d) => (
                    <li key={d.dental_id} className="rounded-lg border border-gray-300 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-gray-600">{formatDate(d.visit_date)}</span>
                            <DentalStatus status={d.status} />
                        </div>
                        <p className="mt-2 break-words text-sm font-semibold text-gray-900 first-letter:uppercase">{d.procedure_name}</p>
                        <p className="mt-0.5 text-xs text-gray-600">
                            Tooth: {toothText(d.tooth)} · {d.dentist_name || "—"}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-gray-100 pt-2 text-sm">
                            {actions(d)}
                        </div>
                    </li>
                ))}
            </ul>

            {/* DESKTOP: table */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#EEEEEE] text-[#15664f]">
                        <tr>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Procedure</th>
                            <th className="px-4 py-3 font-medium">Tooth</th>
                            <th className="px-4 py-3 font-medium">Dentist</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((d) => (
                            <tr key={d.dental_id} className="border-t border-gray-100">
                                <td className="whitespace-nowrap px-4 py-3 text-gray-900">{formatDate(d.visit_date)}</td>
                                <td className="px-4 py-3 font-medium text-gray-900 first-letter:uppercase">{d.procedure_name}</td>
                                <td className="max-w-[14rem] px-4 py-3 text-gray-900">{toothText(d.tooth)}</td>
                                <td className="px-4 py-3 text-gray-900">{d.dentist_name || "—"}</td>
                                <td className="px-4 py-3">
                                    <DentalStatus status={d.status} />
                                </td>
                                <td className="whitespace-nowrap px-4 py-3">
                                    <div className="flex items-center gap-3">{actions(d)}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function ArchiveTable({ items }: { items: ArchivedItem[] }) {
    if (items.length === 0) return <Empty>No archived records for this employee.</Empty>;

    return (
        <div>
            {/* MOBILE: card list */}
            <ul className="space-y-2 p-3 md:hidden">
                {items.map((a) => (
                    <li key={a.key} className="rounded-lg border border-gray-300 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-700">
                                {a.kind === "visit" ? "Clinic Visit" : a.kind === "dental" ? "Dental Record" : `Case ${a.caseNumber}`}
                            </span>
                            <span className="text-xs text-gray-600">Archived {formatDate(a.archived_at)}</span>
                        </div>
                        <p className="mt-2 break-words text-sm font-semibold text-gray-900">{a.complaint}</p>
                        <p className="mt-0.5 text-xs text-gray-600">Record date: {formatDate(a.date)}</p>
                    </li>
                ))}
            </ul>

            {/* DESKTOP: table */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#EEEEEE] text-[#15664f]">
                        <tr>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Archived On</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Record Date</th>
                            <th className="px-4 py-3 font-medium">Complaint</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((a) => (
                            <tr key={a.key} className="border-t border-gray-100">
                                <td className="whitespace-nowrap px-4 py-3 text-gray-900">{formatDate(a.archived_at)}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                    {a.kind === "visit" ? "Clinic Visit" : a.kind === "dental" ? "Dental Record" : `Case ${a.caseNumber}`}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-900">{formatDate(a.date)}</td>
                                <td className="px-4 py-3 text-gray-900">{a.complaint}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="border-t border-gray-100 px-4 py-3 text-right text-sm">
                <Link href={ARCHIVE} className="font-medium text-[#15664f] hover:underline">
                    Go to Archive Records to restore
                </Link>
            </p>
        </div>
    );
}

// ------------------------------------------------------------------ main view

export default function EmployeeRecordView({
    employee,
    extras,
    records,
    cases,
    archived,
    dental = [],
    canEditDental = false,
    tab,
    historyOnly,
    recordId = 0,
    backHref,
    canEdit,
    canEditEmployee,
}: Props) {
    // Clinic visits and case reports shown as one timeline, newest first.
    const visits: VisitItem[] = [
        ...records.map((r) => ({
            key: `visit-${r.record_id}`,
            kind: "visit" as const,
            id: r.record_id,
            date: r.visit_date,
            complaint: r.complaint,
            detail: r.action_taken,
            staff: r.attending_staff,
            caseNumber: null,
            status: null,
        })),
        ...cases.map((c) => ({
            key: `case-${c.case_id}`,
            kind: "case" as const,
            id: c.case_id,
            date: c.report_date,
            complaint: c.complaint,
            detail: c.notes,
            staff: c.staff_name,
            caseNumber: c.case_number,
            status: c.status,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const fullName = `${employee.first_name}${employee.middle_name ? ` ${employee.middle_name}` : ""} ${employee.last_name}`;
    const initials = `${employee.first_name[0] ?? ""}${employee.last_name[0] ?? ""}`.toUpperCase();
    const level = [employee.position, employee.department].filter(Boolean).join(" - ");

    const tabHref = (t: RecordTab) => {
        const url = new URL(backHref, "http://x");
        const sp = new URLSearchParams(url.search);
        sp.set("employee", employee.employee_number);
        if (t === "history") sp.delete("tab");
        else sp.set("tab", t);
        return `${BASE}?${sp.toString()}`;
    };

    // --- Health Information (galing sa Employee Health Form) ---
    const past = extras.past_history ?? {};
    const hasForm = extras.past_history !== null;
    const conditions = PAST_HISTORY.filter((i) => i.key !== "allergy" && past[i.key] === "yes").map(
        (i) => i.label,
    );
    const allergy = !hasForm ? "—" : past.allergy === "yes" ? "Yes" : "None";

    // Vital signs are only recorded on clinic visits, not on case reports.
    const latestVitals = records.find(
        (r) =>
            r.height_cm !== null ||
            r.weight_kg !== null ||
            r.heart_rate !== null ||
            r.blood_pressure !== null ||
            r.temperature !== null,
    );
    // Pinakabagong entry: clinic visit O case report (kung alin ang mas bago)
    const latest = visits[0];
    // Temperature ay nasa clinic visit lang
    const latestRecord = latest?.kind === "visit" ? records.find((r) => r.record_id === latest.id) : undefined;

    const editEmployeeLink = canEditEmployee && (
        <ConfirmLink
            href={`/dashboard/employees/edit?employee=${encodeURIComponent(employee.employee_number)}`}
            title="Edit employee details"
            message={`Edit the details of ${employee.first_name} ${employee.last_name} (${employee.employee_number})? Changes will replace the current information.`}
            confirmLabel="Edit"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
        >
            <Pencil className="h-4 w-4" />
            Edit Record
        </ConfirmLink>
    );

    const addRecordLink = canEdit && (
        <ConfirmLink
            href={`${BASE}/new?employee=${encodeURIComponent(employee.employee_number)}`}
            title="Add visit record"
            message={`Add a new visit record for ${employee.first_name} ${employee.last_name} (${employee.employee_number})?`}
            confirmLabel="Continue"
            icon={<Plus className="h-5 w-5" />}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-semibold text-gray-900 shadow-sm hover:bg-amber-500"
        >
            <Plus className="h-4 w-4" />
            Add Record
        </ConfirmLink>
    );

    // Galing sa dashboard "View": Visit History lang ang ipapakita.
    if (historyOnly) {
        // Ang record lang na pinindot sa dashboard (o ang pinakabago kung wala)
        const one = records.find((r) => r.record_id === recordId) ?? records[0];
        const vitals = one
            ? [
                { label: "Height", value: show(one.height_cm, " cm"), icon: Ruler, tint: "bg-[#eef6f2] text-[#15664f]" },
                { label: "Weight", value: show(one.weight_kg, " kg"), icon: Weight, tint: "bg-amber-50 text-amber-700" },
                { label: "Heart Rate", value: show(one.heart_rate, " bpm"), icon: HeartPulse, tint: "bg-rose-50 text-rose-600" },
                { label: "Blood Pressure", value: show(one.blood_pressure), icon: Activity, tint: "bg-blue-50 text-blue-700" },
                { label: "Temperature", value: show(one.temperature, "°C"), icon: Thermometer, tint: "bg-orange-50 text-orange-600" },
            ]
            : [];
        const longDate = one
            ? new Date(one.visit_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
            })
            : "";

        return (
            <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
                <Link
                    href={backHref}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                </Link>

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Stethoscope className="h-10 w-10 shrink-0 text-[#15664f]" />
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Clinic Visit Record</h1>
                        <p className="text-sm text-gray-600">Details of this clinic visit.</p>
                    </div>
                </div>

                {/* Patient */}
                <section className="flex flex-col gap-4 rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                        {extras.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={extras.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full border-2 border-white object-cover shadow" />
                        ) : (
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white bg-amber-300 text-lg font-bold text-gray-900 shadow">
                                {initials}
                            </span>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="break-words text-lg font-semibold leading-tight text-gray-900">
                                    {employee.first_name} {employee.last_name}
                                </p>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${"bg-amber-300 text-gray-900"}`}>Employee</span>
                            </div>
                            <p className="mt-1 whitespace-nowrap text-sm text-gray-600">{employee.employee_number}</p>
                        </div>
                    </div>
                    {one && (
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#eef6f2] px-3 py-2 text-sm font-medium text-gray-800 sm:w-auto sm:shrink-0">
                            <CalendarDays className="h-4 w-4 shrink-0 text-[#15664f]" />
                            {longDate}
                        </span>
                    )}
                </section>

                {one ? (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        {/* Visit details */}
                        <section className="rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                                    <ClipboardCheck className="h-5 w-5" />
                                </span>
                                <h2 className="text-lg font-semibold text-gray-900">Visit Details</h2>
                            </div>
                            <div className="space-y-4 p-5">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Complaint</p>
                                    <p className="mt-1 text-xl font-bold capitalize text-gray-900">{one.complaint}</p>
                                </div>
                                <div className="rounded-lg bg-[#f6faf8] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Treatment / Action Taken
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                                        {one.action_taken || <span className="italic text-gray-400">No treatment recorded.</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                        <UserRound className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <p className="text-xs text-gray-500">Attending Staff</p>
                                        <p className="text-sm font-semibold text-gray-900">{show(one.attending_staff)}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Vital signs */}
                        <section className="rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                                    <HeartPulse className="h-5 w-5" />
                                </span>
                                <h2 className="text-lg font-semibold text-gray-900">Vital Signs</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3 p-5">
                                {vitals.map((vt) => {
                                    const Icon = vt.icon;
                                    return (
                                        <div key={vt.label} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${vt.tint}`}>
                                                <Icon className="h-5 w-5" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-xs text-gray-500">{vt.label}</p>
                                                <p className="truncate text-base font-bold text-gray-900">{vt.value}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-10 text-center text-sm text-gray-500">
                        This visit record could not be found. It may have been archived.
                    </div>
                )}
            </main>
        );
    }

    // Visit History: clinic visits lang (nasa Case Reports tab ang mga case)
    const clinicVisits = visits.filter((v) => v.kind === "visit");

    const tabs: { key: RecordTab; label: string; count: number }[] = [
        { key: "history", label: "Health History", count: clinicVisits.length },
        { key: "cases", label: "Case Reports", count: cases.length },
        { key: "dental", label: "Dental Records", count: dental.length },
        { key: "archive", label: "Archive Logs", count: archived.length },
    ];

    return (
        <main className="min-w-0 space-y-5 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Employee Health Record</h1>
                    <p className="mt-1 text-sm text-gray-600">View and manage the health records of an employee.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {addRecordLink}
                    {editEmployeeLink}
                    {!canEdit && !canEditEmployee && (
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                            View only
                        </span>
                    )}
                </div>
            </div>

            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to List
            </Link>

            {/* Profile card */}
            <section className="rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <RecordAvatar
                        type="employee"
                        id={employee.employee_id}
                        current={extras.avatar}
                        initials={initials}
                        canEdit={canEditEmployee}
                    />
                    <div className="min-w-0">
                        <h2 className="break-words text-xl font-semibold text-gray-900 md:text-2xl">{fullName}</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            {employee.employee_number}
                            {level && (
                                <>
                                    <span className="mx-2 text-gray-300">|</span>
                                    {level}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <dl className="mt-5 grid gap-x-10 border-t border-gray-100 pt-4 md:grid-cols-2">
                    <InfoRow label="Date of Birth" value={formatDate(employee.date_of_birth, "long")} />
                    <InfoRow label="Contact Number" value={show(employee.contact_number)} />
                    <InfoRow label="Gender" value={show(employee.gender)} />
                    <InfoRow label="Email Address" value={show(employee.email)} />
                    <InfoRow label="Address" value={show(extras.address)} />
                </dl>

                {canEditEmployee && (
                    <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
                        <form action={archiveEmployee}>
                            <input type="hidden" name="employeeId" value={employee.employee_id} />
                            <ConfirmButton
                                title="Archive employee"
                                confirmLabel="Archive"
                                message={`Archive ${employee.last_name}, ${employee.first_name} (${employee.employee_number})? Their portal login will stop working until restored.`}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:underline"
                            >
                                <Archive className="h-4 w-4" />
                                Archive this employee
                            </ConfirmButton>
                        </form>
                    </div>
                )}
            </section>

            {/* Tabs */}
            <nav className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-gray-200" aria-label="Record sections">
                {tabs.map((t) => {
                    const active = t.key === tab;
                    return (
                        <Link
                            key={t.key}
                            href={tabHref(t.key)}
                            aria-current={active ? "page" : undefined}
                            className={`-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium ${active
                                ? "border-[#15664f] bg-[#15664f] text-white"
                                : "border-transparent text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                                }`}
                        >
                            {t.label}
                            <span
                                className={`ml-2 rounded-full px-1.5 text-xs ${active ? "bg-white/20" : "bg-gray-100 text-gray-600"}`}
                            >
                                {t.count}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {tab === "history" && (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card title="Health Information">
                            <dl>
                                <InfoRow label="Allergies" value={allergy} />
                                <InfoRow
                                    label="Medical History"
                                    value={!hasForm ? "—" : conditions.length ? conditions.join(", ") : "None"}
                                />
                                <InfoRow label="Height / Weight" value={`${show(latestVitals?.height_cm, " cm")} / ${show(latestVitals?.weight_kg, " kg")}`} />
                                <InfoRow label="Blood Pressure" value={show(latestVitals?.blood_pressure)} />
                                <InfoRow label="Last Check-up" value={latest ? formatDate(latest.date) : "—"} />
                            </dl>
                            {!hasForm && (
                                <p className="mt-2 text-xs text-gray-500">
                                    No Employee Health Form on file yet.{" "}
                                    <Link
                                        href={`/dashboard/employee-health-form?employee=${encodeURIComponent(employee.employee_number)}`}
                                        className="font-medium text-[#15664f] hover:underline"
                                    >
                                        Open form
                                    </Link>
                                </p>
                            )}
                        </Card>

                        <Card title="Latest Record">
                            {latest ? (
                                <dl>
                                    <InfoRow label="Date" value={formatDate(latest.date)} />
                                    <InfoRow
                                        label="Type"
                                        value={
                                            latest.kind === "visit"
                                                ? "Clinic Visit"
                                                : `Case ${latest.caseNumber}${latest.status ? ` (${latest.status.charAt(0).toUpperCase()}${latest.status.slice(1)})` : ""}`
                                        }
                                    />
                                    <InfoRow label="Complaint" value={latest.complaint} />
                                    <InfoRow label={latest.kind === "visit" ? "Treatment" : "Notes"} value={show(latest.detail)} />
                                    {latest.kind === "visit" && (
                                        <InfoRow label="Temperature" value={show(latestRecord?.temperature ?? null, "°C")} />
                                    )}
                                    <InfoRow label="Attending Staff" value={show(latest.staff)} />
                                </dl>
                            ) : (
                                <p className="py-6 text-center text-sm text-gray-500">No records yet.</p>
                            )}
                        </Card>
                    </div>

                    <section>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-semibold text-[#15664f]">Visit History</h2>
                            <p className="text-sm text-gray-700">All clinic visits, newest first. Case reports are in the Case Reports tab.</p>
                        </div>
                        <div className="overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                            <VisitTable visits={clinicVisits} canEdit={canEdit} />
                        </div>
                    </section>
                </>
            )}

            {tab === "cases" && (
                <>
                    {/* Kapareho ng Health History: dalawang card sa itaas, listahan sa ibaba */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card title="Case Summary">
                            <dl>
                                <InfoRow label="Total Cases" value={String(cases.length)} />
                                <InfoRow label="Pending" value={String(cases.filter((c) => c.status === "pending").length)} />
                                <InfoRow label="Referred" value={String(cases.filter((c) => c.status === "referred").length)} />
                                <InfoRow label="Resolved" value={String(cases.filter((c) => c.status === "resolved").length)} />
                                <InfoRow label="Last Case" value={cases[0] ? formatDate(cases[0].report_date) : "—"} />
                            </dl>
                        </Card>

                        <Card title="Latest Case Report">
                            {cases[0] ? (
                                <dl>
                                    <InfoRow label="Case No." value={cases[0].case_number} />
                                    <InfoRow label="Date" value={formatDate(cases[0].report_date)} />
                                    <InfoRow label="Complaint" value={cases[0].complaint} />
                                    <InfoRow label="Status" value={<StatusBadge status={cases[0].status} />} />
                                    <InfoRow label="Notes" value={show(cases[0].notes)} />
                                    <InfoRow label="Attending Staff" value={show(cases[0].staff_name)} />
                                </dl>
                            ) : (
                                <p className="py-6 text-center text-sm text-gray-500">No case reports yet.</p>
                            )}
                        </Card>
                    </div>

                    <section>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-semibold text-[#15664f]">Case History</h2>
                                <p className="text-sm text-gray-700">All health case reports, newest first.</p>
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                            <CaseTable
                                cases={cases}
                                canEdit={canEdit}
                                archiveReturnTo={`/dashboard/employee-health-records?employee=${encodeURIComponent(employee.employee_number)}&tab=archive`}
                            />
                        </div>
                    </section>
                </>
            )}

            {tab === "dental" && (
                <>
                    {/* Kapareho ng Health History: dalawang card sa itaas, listahan sa ibaba */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card title="Dental Summary">
                            <dl>
                                <InfoRow label="Total Visits" value={String(dental.length)} />
                                <InfoRow
                                    label="Follow-up"
                                    value={String(dental.filter((d) => d.status === "follow-up").length)}
                                />
                                <InfoRow label="Last Dental Visit" value={dental[0] ? formatDate(dental[0].visit_date) : "—"} />
                            </dl>
                        </Card>

                        <Card title="Latest Dental Record">
                            {dental[0] ? (
                                <dl>
                                    <InfoRow label="Date" value={formatDate(dental[0].visit_date)} />
                                    <InfoRow label="Procedure" value={dental[0].procedure_name} />
                                    <InfoRow label="Tooth" value={toothText(dental[0].tooth)} />
                                    <InfoRow label="Dentist" value={dental[0].dentist_name || "—"} />
                                    <InfoRow label="Status" value={<DentalStatus status={dental[0].status} />} />
                                </dl>
                            ) : (
                                <p className="py-6 text-center text-sm text-gray-500">No dental records yet.</p>
                            )}
                        </Card>
                    </div>

                    <section>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-semibold text-[#15664f]">Dental History</h2>
                            <p className="text-sm text-gray-700">All dental visits, newest first.</p>
                        </div>
                        <div className="overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                            <DentalTable canEdit={canEditDental} rows={dental} patientParam={`employee=${encodeURIComponent(employee.employee_number)}`} />
                        </div>
                    </section>
                </>
            )}

            {tab === "archive" && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <ArchiveTable items={archived} />
                </div>
            )}
        </main>
    );
}