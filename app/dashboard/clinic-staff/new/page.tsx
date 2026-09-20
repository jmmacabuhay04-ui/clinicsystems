import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageStaff } from "@/lib/permissions";
import StaffForm, { type StaffValues } from "../staff-form";

const BASE = "/dashboard/clinic-staff";

const empty: StaffValues = {
    fullName: "",
    position: "",
    email: "",
    contact: "",
    licenseNo: "",
    status: "active",
};

export default async function NewStaffPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageStaff(session.role)) redirect("/dashboard");

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Clinic Staff
            </Link>

            <h1 className="text-3xl font-semibold text-gray-900">Add Clinic Staff</h1>

            <StaffForm mode="create" staff={empty} cancelHref={BASE} />
        </main>
    );
}