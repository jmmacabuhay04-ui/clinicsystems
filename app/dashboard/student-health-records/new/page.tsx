import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import RecordForm from "./record-form";

type Props = {
    searchParams: Promise<{ student?: string }>;
};

export default async function NewHealthRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect("/dashboard/student-health-records");

    const { student = "" } = await searchParams;

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    const localPart = session.username.split("@")[0];
    const staffName = localPart.charAt(0).toUpperCase() + localPart.slice(1);

    const backHref = student
        ? `/dashboard/student-health-records?student=${encodeURIComponent(student)}`
        : "/dashboard/student-health-records";

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Student Health Records
            </Link>

            <h1 className="text-3xl font-semibold text-gray-900">Add Health Record</h1>

            <RecordForm studentNumber={student} today={today} staffName={staffName} cancelHref={backHref} />
        </main>
    );
}