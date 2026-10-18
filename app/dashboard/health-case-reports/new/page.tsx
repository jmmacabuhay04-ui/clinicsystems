import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import CaseForm from "./case-form";

const BASE = "/dashboard/health-case-reports";

export default async function NewCaseReportPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    const localPart = session.username.split("@")[0];
    const staffName = localPart.charAt(0).toUpperCase() + localPart.slice(1);

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
            </Link>

            <h1 className="text-3xl font-semibold text-gray-900">New Case Report</h1>

            <CaseForm today={today} staffName={staffName} cancelHref={BASE} />
        </main>
    );
}