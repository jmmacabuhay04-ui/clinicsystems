import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import RecordForm, { type RecordValues } from "../../record-form";

const BASE = "/dashboard/employee-health-records";

type Props = {
    searchParams: Promise<{ employee?: string }>;
};

export default async function NewEmployeeRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect(BASE);

    const { employee = "" } = await searchParams;

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    const localPart = session.username.split("@")[0];
    const staffName = localPart.charAt(0).toUpperCase() + localPart.slice(1);

    // No database lookup here. The employee number is either prefilled from
    // the employee's profile or typed in the form, and the server action is
    // what confirms the employee exists before saving.
    const values: RecordValues = {
        employeeNumber: employee,
        employeeName: "",
        visitDate: today,
        complaint: "",
        actionTaken: "",
        attendingStaff: staffName,
        heightCm: "",
        weightKg: "",
        heartRate: "",
        bloodPressure: "",
        temperature: "",
    };

    const backHref = employee
        ? `${BASE}?employee=${encodeURIComponent(employee)}`
        : BASE;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Employee Health Records
            </Link>

            <h1 className="text-3xl font-semibold text-gray-900">Add Visit Record</h1>

            <RecordForm mode="create" record={values} cancelHref={backHref} />
        </main>
    );
}