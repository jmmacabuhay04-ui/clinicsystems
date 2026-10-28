import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { canManageStaff } from "@/lib/permissions";
import StaffForm, { type StaffValues } from "./staff-form";

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
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Clinic Staff
            </Link>

            <div className="flex items-center gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Add Clinic Staff</h1>
                    <p className="text-sm text-gray-600">Add a nurse, physician, dentist, or other clinic personnel.</p>
                </div>
            </div>

            <StaffForm mode="create" staff={empty} cancelHref={BASE} />
        </main>
    );
}