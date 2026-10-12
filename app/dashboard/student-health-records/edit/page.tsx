import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import EditForm, { type RecordValues } from "./edit-form";

type Row = {
    record_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    visit_date: Date;
    complaint: string;
    action_taken: string | null;
    attending_staff: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    heart_rate: number | null;
    blood_pressure: string | null;
    temperature: number | null;
};

type Props = {
    searchParams: Promise<{ record?: string }>;
};

const text = (value: number | string | null) => (value === null ? "" : String(value));

export default async function EditRecordPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRecords(session.role)) redirect("/dashboard/student-health-records");

    const { record: recordParam = "" } = await searchParams;
    const recordId = Number(recordParam);
    if (!recordId) notFound();

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT r.record_id, s.student_number, s.last_name, s.first_name,
           r.visit_date, r.complaint, r.action_taken, r.attending_staff,
           r.height_cm, r.weight_kg, r.heart_rate, r.blood_pressure, r.temperature
    FROM health_records r
    JOIN students s ON s.student_id = r.student_id
    WHERE r.record_id = ${recordId}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) notFound();

    const values: RecordValues = {
        recordId: row.record_id,
        studentNumber: row.student_number,
        visitDate: new Date(row.visit_date).toISOString().slice(0, 10),
        complaint: row.complaint,
        actionTaken: text(row.action_taken),
        attendingStaff: text(row.attending_staff),
        height: text(row.height_cm),
        weight: text(row.weight_kg),
        heartRate: text(row.heart_rate),
        bloodPressure: text(row.blood_pressure),
        temperature: text(row.temperature),
    };

    const backHref = `/dashboard/student-health-records?student=${encodeURIComponent(row.student_number)}`;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to Student Health Records
            </Link>

            <div>
                <h1 className="text-3xl font-semibold text-[#15664f]">Edit Health Record</h1>
                <p className="mt-1 text-gray-700">
                    {row.last_name}, {row.first_name} · {row.student_number}
                </p>
            </div>

            <EditForm record={values} cancelHref={backHref} />
        </main>
    );
}