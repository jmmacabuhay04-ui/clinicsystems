import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { PASSWORD_RULES_TEXT } from "@/lib/password-policy";
import { walkInReset } from "./actions";

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

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-3xl space-y-4 p-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Walk-in Password Reset</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        For people who forgot their password and came to the clinic in person.
                        An ID is required, and every reset is recorded.
                    </p>
                </div>

                {notice ? (
                    <div
                        className={`rounded-lg border p-4 text-sm ${notice.tone === "ok"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-red-200 bg-red-50 text-red-800"
                            }`}
                    >
                        <p className="font-medium">{notice.text}</p>
                        {params.msg ? <p className="mt-1">{params.msg}</p> : null}
                    </div>
                ) : null}

                {!selected ? (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Link
                                href="/dashboard/walk-in-reset?type=student"
                                className={`rounded-lg px-4 py-2 text-sm font-medium ${type === "student"
                                    ? "bg-[#15664f] text-white"
                                    : "border border-gray-300 bg-white text-gray-700"
                                    }`}
                            >
                                Student
                            </Link>
                            <Link
                                href="/dashboard/walk-in-reset?type=employee"
                                className={`rounded-lg px-4 py-2 text-sm font-medium ${type === "employee"
                                    ? "bg-[#15664f] text-white"
                                    : "border border-gray-300 bg-white text-gray-700"
                                    }`}
                            >
                                Employee
                            </Link>
                        </div>

                        <form className="flex gap-2" action="/dashboard/walk-in-reset" method="get">
                            <input type="hidden" name="type" value={type} />
                            <input
                                type="text"
                                name="q"
                                defaultValue={q}
                                placeholder={`Search ${type} by name...`}
                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-[#15664f] px-4 py-2 text-sm font-medium text-white"
                            >
                                Search
                            </button>
                        </form>

                        {q && results.length === 0 ? (
                            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                                No match found for &quot;{q}&quot;.
                            </div>
                        ) : null}

                        {results.length > 0 ? (
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <tbody className="divide-y divide-gray-100">
                                        {results.map((person) => (
                                            <tr key={person.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {person.full_name}
                                                    {person.ref_no ? (
                                                        <span className="ml-2 text-xs text-gray-500">
                                                            {person.ref_no}
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link
                                                        href={`/dashboard/walk-in-reset?type=${type}&id=${person.id}`}
                                                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Select
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <form action={walkInReset} className="space-y-4" autoComplete="off">
                        <input type="hidden" name="subjectType" value={type} />
                        <input type="hidden" name="subjectId" value={selected.id} />

                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                {type === "student" ? "Student" : "Employee"}
                            </p>
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                                {selected.full_name}
                            </p>
                            {selected.ref_no ? (
                                <p className="text-sm text-gray-500">{selected.ref_no}</p>
                            ) : null}
                            <Link
                                href={`/dashboard/walk-in-reset?type=${type}`}
                                className="mt-2 inline-block text-sm text-[#15664f] underline"
                            >
                                Choose someone else
                            </Link>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-medium text-amber-900">
                                Step 1 — Verify their identity
                            </p>
                            <p className="mt-1 text-sm text-amber-800">
                                Never reset without an ID. Impersonation is the easiest way to get into
                                someone else&apos;s records.
                            </p>

                            <label className="mt-3 block text-sm font-medium text-amber-900">
                                Which ID was presented?
                            </label>
                            <select
                                name="idPresented"
                                required
                                className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                            >
                                <option value="">-- Select --</option>
                                <option value="School ID">School ID</option>
                                <option value="Government ID">Government ID</option>
                                <option value="Registration Form">Registration Form</option>
                                <option value="Identified by Registrar">Identified by Registrar</option>
                                <option value="Identified by Adviser">Identified by Adviser</option>
                            </select>

                            <label className="mt-3 block text-sm font-medium text-amber-900">
                                Additional note (optional)
                            </label>
                            <input
                                type="text"
                                name="note"
                                placeholder="e.g. ID number, or who identified them"
                                className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-sm font-medium text-gray-900">
                                Step 2 — Temporary password
                            </p>
                            <p className="mt-1 text-sm text-gray-600">{PASSWORD_RULES_TEXT}</p>
                            <p className="mt-1 text-sm text-gray-600">
                                The owner is forced to change this at their next login, so the clinic
                                never keeps knowledge of their real password.
                            </p>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        New Password
                                    </label>
                                    <input
                                        type="text"
                                        name="newPassword"
                                        required
                                        autoComplete="off"
                                        data-lpignore="true"
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="text"
                                        name="confirmPassword"
                                        required
                                        autoComplete="off"
                                        data-lpignore="true"
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-medium text-amber-900">
                                Step 3 — Confirm it&apos;s you
                            </p>
                            <label className="mt-2 block text-sm font-medium text-amber-900">
                                Your own password
                            </label>
                            <input
                                type="password"
                                name="staffPassword"
                                required
                                autoComplete="new-password"
                                data-lpignore="true"
                                placeholder="Type your own login password"
                                className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="rounded-lg bg-[#15664f] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0f4d3b]"
                            >
                                Reset Password
                            </button>
                            <Link
                                href={`/dashboard/walk-in-reset?type=${type}`}
                                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}