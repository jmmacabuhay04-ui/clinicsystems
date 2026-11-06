import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus, Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageDental, canManageRecords, canViewDental, canViewHealthRecords } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import AutoSubmitInput from "@/components/shared/auto-submit-input";
import ListPagination from "@/components/shared/list-pagination";
import CaseRecordDetail from "./case-record-detail";
import SearchInput from "@/components/shared/search-input";

type CaseRow = {
    case_id: number;
    case_number: string;
    patient_type: string;
    id_number: string | null;
    last_name: string | null;
    first_name: string | null;
    complaint: string;
    report_date: Date;
    staff_name: string | null;
    status: string;
    /** true = kusang nagawa mula sa isang Clinic Visit (V-), false = ginawa sa New Case Report (C-) */
    from_visit?: boolean;
    /** Dental lang: ngipin */
    tooth?: string | null;
};

/**
 * Report ID na makikita sa listahan:
 *   C-040 = Case report na ginawa sa "New Case Report"
 *   V-040 = Case report na kusang nagawa mula sa Clinic Visit
 *   D-012 = Dental report (may D- na)
 * Hindi binabago ang naka-save na case_number; sa pagpapakita lang ang titik.
 */
function reportId(c: CaseRow) {
    if (c.from_visit === undefined) return c.case_number; // dental
    // Walang taon sa ipinapakita: "2026-040" -> "C-040" o "V-040"
    const num = c.case_number.split("-").pop() ?? c.case_number;
    return `${c.from_visit ? "V" : "C"}-${num}`;
}

/** Report ID bilang may kulay na badge: V = green, C = blue, D = dilaw (kapareho ng Illness Alerts) */
function ReportIdBadge({ c }: { c: CaseRow }) {
    const tone =
        c.from_visit === undefined
            ? "bg-[#fdf3cf] text-[#8a6500]" // dental
            : c.from_visit
                ? "bg-[#e3f1ea] text-[#15664f]" // galing Clinic Visit
                : "bg-blue-50 text-blue-700"; // New Case Report
    return (
        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${tone}`}>
            {reportId(c)}
        </span>
    );
}

type Props = {
    searchParams: Promise<{
        kind?: string;
        status?: string;
        type?: string;
        source?: string;
        diagnosis?: string;
        q?: string;
        from?: string;
        to?: string;
        page?: string;
        /** Buksan ang isang case report (Case Report Record) */
        case?: string;
        /** "list" = galing sa listahang ito (babalik sa Report, hindi sa dashboard) */
        back?: string;
    }>;
};

// Dalawang uri ng report sa iisang page:
//  - Health (health case reports): Nurse at Doctor; Admin = view only
//  - Dental (dental records): Nurse at Dentist; Admin = view only
type Kind = "health" | "dental";
const DENTAL_STATUSES = ["completed", "follow-up"];
// Mga karaniwang procedure (kapareho ng Add Dental Record)
const COMMON_PROCEDURES = [
    "Oral prophylaxis (Cleaning)",
    "Tooth extraction",
    "Temporary filling",
    "Permanent filling",
    "Fluoride application",
    "Dental check-up",
    "Pit and fissure sealant",
    "Gum treatment",
];

const BASE = "/dashboard/health-case-reports";
const PAGE_SIZE = 20;
const STATUSES = ["pending", "referred", "resolved"];
// Mga diagnosis na pagpipilian sa New/Edit Case Report form. Lagi itong nasa Diagnosis filter,
// kahit wala pang case report na may ganitong diagnosis.
const COMMON_DIAGNOSES = [
    "Fever",
    "Headache",
    "Stomachache",
    "Cough and colds",
    "Dizziness",
    "Toothache",
    "Menstrual cramps",
    "Allergy",
    "Wound / Injury",
    "Asthma attack",
];
// Uri ng case: kung kanino ang case report
const TYPES: Record<string, string> = { student: "Student", employee: "Employee" };
// Health Report lang: kung saan galing ang report (Clinic Visit = V-, New Case Report = C-)
const SOURCES: Record<string, string> = { visit: "Visit", case: "Case" };

const statusStyles: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    referred: { label: "Referred", className: "bg-red-100 text-red-700" },
    resolved: { label: "Resolved", className: "bg-green-100 text-green-700" },
    completed: { label: "Completed", className: "bg-green-100 text-green-700" },
    "follow-up": { label: "Follow-up", className: "bg-amber-100 text-amber-800" },
};

const fieldClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

function formatDate(date: Date) {
    // YYYY-MM-DD, gaya ng nasa design
    return new Date(date).toISOString().slice(0, 10);
}

function fullName(c: CaseRow) {
    if (!c.last_name && !c.first_name) return "—";
    return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
}

/** Tinatanggap lang ang YYYY-MM-DD; iba pa ay itinuturing na walang filter. */
function cleanDate(value?: string) {
    const v = (value ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

function StatusBadge({ status }: { status: string }) {
    const badge = statusStyles[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}>
            {badge.label}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const isEmployee = type === "employee";
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-sm font-medium ${isEmployee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                }`}
        >
            {isEmployee ? "Employee" : "Student"}
        </span>
    );
}

