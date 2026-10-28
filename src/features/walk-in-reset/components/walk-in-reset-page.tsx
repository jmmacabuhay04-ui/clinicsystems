import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { PASSWORD_RULES_TEXT } from "@/lib/auth/password-policy";
import { walkInReset } from "@/features/walk-in-reset/actions";
import ConfirmLink from "@/components/shared/confirm-link";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import FlashMessage from "@/components/shared/flash-message";
import {
    Briefcase,
    ClipboardCheck,
    GraduationCap,
    IdCard,
    KeyRound,
    Search,
    UserCheck,
    UserRoundSearch,
    X,
} from "lucide-react";
import SearchInput from "@/components/shared/search-input";

const BASE = "/dashboard/walk-in-reset";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm";

const TYPES = [
    { key: "student", label: "Student", icon: GraduationCap, active: "bg-[#15664f] text-white shadow-sm" },
    { key: "employee", label: "Employee", icon: Briefcase, active: "bg-amber-300 text-gray-900 shadow-sm" },
] as const;

function initialsOf(fullName: string) {
    // "Dela Cruz, Juan" -> "JD"
    const [last = "", first = ""] = fullName.split(",").map((x) => x.trim());
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

function StepCard({
    step,
    title,
    description,
    tone = "green",
    children,
}: {
    step: number;
    title: string;
    description?: React.ReactNode;
    tone?: "green" | "amber";
    children: React.ReactNode;
}) {
    const amber = tone === "amber";
    return (
        <section
            className={`rounded-xl border-2 p-5 shadow-md md:p-6 ${amber ? "border-amber-200 bg-amber-50/60 shadow-amber-200/30" : "border-[#cfe5d9] bg-white shadow-[#15664f]/10"
                }`}
        >
            <div className="flex items-start gap-3">
                <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${amber ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                        }`}
                >
                    {step}
                </span>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                    {description && <div className="mt-0.5 text-sm text-gray-600">{description}</div>}
                </div>
            </div>
            <div className="mt-4 space-y-4">{children}</div>
        </section>
    );
}

const ALLOWED_ROLES = ["nurse", "admin"];

type Person = {
    id: number;
    full_name: string;
    ref_no: string | null;
};

const NOTICES: Record<string, { tone: "ok" | "bad"; text: string }> = {
    done: {
        tone: "ok",
        text: "New password set. The owner will be asked to change it at their next login.",
    },
    "no-id": { tone: "bad", text: "You must record which ID was presented." },
    "no-auth": { tone: "bad", text: "Enter your own password to confirm." },
    "bad-auth": { tone: "bad", text: "Wrong password. The reset was not applied." },
    weak: { tone: "bad", text: "The new password does not meet the policy." },
    invalid: { tone: "bad", text: "Something is missing from the form. Try again." },
};

async function searchStudents(q: string): Promise<Person[]> {
    if (!q) return [];
    const like = `%${q}%`;
    return prisma.$queryRaw<Person[]>`
        SELECT student_id AS id,
               (last_name || ', ' || first_name) AS full_name,
               student_number AS ref_no
        FROM students
        WHERE archived_at IS NULL
          AND (student_number ILIKE ${like}
            OR last_name ILIKE ${like}
            OR first_name ILIKE ${like}
            OR (first_name || ' ' || last_name) ILIKE ${like}
            OR (last_name || ', ' || first_name) ILIKE ${like})
        ORDER BY last_name, first_name
        LIMIT 20
    `;
}

async function searchEmployees(q: string): Promise<Person[]> {
    if (!q) return [];
    const like = `%${q}%`;
    return prisma.$queryRaw<Person[]>`
        SELECT employee_id AS id,
               (last_name || ', ' || first_name) AS full_name,
               employee_number AS ref_no
        FROM employees
        WHERE (employee_number ILIKE ${like}
            OR last_name ILIKE ${like}
            OR first_name ILIKE ${like}
            OR (first_name || ' ' || last_name) ILIKE ${like}
            OR (last_name || ', ' || first_name) ILIKE ${like})
        ORDER BY last_name, first_name
        LIMIT 20
    `;
}

async function getOne(type: string, id: number): Promise<Person | null> {
    if (!id) return null;
    const rows =
        type === "student"
            ? await prisma.$queryRaw<Person[]>`
                  SELECT student_id AS id,
                         (last_name || ', ' || first_name) AS full_name,
                         student_number AS ref_no
                  FROM students WHERE student_id = ${id} LIMIT 1
              `
            : await prisma.$queryRaw<Person[]>`
                  SELECT employee_id AS id,
                         (last_name || ', ' || first_name) AS full_name,
                         employee_number AS ref_no
                  FROM employees WHERE employee_id = ${id} LIMIT 1
              `;
    return rows[0] ?? null;
}

export default async function WalkInResetPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string; q?: string; id?: string; notice?: string; msg?: string }>;
}) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!ALLOWED_ROLES.includes(session.role)) redirect("/dashboard");

    const params = await searchParams;
    const type = params.type === "employee" ? "employee" : "student";
    const q = params.q ?? "";
    const id = Number(params.id ?? 0);

    const selected = await getOne(type, id);
    const results = selected
        ? []
        : type === "student"
            ? await searchStudents(q)
            : await searchEmployees(q);

    const notice = params.notice ? NOTICES[params.notice] : null;

    const typeLabel = type === "student" ? "Student" : "Employee";

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Walk-in Password Reset</h1>
                    <p className="text-sm text-gray-600">
                        For people who forgot their password and came to the clinic in person. An ID is required, and
                        every reset is recorded.
                    </p>
                </div>
            </div>

            {notice &&
                (notice.tone === "ok" ? (
                    <FlashMessage clearParam="notice">{notice.text}</FlashMessage>
                ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        <p className="font-semibold">{notice.text}</p>
                        {params.msg ? <p className="mt-1">{params.msg}</p> : null}
                    </div>
                ))}

            {!selected ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    {/* Search */}
                    <section className={`${card} min-w-0 self-start p-5 md:p-6`}>
                        <div className="mb-5 flex items-start gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Find the Account</h2>
                                <p className="text-sm text-gray-600">Choose the account type, then search by name or ID number.</p>
                            </div>
                        </div>

                        {/* Type toggle */}
                        <div className="inline-flex gap-1 rounded-xl border-2 border-[#cfe5d9] bg-white p-1">
                            {TYPES.map((t) => {
                                const active = type === t.key;
                                const Icon = t.icon;
                                return (
                                    <Link
                                        key={t.key}
                                        href={`${BASE}?type=${t.key}`}
                                        className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${active ? t.active : "text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {t.label}
                                    </Link>
                                );
                            })}
                        </div>

                        <form className="mt-4 flex flex-wrap gap-2" action={BASE} method="get">
                            <input type="hidden" name="type" value={type} />
                            <div className="relative min-w-0 flex-1 basis-60">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                                <SearchInput
                                    type="text"
                                    name="q"
                                    autoComplete="off"
                                    defaultValue={q}
                                    placeholder={`Search ${type} by name or ID number...`}
                                    suppressHydrationWarning
                                    className={`${inputClass} pl-9`}
                                />
                            </div>
                            <button
                                type="submit"
                                suppressHydrationWarning
                                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] sm:flex-none"
                            >
                                <Search className="h-4 w-4" />
                                Search
                            </button>
                            {q && (
                                <Link
                                    href={`${BASE}?type=${type}`}
                                    className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    <X className="h-4 w-4" />
                                    Clear
                                </Link>
                            )}
                        </form>

                        {/* Results */}
                        <div className="mt-5">
                            {!q ? (
                                <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-[#cfe5d9] p-8 text-center">
                                    <UserRoundSearch className="h-10 w-10 text-[#15664f]/30" />
                                    <p className="mt-2 text-sm text-gray-600">
                                        Search for the {type} standing in front of you.
                                    </p>
                                </div>
                            ) : results.length === 0 ? (
                                <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-[#cfe5d9] p-8 text-center">
                                    <Search className="h-10 w-10 text-[#15664f]/30" />
                                    <p className="mt-2 text-sm text-gray-600">No match found for &quot;{q}&quot;.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                                        {results.length} result{results.length === 1 ? "" : "s"}
                                    </p>
                                    <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
                                        {results.map((person) => (
                                            <li
                                                key={person.id}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#f6faf8]"
                                            >
                                                <span
                                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${type === "student" ? "bg-[#eef6f2] text-[#15664f]" : "bg-amber-100 text-amber-800"
                                                        }`}
                                                >
                                                    {initialsOf(person.full_name)}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="break-words font-semibold text-gray-900">{person.full_name}</p>
                                                    {person.ref_no && <p className="text-sm text-gray-600">{person.ref_no}</p>}
                                                </div>
                                                <ConfirmLink
                                                    href={`${BASE}?type=${type}&id=${person.id}`}
                                                    title="Reset this password?"
                                                    message={`Start a walk-in password reset for ${person.full_name}? Make sure this person is in front of you with a valid ID.`}
                                                    confirmLabel="Continue"
                                                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#15664f] px-3 text-sm font-semibold text-white hover:bg-[#10523f]"
                                                >
                                                    <UserCheck className="h-3.5 w-3.5" />
                                                    Select
                                                </ConfirmLink>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </section>

                    {/* How it works */}
                    <aside className={`${card} min-w-0 self-start p-5 md:p-6`}>
                        <div className="mb-4 flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-gray-900">How it works</h2>
                        </div>
                        <ol className="space-y-4">
                            {[
                                { icon: IdCard, title: "Check their ID", text: "Never reset without a valid ID or someone who can identify them." },
                                { icon: KeyRound, title: "Set a temporary password", text: "They must change it at their next login." },
                                { icon: ClipboardCheck, title: "Confirm with your password", text: "Every reset is recorded under your account." },
                            ].map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <li key={item.title} className="flex items-start gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {i + 1}. {item.title}
                                            </p>
                                            <p className="text-sm text-gray-600">{item.text}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </aside>
                </div>
            ) : (
                <form action={walkInReset} autoComplete="off" className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <input type="hidden" name="subjectType" value={type} />
                    <input type="hidden" name="subjectId" value={selected.id} />

                    {/* Selected person */}
                    <aside className="min-w-0 self-start rounded-xl border-2 border-green-200 bg-green-100 p-5 shadow-md shadow-[#15664f]/10 lg:sticky lg:top-6">
                        <div className="flex flex-col items-center text-center">
                            <span
                                className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold ${type === "student" ? "bg-[#15664f] text-white" : "bg-amber-300 text-gray-900"
                                    }`}
                            >
                                {initialsOf(selected.full_name)}
                            </span>
                            <p className="mt-3 break-words text-lg font-semibold text-gray-900">{selected.full_name}</p>
                            {selected.ref_no && <p className="text-sm text-gray-600">{selected.ref_no}</p>}
                            <span
                                className={`mt-2 rounded-full px-3 py-0.5 text-sm font-semibold ${type === "student" ? "bg-[#15664f] text-white" : "bg-amber-300 text-gray-900"
                                    }`}
                            >
                                {typeLabel}
                            </span>
                        </div>
                        <Link
                            href={`${BASE}?type=${type}`}
                            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#15664f] bg-white text-sm font-semibold text-[#15664f] hover:bg-[#eef6f2]"
                        >
                            <UserRoundSearch className="h-4 w-4" />
                            Choose someone else
                        </Link>
                    </aside>

                    <div className="min-w-0 space-y-5">
                        <StepCard
                            step={1}
                            tone="amber"
                            title="Verify their identity"
                            description="Never reset without an ID. Impersonation is the easiest way to get into someone else's records."
                        >
                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-gray-800">Which ID was presented? *</span>
                                <select name="idPresented" required className={inputClass}>
                                    <option value="">-- Select --</option>
                                    <option value="School ID">School ID</option>
                                    <option value="Government ID">Government ID</option>
                                    <option value="Registration Form">Registration Form</option>
                                    <option value="Identified by Registrar">Identified by Registrar</option>
                                    <option value="Identified by Adviser">Identified by Adviser</option>
                                </select>
                            </label>
                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-gray-800">Additional note (optional)</span>
                                <input
                                    type="text"
                                    name="note"
                                    placeholder="e.g. ID number, or who identified them"
                                    className={inputClass}
                                />
                            </label>
                        </StepCard>

                        <StepCard
                            step={2}
                            title="Temporary password"
                            description={
                                <>
                                    <p>{PASSWORD_RULES_TEXT}</p>
                                    <p className="mt-1">
                                        The owner is forced to change this at their next login, so the clinic never keeps
                                        knowledge of their real password.
                                    </p>
                                </>
                            }
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block space-y-1.5">
                                    <span className="text-sm font-semibold text-gray-800">New Password *</span>
                                    <input
                                        type="text"
                                        name="newPassword"
                                        required
                                        autoComplete="off"
                                        data-lpignore="true"
                                        className={inputClass}
                                    />
                                </label>
                                <label className="block space-y-1.5">
                                    <span className="text-sm font-semibold text-gray-800">Confirm Password *</span>
                                    <input
                                        type="text"
                                        name="confirmPassword"
                                        required
                                        autoComplete="off"
                                        data-lpignore="true"
                                        className={inputClass}
                                    />
                                </label>
                            </div>
                        </StepCard>

                        <StepCard step={3} tone="amber" title="Confirm it's you" description="Enter your own login password to approve this reset.">
                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-gray-800">Your own password *</span>
                                <input
                                    type="password"
                                    name="staffPassword"
                                    required
                                    autoComplete="new-password"
                                    data-lpignore="true"
                                    placeholder="Type your own login password"
                                    className={inputClass}
                                />
                            </label>
                        </StepCard>

                        <div className="flex flex-wrap gap-3">
                            <ConfirmSubmit
                                title="Reset this password?"
                                message={`Set a new temporary password for ${selected.full_name}${selected.ref_no ? ` (${selected.ref_no})` : ""}? Their old password will stop working.`}
                                confirmLabel="Reset Password"
                                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] sm:flex-none"
                            >
                                <KeyRound className="h-4 w-4" />
                                Reset Password
                            </ConfirmSubmit>
                            <Link
                                href={`${BASE}?type=${type}`}
                                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-6 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </Link>
                        </div>
                    </div>
                </form>
            )}
        </main>
    );
}