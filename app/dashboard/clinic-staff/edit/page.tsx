import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStaff } from "@/lib/permissions";
import StaffForm, { type StaffValues } from "../staff-form";

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
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Clinic Staff
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Edit Clinic Staff</h1>
                <p className="mt-1 text-gray-600">{row.full_name}</p>
            </div>

            <StaffForm mode="edit" staff={values} cancelHref={BASE} />
        </main>
    );
}