export default async function HealthCaseReportsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    const showHealth = canViewHealthRecords(session.role); // Admin, Nurse, Doctor
    const showDental = canViewDental(session.role); // Admin, Nurse, Dentist
    if (!showHealth && !showDental) redirect("/dashboard");

    const params = await searchParams;
    // Aling tab: Health o Dental (hindi puwedeng buksan ang tab na walang access)
    const kind: Kind = params.kind === "dental" ? (showDental ? "dental" : "health") : showHealth ? "health" : "dental";
    const isDental = kind === "dental";
    const canEdit = isDental ? canManageDental(session.role) : canManageRecords(session.role);

    // ?case=<id>: ipakita ang isang case report (kapareho ng Dental Visit Record)
    const viewCaseId = parseInt(params.case ?? "", 10);
    if (viewCaseId > 0 && showHealth) {
        return (
            <CaseRecordDetail
                caseId={viewCaseId}
                canEdit={canManageRecords(session.role)}
                backHref={params.back === "list" ? BASE : "/dashboard"}
            />
        );
    }

    const statusList = isDental ? DENTAL_STATUSES : STATUSES;
    const rawStatus = (params.status ?? "").trim().toLowerCase();
    const status = statusList.includes(rawStatus) ? rawStatus : "";
    const rawType = (params.type ?? "").trim().toLowerCase();
    const type = rawType in TYPES ? rawType : "";
    // Health Report lang: Visit (galing Clinic Visit) o Case (New Case Report)
    const rawSource = (params.source ?? "").trim().toLowerCase();
    const source = !isDental && rawSource in SOURCES ? rawSource : "";
    // Diagnosis (hal. Fever, Headache). Hindi case-sensitive ang paghahambing.
    const diagnosis = (params.diagnosis ?? "").trim().slice(0, 255);
    const q = (params.q ?? "").trim();
    const from = cleanDate(params.from);
    const to = cleanDate(params.to);
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
    const like = `%${q}%`;
    // Puwedeng hanapin ang "C-040" o "V-040": tinatanggal ang C-/V- bago ihambing
    const likeNumber = `%${q.replace(/^[cv]-/i, "")}%`;
    const offset = (page - 1) * PAGE_SIZE;

    // Link na may parehong filters, iba lang ang ilang value.
    const hrefWith = (changes: Record<string, string>) => {
        const current: Record<string, string> = {
            kind: kind === "dental" && showHealth ? "dental" : "",
            status,
            type,
            source,
            diagnosis,
            q,
            from,
            to,
            ...changes,
        };
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(current)) if (v) sp.set(k, v);
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };
    const hrefFor = (p: number) => hrefWith({ page: p > 1 ? String(p) : "" });

    // LEFT JOIN on both sides: a case report belongs to a student OR an
    // employee, and the other column is NULL. Newest date first.
    // Dental records (dental_records), naka-anyong case report para iisang table
    const dentalQuery = () =>
        Promise.all([
            prisma.$queryRaw<CaseRow[]>`
        SELECT d.dental_id AS case_id,
               'D-' || LPAD(d.dental_id::text, 3, '0') AS case_number,
               CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
               COALESCE(s.student_number, e.employee_number) AS id_number,
               COALESCE(s.last_name, e.last_name)            AS last_name,
               COALESCE(s.first_name, e.first_name)          AS first_name,
               d.procedure_name AS complaint, d.visit_date AS report_date,
               d.dentist_name AS staff_name, d.status, d.tooth
        FROM dental_records d
        LEFT JOIN students  s ON s.student_id  = d.student_id
        LEFT JOIN employees e ON e.employee_id = d.employee_id
        WHERE d.archived_at IS NULL
        AND (${status} = '' OR d.status = ${status})
        AND (${type} = ''
            OR (${type} = 'employee' AND d.employee_id IS NOT NULL)
            OR (${type} = 'student' AND d.employee_id IS NULL))
        AND (${diagnosis} = '' OR LOWER(TRIM(d.procedure_name)) = LOWER(${diagnosis}))
        AND (${from} = '' OR d.visit_date >= CAST(NULLIF(${from}, '') AS DATE))
        AND (${to} = '' OR d.visit_date <= CAST(NULLIF(${to}, '') AS DATE))
        AND (${q} = ''
            OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
            OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
            OR (COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)) ILIKE ${like}
            OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
            OR ('D-' || LPAD(d.dental_id::text, 3, '0')) ILIKE ${like})
        ORDER BY d.visit_date DESC, d.dental_id DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
            prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM dental_records d
        LEFT JOIN students  s ON s.student_id  = d.student_id
        LEFT JOIN employees e ON e.employee_id = d.employee_id
        WHERE d.archived_at IS NULL
        AND (${status} = '' OR d.status = ${status})
        AND (${type} = ''
            OR (${type} = 'employee' AND d.employee_id IS NOT NULL)
            OR (${type} = 'student' AND d.employee_id IS NULL))
        AND (${diagnosis} = '' OR LOWER(TRIM(d.procedure_name)) = LOWER(${diagnosis}))
        AND (${from} = '' OR d.visit_date >= CAST(NULLIF(${from}, '') AS DATE))
        AND (${to} = '' OR d.visit_date <= CAST(NULLIF(${to}, '') AS DATE))
        AND (${q} = ''
            OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
            OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
            OR (COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)) ILIKE ${like}
            OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
            OR ('D-' || LPAD(d.dental_id::text, 3, '0')) ILIKE ${like})
    `,
        ]);

    const [reports, count] = isDental ? await dentalQuery() : await Promise.all([
        prisma.$queryRaw<CaseRow[]>`
        SELECT c.case_id, c.case_number,
               CASE WHEN c.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
               COALESCE(s.student_number, e.employee_number) AS id_number,
               COALESCE(s.last_name, e.last_name)            AS last_name,
               COALESCE(s.first_name, e.first_name)          AS first_name,
               c.complaint, c.report_date, c.staff_name, c.status,
               -- Galing ba sa Clinic Visit? (parehong pasyente, petsa at reklamo)
               (EXISTS (SELECT 1 FROM health_records h
                        WHERE c.student_id IS NOT NULL AND h.student_id = c.student_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))
                OR EXISTS (SELECT 1 FROM employee_health_records h
                        WHERE c.employee_id IS NOT NULL AND h.employee_id = c.employee_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))) AS from_visit
        FROM health_case_reports c
        LEFT JOIN students  s ON s.student_id  = c.student_id
        LEFT JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.archived_at IS NULL
        AND (${status} = '' OR c.status = ${status})
        AND (${type} = ''
            OR (${type} = 'employee' AND c.employee_id IS NOT NULL)
            OR (${type} = 'student' AND c.employee_id IS NULL)
            ) AND (${source} = ''
            OR (${source} = 'visit' AND (EXISTS (SELECT 1 FROM health_records h
                        WHERE c.student_id IS NOT NULL AND h.student_id = c.student_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))
                OR EXISTS (SELECT 1 FROM employee_health_records h
                        WHERE c.employee_id IS NOT NULL AND h.employee_id = c.employee_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))))
            OR (${source} = 'case' AND NOT (EXISTS (SELECT 1 FROM health_records h
                        WHERE c.student_id IS NOT NULL AND h.student_id = c.student_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))
                OR EXISTS (SELECT 1 FROM employee_health_records h
                        WHERE c.employee_id IS NOT NULL AND h.employee_id = c.employee_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint))))))
        AND (${diagnosis} = '' OR LOWER(TRIM(c.complaint)) = LOWER(${diagnosis}))
        AND (${from} = '' OR c.report_date >= CAST(NULLIF(${from}, '') AS DATE))
        AND (${to} = '' OR c.report_date <= CAST(NULLIF(${to}, '') AS DATE))
        AND (${q} = ''
            OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
            OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
            OR (COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)) ILIKE ${like}
            OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
            OR c.case_number ILIKE ${likeNumber})
        ORDER BY c.report_date DESC, c.case_id DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
        prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM health_case_reports c
        LEFT JOIN students  s ON s.student_id  = c.student_id
        LEFT JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.archived_at IS NULL
        AND (${status} = '' OR c.status = ${status})
        AND (${type} = ''
            OR (${type} = 'employee' AND c.employee_id IS NOT NULL)
            OR (${type} = 'student' AND c.employee_id IS NULL)
            ) AND (${source} = ''
            OR (${source} = 'visit' AND (EXISTS (SELECT 1 FROM health_records h
                        WHERE c.student_id IS NOT NULL AND h.student_id = c.student_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))
                OR EXISTS (SELECT 1 FROM employee_health_records h
                        WHERE c.employee_id IS NOT NULL AND h.employee_id = c.employee_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))))
            OR (${source} = 'case' AND NOT (EXISTS (SELECT 1 FROM health_records h
                        WHERE c.student_id IS NOT NULL AND h.student_id = c.student_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))
                OR EXISTS (SELECT 1 FROM employee_health_records h
                        WHERE c.employee_id IS NOT NULL AND h.employee_id = c.employee_id
                          AND h.visit_date = c.report_date
                          AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint))))))
        AND (${diagnosis} = '' OR LOWER(TRIM(c.complaint)) = LOWER(${diagnosis}))
        AND (${from} = '' OR c.report_date >= CAST(NULLIF(${from}, '') AS DATE))
        AND (${to} = '' OR c.report_date <= CAST(NULLIF(${to}, '') AS DATE))
        AND (${q} = ''
            OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
            OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
            OR (COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)) ILIKE ${like}
            OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
            OR c.case_number ILIKE ${likeNumber})
    `,
    ]);
    // Diagnosis filter: ang mga karaniwang diagnosis lang (Fever, Headache, atbp.).
    // Hindi na isinasama ang mga tinype nang mano-mano sa case report (hal. "sakit ng ulo").
    // Kasama rin ang mga tinype nang mano-mano (hal. "sakit ng ulo", "sakit ng ngipin"),
    // kaya kusang nadadagdag sa listahan ang wala pa rito.
    let diagnosisOptions: string[] = isDental ? [...COMMON_PROCEDURES] : [...COMMON_DIAGNOSES];
    {
        const typed = isDental
            ? await prisma.$queryRaw<{ name: string }[]>`
        SELECT DISTINCT TRIM(procedure_name) AS name
        FROM dental_records
        WHERE archived_at IS NULL AND TRIM(procedure_name) <> ''
        ORDER BY 1
    `
            : await prisma.$queryRaw<{ name: string }[]>`
        SELECT DISTINCT TRIM(complaint) AS name
        FROM health_case_reports
        WHERE archived_at IS NULL AND TRIM(complaint) <> ''
        ORDER BY 1
    `;
        const known = new Set(diagnosisOptions.map((d) => d.toLowerCase()));
        for (const { name } of typed) {
            if (!known.has(name.toLowerCase())) {
                known.add(name.toLowerCase());
                diagnosisOptions = [...diagnosisOptions, name];
            }
        }
    }

    const total = count[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) redirect(hrefFor(totalPages));

    // "⋮" menu sa dulo ng row: buksan ang report o ang health record ng pasyente
    const actions = (c: CaseRow) => {
        // Kapareho ng ayos sa Dental Records: View muna, tapos Edit
        const items: RowAction[] = [];
        if (isDental) {
            // Dental: buksan ang Dental Records tab ng pasyente, o i-edit ang dental record
            if (c.id_number) {
                items.push({
                    label: "View Dental Record",
                    href: `/dashboard/${c.patient_type}-health-records?${c.patient_type}=${encodeURIComponent(c.id_number)}&tab=dental`,
                    title: "View dental record",
                    message: `Open the dental record of ${fullName(c)}? This contains confidential medical information and your access will be recorded.`,
                    confirmLabel: "View",
                    icon: "view",
                });
            }
            if (canEdit) {
                items.push({
                    label: "Edit Record",
                    href: `/dashboard/dental-records/edit?record=${c.case_id}&back=${encodeURIComponent(hrefFor(page))}`,
                    title: "Edit dental record",
                    message: `Edit the dental record (${c.complaint}) of ${fullName(c)}?`,
                    confirmLabel: "Edit",
                    icon: "edit",
                });
            }
            if (items.length === 0) return <span className="text-sm text-gray-600">—</span>;
            return <RowActionMenu actions={items} label={`Actions for ${c.case_number}`} />;
        }
        if (c.id_number) {
            const isEmployee = c.patient_type === "employee";
            items.push({
                label: "View Health Record",
                href: isEmployee
                    ? `/dashboard/employee-health-records?employee=${encodeURIComponent(c.id_number)}`
                    : `/dashboard/student-health-records?student=${encodeURIComponent(c.id_number)}`,
                title: "View health record",
                message: `Open the health record of ${fullName(c)}?`,
                confirmLabel: "View",
                icon: "view",
            });
        }
        items.push({
            label: "View Report",
            href: `${BASE}?case=${c.case_id}&back=list`,
            title: "View case report",
            message: `Open case ${reportId(c)} (${c.complaint}) of ${fullName(c)}? This contains confidential medical information and your access will be recorded.`,
            confirmLabel: "View",
            icon: "view",
        });
        if (canEdit) {
            items.push({
                label: "Edit Report",
                href: `${BASE}/edit?case=${c.case_id}`,
                title: "Edit case report",
                message: `Edit case ${c.case_number} (${c.complaint}) of ${fullName(c)}?`,
                confirmLabel: "Edit",
                icon: "edit",
            });
        }
        if (items.length === 0) return <span className="text-sm text-gray-600">—</span>;
        return <RowActionMenu actions={items} label={`Actions for case ${c.case_number}`} />;
    };

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Report</h1>
                        <p className="text-sm text-gray-600">
                            {isDental ? "Manage and view all dental records." : "Manage and view all case reports."}
                        </p>
                    </div>
                </div>

                {canEdit && isDental ? (
                    <ConfirmLink
                        href="/dashboard/dental-records/new"
                        title="Add dental report"
                        message="Add a new dental report for a student or employee?"
                        confirmLabel="Continue"
                        icon={<Plus className="h-5 w-5" />}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#15664f] px-5 text-sm font-semibold text-white shadow-md shadow-[#15664f]/20 hover:bg-[#10523f] sm:w-auto"
                    >
                        <Plus className="h-4 w-4" />
                        Add Dental Report
                    </ConfirmLink>
                ) : canEdit ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="New case report"
                        message="Create a new health case report? This will be counted in the Weekly Illness Alert Dashboard."
                        confirmLabel="Continue"
                        icon={<Plus className="h-5 w-5" />}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#15664f] px-5 text-sm font-semibold text-white shadow-md shadow-[#15664f]/20 hover:bg-[#10523f] sm:w-auto"
                    >
                        <Plus className="h-4 w-4" />
                        New Case Report
                    </ConfirmLink>
                ) : null}
            </div>

            {/* Tabs: Health | Dental (lalabas lang kapag may access sa dalawa, hal. Nurse at Admin) */}
            {showHealth && showDental && (
                <nav className="inline-flex gap-1 rounded-xl border-2 border-[#cfe5d9] bg-white p-1 shadow-sm" aria-label="Report type">
                    {(["health", "dental"] as const).map((k) => (
                        <Link
                            key={k}
                            href={k === "dental" ? `${BASE}?kind=dental` : BASE}
                            aria-current={kind === k ? "page" : undefined}
                            className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold transition-colors ${kind === k ? "bg-[#15664f] text-white shadow-sm" : "text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                                }`}
                        >
                            {k === "dental" ? "Dental Report" : "Health Report"}
                        </Link>
                    ))}
                </nav>
            )}

            <section className="overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                {/* Filters */}
                <form
                    method="get"
                    action={BASE}
                    className={`grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:items-end md:p-5 ${isDental ? "xl:grid-cols-[minmax(0,1fr)_auto_10rem_11rem_9rem]" : "xl:grid-cols-[minmax(0,1fr)_auto_9rem_9rem_10rem_9rem]"}`}
                >
                    {isDental && showHealth && <input type="hidden" name="kind" value="dental" />}
                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-600">Search</span>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                            <SearchInput
                                name="q"
                                defaultValue={q}
                                autoComplete="off"
                                placeholder="Name or ID..."
                                suppressHydrationWarning
                                className={`${fieldClass} pl-10 pr-3`}
                            />
                        </div>
                    </label>

                    {/* Buong hilera sa tablet para hindi maputol ang petsa */}
                    <div className="min-w-0 space-y-1 sm:col-span-2 xl:col-span-1">
                        <span className="block text-sm font-medium text-gray-600">Date Range</span>
                        {/* Phone: magkatabi at pantay ang From at To */}
                        <div className="grid grid-cols-2 gap-1.5 xl:flex xl:items-center">
                            {(["from", "to"] as const).map((key) => {
                                const value = key === "from" ? from : to;
                                return (
                                    <div key={key} className="relative min-w-0">
                                        <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
                                        <AutoSubmitInput
                                            type="date"
                                            name={key}
                                            defaultValue={value}
                                            aria-label={key === "from" ? "From date" : "To date"}
                                            className={`${fieldClass} relative w-full min-w-0 cursor-pointer pl-8 text-sm xl:w-40 ${value ? "pr-7" : "pr-2"} [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                                        />
                                        {value && (
                                            <Link
                                                href={hrefWith({ [key]: "", page: "" })}
                                                aria-label="Clear date"
                                                className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-gray-600 hover:bg-gray-100 hover:text-gray-700"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Link>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Health Report lang: kung saan galing ang report */}
                    {!isDental && (
                        <label className="block space-y-1">
                            <span className="text-sm font-medium text-gray-600">Type of Case</span>
                            <AutoSubmitSelect
                                name="source"
                                defaultValue={SOURCES[source] ?? ""}
                                options={Object.values(SOURCES)}
                                className={`${fieldClass} px-3`}
                            />
                        </label>
                    )}

                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-600">Patient Type</span>
                        <AutoSubmitSelect
                            name="type"
                            defaultValue={TYPES[type] ?? ""}
                            options={Object.values(TYPES)}
                            className={`${fieldClass} px-3`}
                        />
                    </label>

                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-600">{isDental ? "Procedure" : "Diagnosis"}</span>
                        <AutoSubmitSelect
                            name="diagnosis"
                            defaultValue={diagnosisOptions.find((d) => d.toLowerCase() === diagnosis.toLowerCase()) ?? ""}
                            options={diagnosisOptions}
                            className={`${fieldClass} px-3`}
                        />
                    </label>

                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-600">Status</span>
                        <AutoSubmitSelect
                            name="status"
                            defaultValue={statusStyles[status]?.label ?? ""}
                            options={statusList.map((s) => statusStyles[s].label)}
                            className={`${fieldClass} px-3`}
                        />
                    </label>
                </form>

                {reports.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">
                        {isDental ? "No dental records found." : "No case reports found."}
                    </p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {reports.map((c) => (
                                <li key={c.case_id} className="rounded-lg border border-gray-200 p-3">
                                    {/* Itaas: Case No. sa kaliwa; Status + ⋮ sa kanan */}
                                    <div className="flex items-center justify-between gap-2">
                                        <ReportIdBadge c={c} />
                                        <div className="flex shrink-0 items-center gap-1">
                                            <StatusBadge status={c.status} />
                                            {actions(c)}
                                        </div>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <p className="break-words text-sm font-semibold text-gray-900">{fullName(c)}</p>
                                        <TypeBadge type={c.patient_type} />
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {c.complaint}
                                        {c.tooth ? ` · Tooth ${c.tooth}` : ""}
                                    </p>
                                    <p className="text-sm text-gray-600">{formatDate(c.report_date)}</p>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-gray-200 bg-[#f6faf8] text-gray-600">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Report ID</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Date</th>
                                        <th className="px-5 py-3 font-semibold">Patient Name</th>
                                        <th className="px-5 py-3 font-semibold">Type</th>
                                        <th className="px-5 py-3 font-semibold">{isDental ? "Procedure" : "Diagnosis"}</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((c) => (
                                        <tr key={c.case_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                                                <ReportIdBadge c={c} />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-gray-600">{formatDate(c.report_date)}</td>
                                            <td className="px-5 py-4">
                                                <p className="text-gray-900">{fullName(c)}</p>
                                                {c.id_number && <p className="text-sm text-gray-600">{c.id_number}</p>}
                                            </td>
                                            {/* Sariling column ang Type para pantay-pantay ang badge */}
                                            <td className="px-5 py-4">
                                                <TypeBadge type={c.patient_type} />
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">
                                                {c.complaint}
                                                {c.tooth && <span className="block text-sm text-gray-500">Tooth {c.tooth}</span>}
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={c.status} />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4">{actions(c)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <ListPagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} hrefFor={hrefFor} />
            </section>
        </main>
    );
}