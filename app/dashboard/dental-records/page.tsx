import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Pencil, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageDental } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import { archiveDental } from "./actions";

type DentalRow = {
    dental_id: number;
    visit_date: Date;
    student_number: string;
    last_name: string;
    first_name: string;
    program: string | null;
    grade_level: string | null;
    procedure_name: string;
    tooth: string | null;
    dentist_name: string | null;
    status: string;
};

type Props = {
    searchParams: Promise<{ q?: string }>;
};

const BASE = "/dashboard/dental-records";

const statusStyles: Record<string, { label: string; className: string }> = {
    completed: { label: "Completed", className: "bg-green-100 text-green-700" },
    "follow-up": { label: "Follow-up", className: "bg-yellow-100 text-yellow-800" },
};

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

export default async function DentalRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageDental(session.role);

    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const like = `%${q}%`;

    const records = await prisma.$queryRaw<DentalRow[]>`
    SELECT d.dental_id, d.visit_date, s.student_number, s.last_name, s.first_name,
           s.program, s.grade_level, d.procedure_name, d.tooth, d.dentist_name, d.status
    FROM dental_records d
    JOIN students s ON s.student_id = d.student_id
    WHERE d.archived_at IS NULL
      AND (${q} = ''
        OR s.last_name ILIKE ${like}
        OR s.first_name ILIKE ${like}
        OR s.student_number ILIKE ${like}
        OR d.procedure_name ILIKE ${like})
    ORDER BY d.visit_date DESC, d.dental_id DESC
  `;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Dental Records</h1>
                    <p className="mt-1 text-gray-600">Student dental visit history and procedures.</p>
                </div>

                {canEdit ? (
                    <Link
                        href={`${BASE}/new`}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Record
                    </Link>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            <form method="get" action={BASE} className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search by name or student no..."
                    suppressHydrationWarning
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                />
            </form>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {records.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">No dental records found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Student</th>
                                    <th className="px-4 py-3 font-medium">Procedure</th>
                                    <th className="px-4 py-3 font-medium">Tooth</th>
                                    <th className="px-4 py-3 font-medium">Attending Dentist</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((d) => {
                                    const badge = statusStyles[d.status] ?? {
                                        label: d.status,
                                        className: "bg-gray-100 text-gray-700",
                                    };
                                    const classInfo = [d.program, d.grade_level].filter(Boolean).join(" ");
                                    return (
                                        <tr key={d.dental_id} className="border-t border-gray-100">
                                            <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                                                {formatDate(d.visit_date)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-semibold text-gray-900">
                                                    {d.first_name} {d.last_name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {d.student_number}
                                                    {classInfo && ` · ${classInfo}`}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-gray-900">{d.procedure_name}</td>
                                            <td className="px-4 py-4 text-gray-700">{d.tooth ?? "—"}</td>
                                            <td className="px-4 py-4 text-gray-900">{d.dentist_name ?? "—"}</td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            </td>
                                            {canEdit && (
                                                <td className="whitespace-nowrap px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Link
                                                            href={`${BASE}/edit?record=${d.dental_id}`}
                                                            className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                            Edit
                                                        </Link>
                                                        <form action={archiveDental}>
                                                            <input type="hidden" name="dentalId" value={d.dental_id} />
                                                            <ConfirmButton
                                                                title="Archive dental record"
                                                                confirmLabel="Archive"
                                                                message={`Archive this dental record (${d.procedure_name})? It will move to Archive Records.`}
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
        </main>
    );
}