import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageDental } from "@/lib/permissions";
import DentalForm, { type DentalValues } from "../dental-form";

const BASE = "/dashboard/dental-records";

export default async function NewDentalPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageDental(session.role)) redirect(BASE);

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    const localPart = session.username.split("@")[0];
    const dentistName =
        session.role === "dentist"
            ? `Dr. ${localPart.charAt(0).toUpperCase() + localPart.slice(1)}`
            : "";

    const empty: DentalValues = {
        studentNumber: "",
        visitDate: today,
        procedureName: "",
        tooth: "",
        dentistName,
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