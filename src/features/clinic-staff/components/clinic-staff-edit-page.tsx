import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, UserPen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageStaff } from "@/lib/permissions";
import StaffForm, { type StaffValues } from "./staff-form";

const BASE = "/dashboard/clinic-staff";

type Row = {
    staff_id: number;
    full_name: string;
    position: string;
    email: string | null;
    contact: string | null;
    license_no: string | null;
    status: string;
};

type Props = {
    searchParams: Promise<{ staff?: string }>;
};

export default async function EditStaffPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageStaff(session.role)) redirect("/dashboard");

    const { staff: staffParam = "" } = await searchParams;
    const staffId = Number(staffParam);
    if (!staffId) notFound();

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT staff_id, full_name, position, email, contact, license_no, status
    FROM clinic_staff
    WHERE staff_id = ${staffId}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: StaffValues = {
        staffId: row.staff_id,
        fullName: row.full_name,
        position: row.position,
        email: row.email ?? "",
        contact: row.contact ?? "",
        licenseNo: row.license_no ?? "",
        status: row.status,
    };

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Clinic Staff
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <UserPen className="h-10 w-10 shrink-0 text-[#15664f]" />
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Edit Clinic Staff</h1>
                        <p className="text-sm text-gray-600">Update the staff member&apos;s details.</p>
                    </div>
                </div>
                {/* Kung sino ang ine-edit */}
                <div className="flex items-center gap-3 rounded-xl border-2 border-[#cfe5d9] bg-white px-3 py-2 shadow-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#15664f] text-xs font-bold text-white">
                        {row.full_name
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean)
                            .map((w, i, a) => (i === 0 || i === a.length - 1 ? w[0] : ""))
                            .join("")
                            .toUpperCase()}
                    </span>
                    <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-semibold text-gray-900">{row.full_name}</p>
                        <p className="text-xs text-gray-500">{row.position}</p>
                    </div>
                </div>
            </div>

            <StaffForm mode="edit" staff={values} cancelHref={BASE} />
        </main>
    );
}