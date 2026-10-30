import { redirect } from "next/navigation";
import { BadgeCheck, IdCard, Mail, Phone, Plus, UserMinus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageStaff, canViewStaff } from "@/lib/permissions";
import { archiveStaff } from "@/features/clinic-staff/actions";
import ConfirmLink from "@/components/shared/confirm-link";
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";

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

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

const statusStyles: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-100 text-green-700" },
    inactive: { label: "Inactive", className: "bg-red-100 text-red-700" },
};

function initialsOf(name: string) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return `${first}${last}`.toUpperCase() || "?";
}

// "⋮" menu: Edit Details at Archive (may confirmation ang bawat isa)
function StaffActions({ s }: { s: StaffRow }) {
    const actions: RowAction[] = [
        {
            label: "Edit Details",
            href: `${BASE}/edit?staff=${s.staff_id}`,
            title: "Edit staff member",
            message: `Edit the details of ${s.full_name}? Changes will replace the current information.`,
            confirmLabel: "Edit",
            icon: "edit",
        },
        {
            label: "Archive",
            href: BASE,
            title: "Archive staff record",
            message: `Archive ${s.full_name}? The record will move to Archive Records and can be restored anytime.`,
            confirmLabel: "Archive",
            icon: "archive",
            formAction: archiveStaff,
            fields: { staffId: String(s.staff_id) },
        },
    ];
    return <RowActionMenu actions={actions} label={`Actions for ${s.full_name}`} />;
}

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

    const getBadge = (status: string) =>
        statusStyles[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };

    const activeCount = staff.filter((s) => s.status === "active").length;
    const stats = [
        { label: "Total Staff", value: staff.length, icon: Users, tint: "bg-[#eef6f2] text-[#15664f]" },
        { label: "Active", value: activeCount, icon: BadgeCheck, tint: "bg-green-100 text-green-700" },
        { label: "Inactive", value: staff.length - activeCount, icon: UserMinus, tint: "bg-red-100 text-red-700" },
    ];

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Clinic Staff</h1>
                        <p className="text-sm text-gray-600">Manage clinic personnel, their roles, and license details.</p>
                    </div>
                </div>

                {canEdit ? (
                    <ConfirmLink
                        href="/dashboard/clinic-staff/new"
                        title="Add clinic staff?"
                        message="You will be taken to the form to add a new clinic staff member."
                        confirmLabel="Continue"
                        icon={<Plus className="h-5 w-5" />}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] sm:w-auto"
                    >
                        <Plus className="h-4 w-4" />
                        Add Staff
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">View only</span>
                )}
            </div>

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

            {/* List */}
            <section className={`${card} min-w-0 overflow-hidden`}>
                <div className="flex items-center justify-between gap-3 p-5 md:px-6">
                    <h2 className="text-lg font-semibold text-gray-900">Staff Directory</h2>
                    <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                        {staff.length} staff
                    </span>
                </div>

                {staff.length === 0 ? (
                    <div className="flex flex-col items-center border-t border-gray-100 p-10 text-center md:p-14">
                        <Users className="h-12 w-12 text-[#15664f]/30" />
                        <p className="mt-3 text-base font-semibold text-gray-800">No clinic staff recorded yet</p>
                        <p className="mt-1 text-sm text-gray-600">
                            {canEdit
                                ? "Click Add Staff to record the first clinic staff member."
                                : "Clinic staff will appear here once added."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {staff.map((s) => {
                                const badge = getBadge(s.status);
                                return (
                                    <li key={s.staff_id} className="rounded-lg border border-gray-200 p-3">
                                        <div className="flex items-start gap-3">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f]">
                                                {initialsOf(s.full_name)}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="break-words text-sm font-semibold text-gray-900">{s.full_name}</p>
                                                <p className="break-words text-sm text-gray-600">{s.position}</p>
                                            </div>
                                            <span
                                                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${badge.className}`}
                                            >
                                                {badge.label}
                                            </span>
                                        </div>

                                        <dl className="mt-3 space-y-1.5 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 shrink-0 text-gray-600" />
                                                <dd className="min-w-0 flex-1 break-all text-gray-900">{s.email ?? "—"}</dd>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 shrink-0 text-gray-600" />
                                                <dd className="min-w-0 flex-1 break-words text-gray-900">{s.contact ?? "—"}</dd>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <IdCard className="h-4 w-4 shrink-0 text-gray-600" />
                                                <dd className="min-w-0 flex-1 break-words text-gray-900">{s.license_no ?? "—"}</dd>
                                            </div>
                                        </dl>

                                        {canEdit && (
                                            <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
                                                <StaffActions s={s} />
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto border-t border-gray-100 md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#f6faf8] text-sm uppercase tracking-wide text-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Name</th>
                                        <th className="px-4 py-3 font-semibold">Email</th>
                                        <th className="px-4 py-3 font-semibold">Contact</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-semibold">License / PRC No.</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        {canEdit && <th className="w-20 px-4 py-3 text-center font-semibold">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.map((s) => {
                                        const badge = getBadge(s.status);
                                        return (
                                            <tr key={s.staff_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f]">
                                                            {initialsOf(s.full_name)}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-gray-900">{s.full_name}</p>
                                                            <p className="text-sm text-gray-600">{s.position}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{s.email ?? "—"}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{s.contact ?? "—"}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{s.license_no ?? "—"}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                {canEdit && (
                                                    <td className="px-4 py-3 text-center">
                                                        <StaffActions s={s} />
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}