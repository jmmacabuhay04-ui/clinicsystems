import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStaff, canViewStaff } from "@/lib/permissions";
import ConfirmButton from "@/components/confirm-button";
import { archiveStaff } from "./actions";
import ConfirmLink from "@/components/confirm-link";

type StaffRow = {
    staff_id: number;
    full_name: string;
    position: string;
    email: string | null;
    contact: string | null;
    license_no: string | null;
    status: string;
};

const BASE = "/dashboard/clinic-staff";

const statusStyles: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-100 text-green-700" },
    inactive: { label: "Inactive", className: "bg-gray-200 text-gray-600" },
};

export default async function ClinicStaffPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canViewStaff(session.role)) redirect("/dashboard");
    const canEdit = canManageStaff(session.role);

    const staff = await prisma.$queryRaw<StaffRow[]>`
    SELECT staff_id, full_name, position, email, contact, license_no, status
    FROM clinic_staff
    WHERE archived_at IS NULL
    ORDER BY full_name
  `;
    return (
        <main className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Clinic Staff</h1>
                    <p className="mt-1 text-gray-600">Manage clinic personnel and their roles.</p>
                </div>

                {canEdit ? (
                    <ConfirmLink
                        href="/dashboard/clinic-staff/new"
                        title="Add clinic staff?"
                        message="You will be taken to the form to add a new clinic staff member."
                        confirmLabel="Continue"
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Staff
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {staff.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">No clinic staff recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium">Role</th>
                                    <th className="px-4 py-3 font-medium">Email</th>
                                    <th className="px-4 py-3 font-medium">Contact</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">License / PRC No.</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    {canEdit && <th className="px-4 py-3" />}
                                </tr>
                            </thead>
                            <tbody>
                                {staff.map((s) => {
                                    const badge = statusStyles[s.status] ?? {
                                        label: s.status,
                                        className: "bg-gray-100 text-gray-700",
                                    };
                                    return (
                                        <tr key={s.staff_id} className="border-t border-gray-100">
                                            <td className="px-4 py-4 font-semibold text-gray-900">{s.full_name}</td>
                                            <td className="px-4 py-4 text-gray-700">{s.position}</td>
                                            <td className="px-4 py-4 text-gray-700">{s.email ?? "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                                                {s.contact ?? "—"}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                                                {s.license_no ?? "—"}
                                            </td>
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
                                                        <ConfirmLink
                                                            href={`${BASE}/edit?staff=${s.staff_id}`}
                                                            title="Edit staff member"
                                                            message={`Edit the details of ${s.full_name}? Changes will replace the current information.`}
                                                            confirmLabel="Edit"
                                                            className="text-gray-400 hover:text-[#15664f]"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </ConfirmLink>
                                                        <form action={archiveStaff}>
                                                            <input type="hidden" name="staffId" value={s.staff_id} />
                                                            <ConfirmButton
                                                                title="Archive staff record"
                                                                confirmLabel="Archive"
                                                                message={`Archive ${s.full_name}? The record will move to Archive Records and can be restored anytime.`}
                                                                className="text-gray-400 hover:text-amber-600"
                                                            >
                                                                <Archive className="h-4 w-4" />
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