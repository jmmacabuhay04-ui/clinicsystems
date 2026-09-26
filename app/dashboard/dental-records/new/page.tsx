import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageDental } from "@/lib/permissions";
import DentalForm, { type DentalValues } from "../dental-form";
import { prisma } from "@/lib/prisma";
import { examinerName } from "../../dental-health-form/chart-data";

const BASE = "/dashboard/dental-records";

export default async function NewDentalRecordPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageDental(session.role)) redirect(BASE);

    const me = await prisma.$queryRaw<{ full_name: string | null; username: string }[]>`
    SELECT full_name, username FROM users WHERE user_id = ${session.userId} LIMIT 1
  `;
    // Fall back through every source so the field is never blank: the
    // formatted name, then the raw name, then the login name.
    const onDuty =
        examinerName(me[0]?.full_name ?? null, me[0]?.username ?? session.username) ||
        me[0]?.full_name ||
        me[0]?.username ||
        String(session.username ?? "");

    const empty: DentalValues = {
        patientType: "student",
        patientNumber: "",
        visitDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()),
        procedure: "",
        tooth: "",
        dentistName: onDuty,
        status: "completed",
        notes: "",
    };

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dental Records
            </Link>

            <h1 className="text-3xl font-semibold text-gray-900">Add Dental Record</h1>

            <DentalForm mode="create" record={empty} cancelHref={BASE} />
        </main>
    );
}